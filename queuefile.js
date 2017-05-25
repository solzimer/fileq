const	fs = require("fs");
const MAX = 65535;
const voidfn = ()=>{};

const HLEN = 6;	// max:uint16, wcurr:uint16
const BPAD = 1;	// Next byte number

class QueueFile {
	constructor(fd,max,bsize) {
		this.fd = fd;			// File Descriptor
		this.max = max;		// Max allowed blocks
		this.bsize = bsize	// Block size
		this.wpos = HLEN+1;	// Current write position
		this.rpos = HLEN+1;	// Current read position

		console.log(this);
	}

	close(callback) {
		fs.close(this.fd,callback);
	}

	read(callback) {
		callback = callback || voidfn;

		var str = "", next = false;
		var buff = Buffer.alloc(this.bsize+BPAD);
		do {
			fs.readSync(this.fd,buff,0,buff.length,this.rpos);
			this.rpos += buff.length;
			str += buff.toString("utf8",0,buff.length-1);
			next = buff.readUInt8(buff.length-1);
		}while(next);

		console.log("READ => ",str);

		process.nextTick(()=>{
			callback(null,str);
		})
	}

	write(json,callback) {
		callback = callback || voidfn;
		var str = JSON.stringify(json);
		var len = str.length;
		var blocks = Math.ceil(len/this.bsize);

		var buffers = [];
		for(var i=0;i<blocks;i++) {
			var buff = Buffer.alloc(this.bsize+BPAD);
			buff.write(str.substring(i*this.bsize,(i+1)*this.bsize))
			buff.writeUInt8(i<blocks-1?1:0,buff.length-1);
			buffers.push(buff);
		}

		buffers.forEach(buff=>{
			fs.writeSync(this.fd,buff,0,buff.length,this.wpos);
			this.wpos += this.bsize + 1;
		});

		/*
		var jbuff = Buffer.from(JSON.stringify(json));
		var nbuff = Buffer.alloc(PLEN); // 4 pos, 2 size

		var fd = this.fd;
		var curr = this.curr;
		var cpos = this.cpos;
		var csize = jbuff.length
		var hpos = HLEN+PLEN*curr;

		nbuff.writeUInt32BE(cpos,0);
		nbuff.writeUInt16BE(csize,4);

		fs.write(fd,nbuff,0,nbuff.length,hpos+1,err=>{
			fs.write(fd,jbuff,0,jbuff.length,cpos+1,err=>{
				this.cpos += jbuff.length;
				this.curr++;
				callback();
			});
		});
		*/

		process.nextTick(()=>{
			callback();
		});
	}

	static create(path,max,bsize,callback) {
		callback = callback || voidfn;
		var fd = fs.open(path, "w+", (err,fd)=>{
			max = Math.min(MAX,Math.max(0,max));
			var buffer = Buffer.alloc(HLEN); // 2 int16 + max * (int32+int16)
			buffer.writeUInt16BE(max,0);
			buffer.writeUInt16BE(bsize,2);
			fs.write(fd,buffer,0,HLEN,0,err=>{
				callback(err,new QueueFile(fd,max,bsize));
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
