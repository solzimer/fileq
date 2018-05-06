const
	Queue = require("../lib/queue"),
	program = require("commander");

const IWRITE = 50;
const IREAD = 50;

var queue = null;
var i = 0;

var write = function() {
	var json = {
		message : "This is the entry number "+i+ " of the file. This is a test script to prove the fileq module.",
		entry : i++
	}

	queue.push(json,()=>{
		setTimeout(write,program.write || IWRITE);
	});
}

var read = function() {
	queue.peek((err,json,mem)=>{
		json = err || JSON.stringify(json);
		mem = mem? true : false;
		console.log(`MEM: ${mem}, ENTRY: ${json}`);
		setTimeout(read,program.read || IREAD);
	});
}

program.version('0.0.1')
	.option('-W, --write [ms]', 'Write millisecons interval',"parseInt")
	.option('-R, --read [ms]', 'Read millisecons interval',"parseInt")
	.option('-T, --truncate', 'Truncate queue')
	.parse(process.argv);

queue = new Queue("db");
if(program.write>0) setTimeout(write,program.write || IWRITE);
if(program.read>0) setTimeout(read,program.read || IREAD);
