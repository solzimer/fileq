const	fs = require("fs");
const MAX = 65535;
const voidfn = ()=>{};

const HLEN = 6;	// max:uint16, wcurr:uint16
const BPAD = 1;	// Next byte number

class QueueFile {
	constructor(fd,max,bsize) {
		this.fd = fd;			// File Descriptor
		this.max = max;		// Max allowed blocks
		this.count = 0;
		this.bsize = bsize	// Block size
		this.wpos = HLEN+1;	// Current write position
		this.rpos = HLEN+1;	// Current read position

		console.log(this);
	}

	_bwrite(buffers,callback) {
		// Get block and write
		var buff = buffers.shift();
		if(buff!=undefined) {
			fs.write(this.fd,buff,0,buff.length,this.wpos,err=>{
				if(err) callback(err);
				else {
					// Write next block
					this.wpos += this.bsize + 1;
					this._bwrite(buffers,callback);
				}
			});
		}
		else {
			this.count++;
			callback();
		}
	}

	_bread(buffer,callback) {
		// Read block
		fs.read(this.fd,buffer,0,buffer.length,this.rpos,err=>{
			if(err) callback(err);
			else {
				this.rpos += buffer.length;
				// Get content and "next" flag
				var str = buffer.toString("utf8",0,buffer.length-1);
				var next = buffer.readUInt8(buffer.length-1);
				// If next, append content with the rest of the read
				if(next) {
					this._bread(buffer,(err,res)=>{
						if(!err) callback(null,str+res);
						else callback(err);
					});
				}
				// Return the content
				else {
					callback(null,str);
				}
			}
		});
	}

	close(callback) {
		fs.close(this.fd,callback);
	}

	read(callback) {
		callback = callback || voidfn;

		var str = "", next = false;
		var buffer = Buffer.alloc(this.bsize+BPAD);

		return new Promise((resolve,reject)=>{
			this._bread(buffer,(err,res)=>{
				if(res) res = res.trim();
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
			var blocks = Math.ceil(len/this.bsize);

			// Split data into blocks
			var buffers = [];
			for(var i=0;i<blocks;i++) {
				var buff = Buffer.alloc(this.bsize+BPAD);
				buff.write(str.substring(i*this.bsize,(i+1)*this.bsize))
				buff.writeUInt8(i<blocks-1?1:0,buff.length-1);
				buffers.push(buff);
			}

			this._bwrite(buffers,(err,res)=>{
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
			var fd = fs.open(path, "w+", (err,fd)=>{
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
						var q = new QueueFile(fd,max,bsize);
						callback(null,q);
						resolve(q);
					}
				});
			});
		});
	}

	static open(path,callback)  {
		callback = callback || voidfn;
		var fd = fs.open(path, "r", (err,fd)=>{
			var buffer = Buffer.alloc(HLEN);
			fs.read(fd,buffer,0,HLEN,0,err=>{
				var max = buffer.readUInt16BE(0);
				var bsize = buffer.readUInt16BE(2);
				callback(err,new QueueFile(fd,max,bsize));
			});
		});
	}
}

module.exports = QueueFile;
