const
	Semaphore = require('./semaphore'),
	os = require('os'),
	levelup = require('levelup'),
	leveldown = require('leveldown');

async function init(db) {
	try {
		let rw = await Promise.all([
			db.get("$read",{asBuffer:false}).then(parseInt),
			db.get("$write",{asBuffer:false}).then(parseInt)
		]);
		return {read : rw[0], write : rw[1], mutex : new Semaphore(rw[1]-rw[0])}
	}catch(err) {
		let rw = {read : 0, write : 0, mutex : new Semaphore(0)};
		await Promise.all([
			db.put("$read",`${rw.read}`),
			db.put("$write",`${rw.write}`)
		]);
		return rw;
	}
}

async function save(db,rw) {
	await Promise.all([
		db.put("$read",`${rw.read}`),
		db.put("$write",`${rw.write}`)
	]);
	rw.mutex.capacity(rw.write-rw.read);
}

class Queue {
	constructor(name,path) {
		path = path || os.tmpdir();
		this.db = levelup(leveldown(`${path}/data_${name}`));
		this.wm = init(this.db);
		this.mutex = new Semaphore(this.write-this.read);
	}

	async push(data,callback) {
		try {
			let db = this.db;
			let rw = await this.wm;
			let id = rw.write++;
			await Promise.all([
				db.put(id,JSON.stringify(data)),
				save(db,rw)
			]);
			if(callback) callback();
		}catch(err) {
			if(callback) callback(err);
			else throw err;
		}
	}

	async peek(callback,time) {
		if(typeof(callback)=="number") {
			time = callback;
			callback = null;
		}

		try {
			let db = this.db;
			let rw = await this.wm;
			let id = rw.read;
			await rw.mutex.take(time);
			let item = await db.get(id,{asBuffer:false});
			rw.read++;
			await Promise.all([
				db.del(id),
				save(db,rw)
			]);
			if(callback) callback(null,JSON.parse(item));
			else return JSON.parse(item);
		}catch(err) {
			if(callback) callback(err);
			else throw err;
		}
	}
}

module.exports = Queue;
