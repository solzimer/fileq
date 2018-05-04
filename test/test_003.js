const
	Queue = require('../lib/queue'),
	Catalog = require('../lib/catalog');

async function test1() {
	Catalog.clear();
	let queue = new Queue('file_reader');

	for(let i=0;i<1000;i++) {
		await queue.push(`This is the line ${i}`);
	}

	while(true) {
		let line = await queue.peek();
		console.log(line);
	}
}

async function testAll() {
	try {
		await test1();
	}catch(err) {
		console.error(err);
	}
}

testAll();
