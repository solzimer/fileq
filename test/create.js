var QueueFile = require("../queuefile.js");
var file=null, i=0;

function writeEntry() {
		var json = {
			message : "This is the entry number "+i,
			entry : i
		}
		file.write(json,(err,res)=>{
			if(++i<100) writeEntry();
			else file.close();
		});
}

QueueFile.create("test.tmp",100,(err,f)=>{
	file = f;
	writeEntry();
});
