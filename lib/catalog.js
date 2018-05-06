const
	Semaphore = require('./semaphore'),
	levelup = require('levelup'),
	leveldown = require('leveldown');

var db = levelup(leveldown('./.fileq_catalog'))

class Catalog {
	constructor(id,opts) {
		opts = opts || {};

		if(typeof(opts)=="string") {
			opts = opts.split(":");
			opts = {
				write : parseInt(opts[0]),
				read : parseInt(opts[1]),
			};
		}

		this.id = id || `${Math.random()}`;
		this.read = opts.read || 0;
		this.write = opts.write || 0;
		this.mutex = new Semaphore(this.write-this.read);
	}

	get value() {
		return `${this.write}:${this.read}`;
	}

	static async create(id) {
		try {
			let c = await db.get(id,{asBuffer:false});
			await down(this.mutex);
			return new Catalog(c);
		}catch(err) {
			let c = new Catalog(id);
			return await c.save();
		}
	}

	static async list() {
		let list = await db.allDocs({include_docs:true});
		return list.rows.map(row=>new Catalog(row.doc));
	}

	static async clear() {
	}

	async take(time) {
		await this.mutex.take(time);
	}

	async save() {
		try {
			let res = await db.put(this.id,this.value);
			this.mutex.capacity(this.write-this.read);
			return this;
		}catch(err) {
			throw err;
		}
	}

	async remove() {
		await db.del(this.id);
		return this;
	}
}

module.exports = Catalog;
