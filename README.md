# fileq

File based FIFO queue.
High-performance queue that stores JSON objects in a file-based FIFO, so the reads and writes are independent, allowing them to each have their own rhythm without increasing the memory usage.

## Features
* Multiple writers and readers on the same queue
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

setInterval(()=>{
	queue.push({key:i, message:"This is the entry for "+i});
	i++;
},100);

setInterval(()=>{
	queue.peek((err,entry)=>{
		console.log(entry);
	});
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

### queue.peek(time,callback) => Promise
Retrieves a JSON object from the queue, in a FIFO manner. Callback takes the
usual *err* and *result* arguments. If no callback is provided, it returns a
promise. The argument **time** specifies a wait for data timeout. If no data
cold be read before **time**, then callback is called with "timeout" error
(promise is rejected).

## Options
When creating a queue, data are stored in several files in a folder.

The *options* object allows us to *fine-tune* the queue files to better match
the needs of our process:
* **truncate** : If *true*, previous queue status is reset, and a new empty
queue is created. If *false*, a previously created queue is recovered. By
default is set to *false*.
* **path** : Base folder to store *anonymous* queues when the path is not
specified. By default, the base path is the os temporal folder.
