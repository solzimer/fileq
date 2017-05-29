const	fs = require("fs");
const MAX = 65535;
const voidfn = ()=>{};

const HLEN = 6;	// max:uint16, wcurr:uint16
const BPAD = 1;	// Next byte number

class QueueFile {
	constructor(path,fd,max,bsize) {
		this.path = path;
		this.fd = fd;			// File Descriptor
		this.max = max;		// Max allowed blocks
		this.wcount = 0;
		this.rcount = 0;
		this.bsize = bsize	// Block size
		this.wpos = HLEN+1;	// Current write position
		this.rpos = HLEN+1;	// Current read position

		//console.log(this);
	}

	_bwrite(buffers,callback) {
		// Get block and write
		var buff = buffers.shift();
		if(buff!=undefined) {
			fs.write(this.fd,buff,0,buff.length,this.wpos,err=>{
				if(err) callback(err);
				else {
					// Write next block
					this.wpos += buff.length;
					this._bwrite(buffers,callback);
				}
			});
		}
		else {
			this.wcount++;
			callback();
		}
	}

	_bread(callback) {
		var buffer = Buffer.allocUnsafe(this.bsize+1);

		// Read block
		fs.read(this.fd,buffer,0,buffer.length,this.rpos,(err,bytes)=>{
			if(!bytes) callback(QueueFile.NO_DATA);
			else if(err) callback(err);
			else {
				this.rpos += buffer.length;
				// Get content and "next" flag
				var sidx = buffer.indexOf(0);
				if(sidx<0) sidx = buffer.indexOf(1);
				var next = buffer.readUInt8(buffer.length-1);
				var nbuff = Buffer.concat([buffer],sidx);
				// If next, append content with the rest of the read
				if(next) {
					this._bread((err,res)=>{
						if(!err)
							callback(null,Buffer.concat([nbuff,res],nbuff.length+res.length));
						else
							callback(err);
					});
				}
				// Return the content
				else {
					callback(null,nbuff);
				}
			}
		});
	}

	close(del,callback) {
		if(typeof(del)=="boolean") {
			fs.close(this.fd,()=>{
				fs.unlink(this.path,callback);
			});
		}
		else {
			fs.close(this.fd,del);
		}
	}

	skip(n,i) {
		this.rpos += n*(this.bsize+BPAD);
		this.rcount += i||1;
	}

	test(json) {
		var str = JSON.stringify(json);
		var len = str.length;
		return Math.ceil(len/this.bsize);
	}

	read(callback) {
		callback = callback || voidfn;

		var str = "", next = false;

		return new Promise((resolve,reject)=>{
			this._bread((err,res)=>{
				this.rcount += err? 0 : 1;
				if(res) res = JSON.parse(res.toString().trim());
				if(!err) resolve(res);
				else reject(err);
				callback(err,res);
			});
		});
	}

	write(json,callback) {
		callback = callback || voidfn;

		return new Promise((resolve,reject)=>{
			var str = JSON.stringify(json);
			var len = str.length;
			var b = Buffer.from(str);
			var blocks = Math.ceil(b.length/this.bsize);
			var buffer = Buffer.allocUnsafe(blocks*(this.bsize+1)).fill(0);

			// Split data into blocks
			for(var i=0;i<blocks;i++) {
				b.copy(buffer,i*(this.bsize+1),i*this.bsize,(i+1)*this.bsize);
				buffer.writeUInt8(i<blocks-1?1:0,(i+1)*this.bsize);
			}

			this._bwrite([buffer],(err,res)=>{
				if(err) reject(err);
				else resolve(res);
				callback(err,res);
			});
		});
	}

	static create(path,max,bsize,callback) {
		callback = callback || voidfn;
		max = max || 100;
		bsize = bsize || 100;
		max = Math.min(MAX,Math.max(0,max));

		return new Promise((resolve,reject)=>{
			// Create/Truncate file
			fs.open(path, "w+", (err,fd)=>{
				// Pre-allocate all data, so we are sure we can
				// write at least on this file
				var buffer = Buffer.alloc(HLEN+max*bsize);
				buffer.writeUInt16BE(max,0);
				buffer.writeUInt16BE(bsize,2);
				fs.write(fd,buffer,0,HLEN,0,err=>{
					if(err) {
						callback(err);
						reject(err);
					}
					else {
						var q = new QueueFile(path,fd,max,bsize);
						callback(null,q);
						resolve(q);
					}
				});
			});
		});
	}

	static open(path,callback)  {
		callback = callback || voidfn;
		return new Promise((resolve,reject)=>{
			fs.open(path, "r", (err,fd)=>{
				if(err) {
					callback(err);
					reject(err);
				}
				else {
					var buffer = Buffer.alloc(HLEN);
					fs.read(fd,buffer,0,HLEN,0,err=>{
						if(err) {
							callback(err);
							reject(err);
						}
						else {
							var max = buffer.readUInt16BE(0);
							var bsize = buffer.readUInt16BE(2);
							var q = new QueueFile(path,fd,max,bsize);
							callback(null,q);
							resolve(q);
						}
					});
				}
			});
		});
	}
}

QueueFile.NO_DATA = "NO_DATA";

module.exports = QueueFile;
