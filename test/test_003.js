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

	await queue.lock();
	setTimeout(()=>{
		queue.unlock();
	},5000);

	for(let i=0;i<10;i++) {
		console.log("LOCKED",queue.locked);
		await queue.lock();
		let item = await queue.poll();
		console.log(item);
		queue.unlock();
	}

	queue.peek((err,item,done)=>{
		console.log("LOCK reads for 5 secs");
		setTimeout(done,5000);
	},0,true);

	let item = await queue.poll();
	console.log("ITEM Unlocked",item);
}

async function testCallback(queue) {
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

	queue.lock(()=>{
		setTimeout(()=>{
			queue.unlock();
		},5000);
	});

	for(let i=0;i<10;i++) {
		queue.lock(()=>{
			queue.poll((err,item)=>{
				console.log(item);
				queue.unlock();
			});
		});
	}
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
