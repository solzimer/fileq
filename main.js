const
	fs = require("fs"),
	mkdirp = require('mkdirp'),
	EventEmitter = require('events'),
	QueueFile = require("./queuefile.js");

const voidfn = ()=>{};
const DEF_CONF =  {
	path : "/tmp/fileq",
	max : 100,
	bsize : 100
};

var map = {};

class FileManager {
	static initPath(path,size,callback) {
		callback = callback || voidfn;
		return new Promise((resolve,reject)=>{
			mkdirp(path,err=>{
				if(err) {
					reject(err);
					callback(err);
				}
				else {
					resolve();
					callback();
				}
			});
		});
	}

	static listFiles(path, callback) {
		callback = callback || voidfn;
		return new Promise((resolve,reject)=>{
			fs.readdir(path, (err,res)=>{
				if(err) {
					reject(err);
					callback(err);
				}
				else {
					res.sort((a,b)=>a<b?1:-1);
					resolve(res);
					callback(null,res);
				}
			});
		});
	}

	static newFile(path, callback) {
		callback = callback || voidfn;
		return new Promise((resolve,reject)=>{
			var d = Date.now();
			resolve(path+"/"+d+".fbq");
		});
	}
}


class Queue extends EventEmitter {
	constructor(path,options) {
		super();

		options = options || {};
		this.path = path || DEF_CONF.path;
		this.files = [];
		this.writer = null;
		this.reader = null;
		this.max = options.max || 100;
		this.bsize = options.bsize || 100;

		this.ready = FileManager.
			initPath(this.path).
			then(()=>FileManager.newFile(this.path)).
			then(fname=>QueueFile.create(fname,this.max,this.bsize)).
			then(queue=>this.writer=queue).
			then(()=>FileManager.listFiles(this.path)).
			then(files=>this.files=files);
	}

	push(item, callback, newfile) {
		this.ready.then(()=>{
			var queue = this.writer;
			if(queue.wcount<queue.max) {
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
					then(()=>this.push(item,callback,true));
				});
			}
		});
	}

	peek(callback, timeout) {
		var retry = ()=>this.peek(callback,timeout);

		// Wait for ready
		this.ready.then(()=>{
			var queue = this.reader; 									// Get QueueFile reader

			// If we have a reference
			if(queue) {
				queue.read().then(
					data=>callback(null,data),
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
						else callback(err,data);
					}
				);
			}

			// We don't have a reference, open next file
			else {
				if(this.files.length) {
					QueueFile.open(this.path+"/"+this.files.pop()).
					then(q=>this.reader=q).
					then(retry);
				}
				else {
					this.once("data",retry);
				}
			}
		});
	}
}

module.exports = {
	from : function(path,options) {
		map[path] = map[path] || new Queue(path,options);
		return map[path];
	}
};
