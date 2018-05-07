const
	fs = require('fs-extra'),
	Catalog = require('./lib/catalog'),
	Queue = require('./lib/queue');

const REGISTRY = {}
const DEF = {
	cache : 0,
	truncate : false,
	path : './.fileq'
}

class FileQueue {
	constructor(name,options) {

		this.queue = new Queue(name);
	}

	static from(name,options) {
		if(REGISTRY[name]) {
			return REGISTRY[name];
		}
		else {
			options = options || {};
			options.cache = parseInt(options.cache) || DEF.cache;
			options.truncate = options.truncate || DEF.truncate;

		}
	}
}
