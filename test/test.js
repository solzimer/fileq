const Queue = require("../main.js");

const IWRITE = 1000;
const IREAD = 10;

var queue = Queue.from("./db",{max:10,bsize:100});
var i = 0;

var write = function() {
	var json = {
		message : "This is the entry number "+i+ " of the file",
		entry : i++
	}

	queue.push(json,()=>{
		setTimeout(write,IWRITE);
	});
}

var read = function() {
	queue.peek((err,json)=>{
		console.log("READ => ",err||json);
		setTimeout(read,IREAD);
	});
}

setTimeout(write,IWRITE);
setTimeout(read,IREAD);
