const Queue = require("../main.js");

var queue = Queue.from("./db");
var i = 0;

var fn = function() {
	queue.push({a:i++},()=>{
		console.log(`Writen ${i}`);
		if(i<1000) setImmediate(fn);
	});
}

fn();
