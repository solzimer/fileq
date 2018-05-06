class Semaphore {
	constructor(capacity) {
		this.total = capacity;
		this.queue = [];
		this.count = 0;
	}

	take(time) {
		this.count++;

		return new Promise((resolve,reject)=>{
			if(this.count<=this.total) {
				resolve();
			}
			else {
				this.queue.push(resolve);
			}

			if(time) {
				setTimeout(()=>{
					let idx = this.queue.indexOf(resolve);
					if(idx>=0) {
						this.count--;
						this.count = Math.max(this.count,0);
						this.queue.splice(idx,1);
						reject(new Error("timeout"));
					}
				},time);
			}
		});
	}

	leave(err) {
		this.count--;
		this.count = Math.max(this.count,0);
		if(this.queue.length) {
			let resolve = this.queue.shift();
			resolve();
		}
	}

	available() {
		return this.total - this.count;
	}

	capacity(n) {
		let old = this.total;
		this.total = n;
		for(let i=old;i<n;i++)
			this.leave();
	}
}

module.exports = Semaphore;
