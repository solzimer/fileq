const
	PouchDB = require('pouchdb'),
	Catalog = require('./catalog');

class Item {
	constructor(id,rev,data) {
		this._id = Item.ObjectID(id);
		this._rev = rev;
		this.data = data;
	}

	static ObjectID(id) {
		return `ITEM_${id}`;
	}
}

class Queue {
	constructor(name) {
		this.cat = Catalog.create(name);
		this.db = new PouchDB(`.fileq_queue_${name}`);
	}

	async push(data,callback) {
		try {
			let db = this.db;
			let cat = await this.cat;
			let item = new Item(cat.write++,null,data);
			await Promise.all([
				db.put(item),
				cat.save()
			]);
			if(callback) callback();
		}catch(err) {
			if(callback) callback(err);
			else throw err;
		}
	}

	async peek(callback) {
		try {
			let db = this.db;
			let cat = await this.cat;
			let item = await db.get(Item.ObjectID(cat.read));
			cat.read++;
			await Promise.all([
				db.remove(item),
				cat.save()
			]);
			if(callback) callback(null,item.data);
			else return item.data;
		}catch(err) {
			if(callback) callback(err);
			else throw err;
		}
	}
}

module.exports = Queue;
