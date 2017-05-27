const Queue = require("../main.js");

var queue = Queue.from("./db",1000,100);
var i = 0;

var fn = function() {
	var json = {
		message : "This is the entry number "+i+ " of the file",
		entry : i++
	}

	queue.push(json,()=>{
		//console.log(`Writen ${i}`);
		if(i<10000) setImmediate(fn);
	});
}

fn();
