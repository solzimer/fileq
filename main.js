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
			fs.open(path+"/"+d+".fbq", "w+", (err,fd)=>{
				if(err) {reject(err);	callback(err,null);}
				else {resolve(fd);callback(null,fd);}
			});
		});
	}
}


class Queue {
	constructor(path) {
		this.path = path || DEF_CONF.path;
		this.files = [];
		this.writer = null;
		this.reader = null;

		this.ready = FileManager.
			initPath(this.path).
			then(()=>FileManager.newFile(this.path)).
			then(fd=>this.writer=new QueueFile(fd,100,100)).
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
				FileManager.newFile(this.path).
				then(fd=>this.writer=new QueueFile(fd,100,100)).
				then(()=>FileManager.listFiles(this.path)).
				then(files=>this.files=files).
				then(()=>this.push(item,callback));
			}
		});
	}

	peek(item, callback, timeout) {

	}
}

module.exports = {
	from : function(path) {
		map[path] = map[path] || new Queue(path);
		return map[path];
	}
};
