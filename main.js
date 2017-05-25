const
	fs = require("fs"),
	mkdirp = require('mkdirp'),
	QueueFile = require("./queuefile.js");

const DEF_CONF =  {path : "/tmp/fileq"};
const voidfn = ()=>{};

function getFiles(path,size,callback) {
	callback = callback || voidfn;
	return new Promise((resolve,reject)=>{
		mkdirp(path,err=>{
			if(err) {
				reject(err);
				callback(err);
			}
			else {
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
			}
		});
	});
}

function newFile(path,callback) {
	callback = callback || voidfn;
	return new Promise((resolve,reject)=>{
		var d = Date.now();
		fs.open(path+"/"+d+".fbq", "w+", (err,fd)=>{
			if(err) {
				reject(err);
				callback(err,null);
			}
			else {
				resolve(fd);
				callback(null,fd);
			}
		});
	});
}

class Queue {
	constructor(path) {
		this.path = path || DEF_CONF.path;
		this.files = [];
		this.ready = this.init(this.path);

		this.ready.then(
			files=>this.files=files,
			err=>console.error(err)
		);
	}

	init(path) {
		return getFiles(path);
	}

	push(item, callback) {
		var pr = this.wfile?
			Promise.resolve() :
			newFile(this.path).then(file=>this.wfile=file);

		pr.then(res=>{
			fs.read()
		});
	}

	peek(item, callback, timeout) {

	}
}

module.exports = Queue;
