const Catalog = require('./lib/catalog');

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

test();
