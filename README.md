# fileq

File based FIFO queue.
High-performance queue that stores JSON objects in a file-based FIFO, so the reads and writes are independent, allowing them to each have their own rhythm without increasing the memory usage.

## Features
* Multiple writers and readers on the same queue
* Callback and promise modes
* Can recover previous queue if process is restarted
* Recover queue position on process restart
* Persitent or truncate modes on process restart
* Fault tolerant, and fine-tunning

## Installation
```
npm install fileq
```

## Usage
```javascript
const FileQueue = require("fileq");

// Each queue stores its files in a folder
var queue = FileQueue.from("queue");
var i=0;

// Callback mode
setInterval(()=>{
	queue.push({key:i, message:"This is the entry for "+i});
	i++;
},100);

setInterval(()=>{
	queue.peek((err,entry)=>{
		console.log(entry);
	});
},100);

// Promise mode
setInterval(async ()=>{
	await queue.push({key:i, message:"This is the entry for "+(i++)});
},100);

setInterval(async ()=>{
	let item = await queue.peek();
	console.log(item);
},100);

```

## API
### FileQueue.from([path],[options]) => FileQueue
Retrieve a queue stored in *path* folder. If the queue doesn't exist, it is
created. The *options* parameter will be described later. If path is not
specified, an *anonymous* queue will be created in the base path defined in
the base options.

### FileQueue.configure(options)
Sets default options that will be passed to every new created queue

### queue.push(json,callback) => Promise
Pushes a JSON object to the queue. Callback takes the typical *err* and
*result* arguments. If no callback is provided, it returns a promise.

### queue.peek(time,callback,commit) => Promise
Retrieves a JSON object from the queue, in a FIFO manner. Callback takes the
usual *err* and *result* arguments. If no callback is provided, it returns a
promise. The argument **time** specifies a wait for data timeout. If no data
could be read before **time**, then callback is called with "timeout" error
(promise is rejected). The *commit* parameter specifies a transactional requirement.
When *commit* is *true*, callback function receives a third argument (function *done*)
that must be called in order to remove the item from the queue.
Commit mode only works when callback function is passed:

```javascript
	// Promise mode
	// Waits forever for an entry. Entry is returned and removed from queue
	let item = await queue.peek();
	// Waits 100 ms for an entry. Entry is returned and removed from queue, or timeout error
	let item = await queue.peek(10);

	// Callback mode
	// Waits forever for an entry. Entry is returned and removed from queue
	queue.peek((err,item)=>{
		console.log(item);
	});
	// Waits 100 ms for an entry. Entry is returned and removed from queue, or timeout error
	queue.peek((err,item)=>{
		if(err) console.error(err);
		else console.log(entry);
	},100);
	// Waits forever for an entry. Entry is returned but not remove until done is called
	queue.peek((err,item,done)=>{
		let error = doSomething(item);
		if(error) done(error); // If done is called with arguments, item is not removed
		else done();	// done called without arguments remove the item from the queue
	},100,true);
```
**Important:** If commit mode is used, no more reads will be done until *done*
has been called (queue will block further reads to avoid inconsistency):
```javascript
	queue.peek((err,item,done)=>{
		console.log(item);
		setTimeout(done,1000);	// Queue will be locked 1 sec
	},0,true);

	// Cannot retrieve next item until previous call ends
	queue.peek((err,item)=>{
		console.log(item);
	});
```

### queue.poll(time,callback) => Promise
The same as **queue.peek** but without the *commit* feature

### queue.head(time,callback) => Promise
Retrieves the head of the queue, without removing the element, as
oposed to **peek** and **poll**

### queue.lock(callback) => Promise
Locks the queue so no other callers can read from it until **queue.unlock**
is called. Note that this is a soft lock (other readers can ignore the lock). The only time where a lock cannot be ignored if is **queue.peek** is called with *commit* feature (It's a different hard lock):

```javascript
	// Locks the queue for 100 reads
	async function reader1() {
		await queue.lock();
		for(let i=0;i<100;i++) {
			let item = await queue.poll();
		}
		queue.unlock();
	}

	// Same as reader1: If reader1 has the lock, reader2 must wait
	async function reader2() {
		await queue.lock();
		for(let i=0;i<10;i++) {
			let item = await queue.poll();
		}
		queue.unlock();
	}

	// reader3 doesn't ask for lock, so it can read without waiting
	async function reader3() {
		for(let i=0;i<100;i++) {
			let item = await queue.poll();
		}
	}

	// reader4 doesn't ask for lock, but uses commit feature, so nobody
	// can read until commit is applied
	async function reader4() {
		for(let i=0;i<10;i++) {
			queue.peek((err,item,done)=>{
				setTimeout(done,1000);
			});
		}
	}
```

### queue.unlock()
Unlocks queue reads

### queue.locked => Boolean
Returns *true* if queue has a virtual lock; *false* otherwise.

## Options
When creating a queue, data are stored in several files in a folder.

The *options* object allows us to *fine-tune* the queue files to better match
the needs of our process:
* **truncate** : If *true*, previous queue status is reset, and a new empty
queue is created. If *false*, a previously created queue is recovered. By
default is set to *false*.
* **path** : Base folder to store *anonymous* queues when the path is not
specified. By default, the base path is the os temporal folder.
