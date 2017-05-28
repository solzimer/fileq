const
	fs = require("fs"),
	mkdirp = require('mkdirp');

const voidfn = ()=>{};

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

module.exports = FileManager;
