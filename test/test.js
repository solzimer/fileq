const Queue = require("../main.js");

const IWRITE = 50;
const IREAD = 50;

Queue.configure({max : 1000,bsize : 300});
var queue = Queue.from();
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
