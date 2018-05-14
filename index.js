const
	os = require('os'),
	fs = require('fs-extra'),
	Queue = require('./lib/queue');

const REGISTRY = {}
const DEF = {
	truncate : false,
	autocommit : true,
	path : os.tmpdir()
}

class FileQueue {
	constructor(name,options) {
		this.queue = new Queue(name,options);
	}

	static from(name,options) {
		name = name || "anonymous";

		if(!REGISTRY[name]) {
			options = options || {};
			options.truncate = options.truncate===true;
			options.path = options.path || DEF.path;
			REGISTRY[`${options.path}/${name}`] = new FileQueue(name,options);
		}
		return REGISTRY[`${options.path}/${name}`];
	}

	static configure(options) {
		Object.keys(options).forEach(k=>{
			DEF[k] = options[k];
		});
	}

	push(data,callback) {
		return this.queue.push(data,callback);
	}

	poll(callback,time) {
		return this.queue.poll(callback,time);
	}

	head(callback,time) {
		return this.queue.head(callback,time);
	}

	peek(callback,time,commit) {
		return this.queue.peek(callback,time,commit);
	}

	get locked() {
		return this.queue.locked;
	}

	lock(callback) {
		return this.queue.lock(callback);
	}

	unlock() {
		return this.queue.unlock();
	}
}

module.exports = FileQueue;
