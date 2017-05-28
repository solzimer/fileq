const Queue = require("../main.js");

const IWRITE = 100;
const IREAD = 100;

var queue = Queue.from("./db",{max:10,bsize:100});
var i = 0;

var rnd = function(n) {return Math.floor(Math.random()*n+1)}

var write = function() {
	var json = {
		message : "This is the entry number "+i+ " of the file",
		entry : i++
	}

	queue.push(json,()=>{
		setTimeout(write,rnd(IWRITE));
	});
}

var read = function() {
	queue.peek((err,json)=>{
		console.log("READ => ",err||json);
		setTimeout(read,rnd(IREAD));
	});
}

setTimeout(write,rnd(IWRITE));
setTimeout(read,rnd(IREAD));
