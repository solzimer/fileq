const
	Catalog = require('./catalog'),
	levelup = require('levelup'),
	leveldown = require('leveldown');

class Queue {
	constructor(name) {
		this.cat = Catalog.create(name);
		this.db = levelup(leveldown(`./.fileq_queue_${name}`));
	}

	async push(data,callback) {
		try {
			let db = this.db;
			let cat = await this.cat;
			let id = cat.write++;
			await Promise.all([
				db.put(id,JSON.stringify(data)),
				cat.save()
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
			let cat = await this.cat;
			await cat.take(time)
			let item = await db.get(cat.read,{asBuffer:false});
			let id = cat.read++;
			await Promise.all([
				db.del(id),
				cat.save()
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
