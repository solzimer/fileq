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
		return {read : rw[0], write : rw[1], mutex : new Semaphore(rw[1]-rw[0]), commit: new Semaphore(1)}
	}catch(err) {
		let rw = {read : 0, write : 0, mutex : new Semaphore(0), commit: new Semaphore(1)};
		await Promise.all([
			db.put("$read",`${rw.read}`),
			db.put("$write",`${rw.write}`)
		]);
		return rw;
	}
}

function commit(db,rw) {
	return Promise.all([
		db.put("$read",`${rw.read}`),
		db.put("$write",`${rw.write}`)
	]);
}

async function save(db,rw) {
	try {
		await rw.commit.take();
		rw.write++;
		await commit(db,rw);
		rw.commit.leave();
	}catch(err) {
		rw.commit.leave();
		throw err;
	}
}

async function remove(db,rw,id) {
	try {
		await rw.commit.take();
		rw.read++;
		await Promise.all([db.del(id), commit(db,rw)]);
		rw.commit.leave();
	}catch(err) {
		rw.commit.leave();
		throw err;
	}
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

		this.pusher = new Semaphore(1);
		this.mutex = new Semaphore(1);
		this.commiter = new Semaphore(1);
		this.path = `${path}/${name}`;

		this.wm = fs.
			mkdirp(path).
			then(()=>{
				if(truncate) return fs.remove(this.path);
			}).
			then(()=>this.db=levelup(leveldown(this.path))).
			then(()=>init(this.db));
	}

	get locked() {
		return this.mutex.available <= 0;
	}

	get closed() {
		return this.db.isClosed();
	}
	
	async lock(callback) {
		await this.mutex.take();
		if(callback) callback();
	}

	unlock() {
		this.mutex.leave();
	}

	close() {
		return new Promise((ok,rej)=>{
			this.db.close(err=>err?rej(err):ok());
		});
	}

	async push(data,callback) {
		try {
			await this.pusher.take();
			let rw = await this.wm;
			let db = this.db;
			let id = rw.write;
			await db.put(id,JSON.stringify(data)),
			await save(db,rw)
			rw.mutex.capacity(rw.write-rw.read);
			this.pusher.leave();
			if(callback) callback();
		}catch(err) {
			this.pusher.leave();
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
			await this.commiter.take();
			let rw = await this.wm;
			let db = this.db;
			var id = rw.read;
			await rw.mutex.take(time);
			let item = await db.get(id,{asBuffer:false});
			item = JSON.parse(item);

			if(commit && callback) {
				await this.lock();
				let docommit = await awaitCommit(item,callback);
				if(docommit) await remove(db,rw,id);
				this.commiter.leave();
			}
			else {
				await remove(db,rw,id);
				this.commiter.leave();
				if(callback) callback(null,item);
				else return item;
			}
		}catch(err) {
			this.commiter.leave();
			if(callback) callback(err);
			else throw err;
		}
	}
}

module.exports = Queue;
