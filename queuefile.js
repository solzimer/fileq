const	fs = require("fs");
const MAX = 65535;
const voidfn = ()=>{};

const HLEN = 4;	// max:uint16, curr:uint16
const PLEN = 6	// pos:uint32, size:uint16

class QueueFile {
	constructor(fd,max,curr) {
		this.fd = fd;			// File Descriptor
		this.max = max;		// Max allowed entries
		this.curr = curr;	// Current entry
		this.csize = 0;		// Current entry size
		this.cpos = HLEN+PLEN*max+1;	// Current entry position

		console.log(this);
	}

	close(callback) {
		fs.close(this.fd,callback);
	}

	read(idx,callback) {
		callback = callback || voidfn;
		var fd = this.fd;
		var buff = Buffer.alloc(PLEN); // 4 pos, 2 size
		fs.read(fd,buff,0,PLEN,HLEN+idx*PLEN+1,err=>{
			var fidx = buff.readUInt32BE(0);
			var size = buff.readUInt16BE(4);
			var obuff = Buffer.alloc(size);
			fs.read(fd,obuff,0,size,fidx,err=>{
				var json = obuff.toString();
				callback(null,json);
			});
		});
	}

	write(json,callback) {
		callback = callback || voidfn;
		var fd = this.fd;
		var curr = this.curr;
		var nidx = this.cpos+this.csize;
		var jbuff = Buffer.from(JSON.stringify(json));

		var nbuff = Buffer.alloc(PLEN); // 4 pos, 2 size
		nbuff.writeUInt32BE(nidx,0);
		nbuff.writeUInt16BE(jbuff.length,4);

		fs.write(fd,jbuff,0,jbuff.length,this.cpos,err=>{
			this.cpos += jbuff.length+1;
			fs.write(fd,nbuff,0,nbuff.length,HLEN+PLEN*curr+1,err=>{
				this.curr++;
				this.csize = jbuff.length;
				callback();
			});
		});
	}

	static create(path,max,callback) {
		callback = callback || voidfn;
		var fd = fs.open(path, "w+", (err,fd)=>{
			max = Math.min(MAX,Math.max(0,max));
			var buffer = Buffer.alloc(HLEN+max*PLEN); // 2 int16 + max * (int32+int16)
			buffer.writeUInt16BE(max,0);
			fs.write(fd,buffer,0,HLEN+max*PLEN,0,err=>{
				callback(err,new QueueFile(fd,max,0));
			});
		});
	}

	static open(path,callback)  {
		callback = callback || voidfn;
		var fd = fs.open(path, "r", (err,fd)=>{
			var buffer = Buffer.alloc(HLEN);
			fs.read(fd,buffer,0,HLEN,0,err=>{
				var max = buffer.readUInt16BE(0);
				var curr = buffer.readUInt16BE(2);
				callback(err,new QueueFile(fd,max,curr));
			});
		});
	}
}

module.exports = QueueFile;
