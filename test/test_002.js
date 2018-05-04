const Catalog = require('../lib/catalog');

async function test1() {
	await Catalog.clear();
	let c = await Catalog.create('file_reader');
	console.log(c);
	await c.save();
	let all = await Catalog.list();
	console.log(all);
	c.write = 100;
	c.read = 10;
	await c.save();
	all = await Catalog.list();
	console.log(all);
}

async function test2() {
	let c = await Catalog.create('file_reader');
	console.log(c);
	c.write = 200;
	c.read = 50;
	await c.save();
	c = await Catalog.create('file_reader')
	console.log(c);
}

async function testAll() {
	try {
		await test1();
		await test2();
	}catch(err) {
		console.error(err);
	}
}

testAll();
