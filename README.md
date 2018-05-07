# fileq

File based FIFO queue.
High-performance queue that stores JSON objects in a file-based FIFO, so the reads and writes are independent, allowing them to each have their own rhythm without increasing the memory usage.

## Features
* Multiple writers and readers on the same queue
* Can recover previous queue if process is restarted
* Recover queue position on process restart
* Persitent or truncate modes on process restart
* In-memory direct access when reads are faster then writes
* Customizable memory cache size
* Fault tolerant, and fine-tunning

## Installation
```
npm install fileq
```

## Usage
```javascript
const FileQueue = require("fileq");

// Each queue stores its files in a folder
var queue = FileQueue.from("./queue");
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
### FileQueue.from([path],[options])
Retrieve a queue stored in *path* folder. If the queue doesn't exist, it is
created. The *options* parameter will be described later. If path is not
specified, an *anonymous* queue will be created in the base path defined in
the base options.

### FileQueue.configure(options)
Sets default options that will be passed to every new created queue

### queue.push(json,callback)
Pushes a JSON object to the queue. Callback takes the typical *err* and
*result* arguments.

### queue.peek(callback)
Retrieves a JSON object from the queue, in a FIFO manner. Callback takes the
usual *err* and *result* arguments, and a third *cache* argument, set to
*true* if the item has been retrieved from memory

## Options
When creating a queue, data are stored in several files in a folder. This is
made so in case of data corruption, data can be recovered from the undamaged
files.

Also, each file contains a predefined number of objects, and they are split in
fixed-sized blocks. The reason behind that structure is the minimization of
disk access on writes, and an easy access to each object during reads.

The *options* object allows us to *fine-tune* the queue files to better match
the needs of our process:
* **truncate** : If *true*, previous queue status is reset, and a new empty
queue is created. If *false*, a previously created queue is recovered. By
default is set to *false*.
* **path** : Base folder to store *anonymous* queues when the path is not
specified. By default, the base path is the os temporal folder.
