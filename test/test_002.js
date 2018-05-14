const
	FileQueue = require("../"),
	program = require("commander");

async function testPromise(queue) {
	function newEntry(i) {
		return json = {
			message : "This is the entry number "+i+ " of the file. This is a test script to prove the fileq module.",
			entry : i
		}
	}

	// Push 100 items
	for(let i=0;i<100;i++) {
		let entry = newEntry(i);
		await queue.push(entry);
	}

	// Take the head 10 times
	for(let i=0;i<10;i++) {
		let entry = await queue.head();
		console.log("HEAD",entry);
	}

	// Takes and remove head 10 times
	for(let i=0;i<10;i++) {
		let entry = await queue.poll();
		console.log("POLL",entry);
	}

	// Take the head 10 times
	for(let i=0;i<10;i++) {
		let entry = await queue.head();
		console.log("HEAD",entry);
	}
}

async function testCallback(queue) {
	function newEntry(i) {
		return json = {
			message : "This is the entry number "+i+ " of the file. This is a test script to prove the fileq module.",
			entry : i
		}
	}

	// Inserts 100 items
	let qall = [];
	for(let i=0;i<100;i++) {
		let entry = newEntry(i);
		qall.push(new Promise((ok,rej)=>queue.push(entry,ok)));
	}
	await Promise.all(qall);

	// Takes the head 10 times
	qall = [];
	for(let i=0;i<10;i++) {
		qall.push(new Promise((ok,rej)=>{
			queue.head((err,entry)=>{
				console.log("HEAD",entry);
				ok();
			});
		}));
	}
	await Promise.all(qall);

	// Takes and remove head 10 times
	qall = [];
	for(let i=0;i<10;i++) {
		qall.push(new Promise((ok,rej)=>{
			queue.poll((err,entry)=>{
				console.log("POLL",entry);
				ok();
			});
		}));
	}
	await Promise.all(qall);

	// Takes the head 10 times
	qall = [];
	for(let i=0;i<10;i++) {
		qall.push(new Promise((ok,rej)=>{
			queue.head((err,entry)=>{
				console.log("HEAD",entry);
				ok();
			});
		}));
	}
	await Promise.all(qall);

	// Takes and removes (with random commit) the head 10 times
	let i=0;
	var fn = function(){
		if(i++>10) return;
		setImmediate(()=>{
			queue.peek((err,entry,done)=>{
				let commit = Math.random()>0.5;
				console.log("PEEK",commit,entry);
				done(!commit);
				fn();
			},0,true);
		})
	}
	fn();
}

program.version('0.0.1')
	.option('-W, --write [ms]', 'Write millisecons interval',parseInt)
	.option('-R, --read [ms]', 'Read millisecons interval',parseInt)
	.option('-T, --truncate', 'Truncate queue')
	.parse(process.argv);

async function test() {
	let queue = FileQueue.from("test",{truncate:program.truncate});
	await testPromise(queue);
	await testCallback(queue);
}

test();
