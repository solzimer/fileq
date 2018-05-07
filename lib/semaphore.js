class Semaphore {
	constructor(capacity) {
		this.queue = [];
		this.count = Math.max(0,capacity);
	}

	take(time) {
		return new Promise((resolve,reject)=>{
			this.count--;

			if(this.count>=0) {
				resolve();
			}
			else {
				this.queue.push(resolve);
			}

			if(time) {
				setTimeout(()=>{
					let idx = this.queue.indexOf(resolve);
					if(idx>=0) {
						this.count++;
						this.queue.splice(idx,1);
						reject(new Error("timeout"));
					}
				},time);
			}
		});
	}

	leave(err) {
		this.count++;
		if(this.queue.length) {
			let resolve = this.queue.shift();
			resolve();
		}
	}

	get available() {
		return this.total;
	}

	capacity(n) {
		n = Math.max(0,n);
		this.total = n;

		while(this.total>0 && this.queue.length) {
			let resolve = this.queue.shift();
			resolve();
		}
	}
}

module.exports = Semaphore;
