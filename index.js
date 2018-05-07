const
	os = require('os'),
	fs = require('fs-extra'),
	Queue = require('./lib/queue');

const REGISTRY = {}
const DEF = {
	truncate : false,
	path : os.tmpdir()
}

class FileQueue {
	constructor(name,options) {
		this.queue = new Queue(name,options.path,options.truncate);
	}

	static from(name,options) {
		name = name || "anonymous";

		if(!REGISTRY[name]) {
			options = options || {};
			options.truncate = options.truncate || DEF.truncate;
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

	peek(callback,time) {
		return this.queue.peek(callback,time);
	}
}

module.exports = FileQueue;
