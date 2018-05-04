const PouchDB = require('pouchdb');

var db = new PouchDB('.fileq/catalog');

class Catalog {
	constructor(opts) {
		opts = opts || {};

		this.name = opts.name || `${Math.random()}`;
		this._id = this.name;
		this._rev = opts._rev || null;
		this.read = opts.read || 0;
		this.write = opts.write || 0;
	}

	toJSON() {
		return {
			_id : this._id,
			_rev : this._rev,
			name : this.name,
			read : this.read,
			write : this.write
		}
	}

	static async create(name) {
		let c = new Catalog({name});
		return await c.save();
	}

	static async list() {
		let list = await db.allDocs({include_docs:true});
		return list.rows.map(row=>new Catalog(row.doc));
	}

	static async clear() {
		await db.destroy();
		db = new PouchDB('.fileq/catalog');
	}

	async save() {
		let res = await db.put(this.toJSON());
		this._rev = res.rev;
		return this;
	}

	async remove() {
		await db.remove(this._id);
		return this;
	}
}

module.exports = Catalog;
