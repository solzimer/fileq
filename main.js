const
	fs = require("fs"),
	mkdirp = require('mkdirp'),
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
					res.sort((a,b)=>a-b);
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


class Queue {
	constructor(path,options) {
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

	push(item, callback) {
		this.ready.then(()=>{
			var queue = this.writer;
			if(queue.count<queue.max) {
				queue.write(item,callback);
			}
			else {
				queue.close(()=>{
					FileManager.newFile(this.path).
					then(fname=>QueueFile.create(fname,this.max,this.bsize)).
					then(queue=>this.writer=queue).
					then(()=>FileManager.listFiles(this.path)).
					then(files=>this.files=files).
					then(()=>this.push(item,callback));
				});
			}
		});
	}

	peek(item, callback, timeout) {

	}
}

module.exports = {
	from : function(path,options) {
		map[path] = map[path] || new Queue(path,options);
		return map[path];
	}
};
