const
	Semaphore = require('./semaphore'),
	os = require('os'),
	fs = require('fs-extra'),
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

function remove(db,rw,id) {
	rw.read++;
	return Promise.all([db.del(id), save(db,rw)]);
}

async function awaitCommit(item,callback) {
	try {
		await new Promise((ok,rej)=>{
			if(callback) callback(null,item,(err)=>{
				if(err) rej(err);
				else ok()
			});
		});
		return true;
	}catch(err) {
		return false;
	}
}

class Queue {
	constructor(name,options) {
		let path = options.path || os.tmpdir();
		let truncate = options.truncate;

		this.mutex = new Semaphore(1);
		this.wm = fs.
			mkdirp(path).
			then(()=>{
				if(truncate) return fs.remove(`${path}/${name}`);
			}).
			then(()=>this.db=levelup(leveldown(`${path}/${name}`))).
			then(()=>init(this.db));
	}

	get locked() {
		return this.mutex.available <= 0;
	}

	async lock(callback) {
		await this.mutex.take();
		if(callback) callback();
	}

	unlock() {
		this.mutex.leave();
	}

	async push(data,callback) {
		try {
			let rw = await this.wm;
			let db = this.db;
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

	async poll(callback,time) {
		return this.peek(callback,time,false);
	}

	async head(callback,time) {
		if(typeof(callback)=="number") {
			time = callback;
			callback = null;
		}

		try {
			let item = await new Promise((ok,rej)=>{
				this.peek((err,item,done)=>{
					if(err) rej(err);
					else ok(item);
					done(true);
				},time,true);
			});
			if(callback) callback(null,item);
			else return item;
		}catch(err) {
			if(callback) callback(err,null);
			else throw err;
		}
	}

	async peek(callback,time,commit) {
		if(typeof(callback)=="number") {
			time = callback;
			callback = null;
		}

		try {
			let rw = await this.wm;
			let db = this.db;
			let id = rw.read;
			await rw.mutex.take(time);
			let item = await db.get(id,{asBuffer:false});
			item = JSON.parse(item);

			if(commit && callback) {
				let docommit = await awaitCommit(item,callback);
				if(docommit) await remove(db,rw,id);
			}
			else {
				await remove(db,rw,id);
				if(callback) callback(null,item);
				else return item;
			}
		}catch(err) {
			if(callback) callback(err);
			else throw err;
		}
	}
}

module.exports = Queue;
