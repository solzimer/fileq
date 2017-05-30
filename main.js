const
	fs = require("fs"),
	os = require("os"),
	EventEmitter = require('events'),
	semaphore = require('semaphore'),
	FileManager = require("./filemanager.js"),
	QueueFile = require("./queuefile.js");

const voidfn = ()=>{};
const DEF_CONF =  {
	path : os.tmpdir()+"/fileq",
	max : 100,
	bsize : 100,
	csize : 100
};

var map = {};
var cache = {
	"*" : {map : {}, list : []}
};

class Queue extends EventEmitter {
	constructor(path,options) {
		super();

		options = options || {};
		this.uid = "queue_"+Math.random();
		this.path = path || options.path || DEF_CONF.path+"/"+this.uid;
		this.files = [];
		this.writer = null;
		this.reader = null;
		this.max = options.max || DEF_CONF.max;
		this.bsize = options.bsize || DEF_CONF.bsize;
		this.wsem = semaphore(1);
		this.rsem = semaphore(1);

		cache[this.uid] = {map:{},list:[]};

		this.ready = FileManager.
			initPath(this.path).
			then(()=>FileManager.newFile(this.path)).
			then(fname=>QueueFile.create(fname,this.max,this.bsize)).
			then(queue=>this.writer=queue).
			then(()=>FileManager.listFiles(this.path)).
			then(files=>this.files=files);
	}

	push(item, callback) {
		callback = callback || voidfn;

		this.wsem.take(()=>{
			this._push(item,(err,res)=>{
				callback(err,res);
				this.wsem.leave();
			});
		});
	}

	peek(callback, timeout) {
		callback = callback || voidfn;

		this.rsem.take(()=>{
			this._peek((err,res,mem)=>{
				callback(err,res,mem);
				this.rsem.leave();
			},timeout);
		});
	}

	_cache(item) {
		var c = cache[this.uid], map = c.map, list = c.list;
		var qf = item? this.writer : this.reader;

		if(item) {
			var k = qf.path+"_"+(qf.wcount+1);
			var data = {key:k,item:item,blocks:qf.test(item)}
			map[k] = data
			list.push(data);
			if(list.length>=DEF_CONF.csize) {
				var ritem = list.shift();
				delete map[ritem.key];
			}
		}
		else {
			var k = qf.path+"_"+(qf.rcount+1);
			if(map[k]) {
				var data = map[k];
				qf.skip(data.blocks);
				return data;
			}
			else {
				return {err:"NO_CACHE"}
			}
		}
	}

	_push(item, callback, newfile) {
		this.ready.then(()=>{
			var queue = this.writer;
			if(queue.wcount<queue.max) {
				this._cache(item);
				queue.write(item,err=>{
					this.emit("data",newfile);
					callback(err);
				});
			}
			else {
				queue.close(()=>{
					FileManager.newFile(this.path).
					then(fname=>QueueFile.create(fname,this.max,this.bsize)).
					then(queue=>this.writer=queue).
					then(()=>FileManager.listFiles(this.path)).
					then(files=>this.files=files).
					then(()=>this._push(item,callback,true));
				});
			}
		});
	}

	_peek(callback, timeout) {
		var retry = ()=>this._peek(callback,timeout);

		// Wait for ready
		this.ready.then(()=>{
			var queue = this.reader; 									// Get QueueFile reader

			// If we have a reference
			if(queue) {
				var cdata = this._cache();

				if(!cdata.err) {
					callback(null,cdata.item,true);
					return;
				}

				queue.read().then(
					data=>callback(null,data,false),
					err=>{
						if(err==QueueFile.NO_DATA) {				// Read returns no data
							if(this.files.length) {						// Exist other files, that
								this.reader = null;							// means this file is completed
								queue.close(true,retry)
							}
							else {
								this.once("data",newfile=>{			// Wait for new data
									if(newfile) {									// Data is on a new file
										this.reader = null;
										queue.close(true,retry)
									}
									else {												// Data is on the same file
										retry();
									}
								});
							}
						}
						else callback(err,data,false);
					}
				);
			}

			// We don't have a reference, open next file
			else {
				if(this.files.length) {
					QueueFile.open(this.path+"/"+this.files.pop()).
					then(q=>{this.reader=q;retry()},retry);
				}
				else {
					this.once("data",retry);
				}
			}
		});
	}
}

module.exports = {
	from(path,options) {
		if(!path) {
			var queue = new Queue(null,options);
			map[queue.path] = queue;
			return queue;
		}
		else {
			map[path] = map[path] || new Queue(path,options);
			return map[path];
		}
	},
	configure(options) {
		options = options || {};

		for(var i in options)
			DEF_CONF[i] = options[i];
	}
};
