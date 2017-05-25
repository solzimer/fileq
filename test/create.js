var QueueFile = require("../queuefile.js");
var file=null, i=0;

function writeEntry() {
		var json = {
			message : "This is the entry number "+i+ " of the file",
			entry : i
		}
		file.write(json,(err,res)=>{
			if(++i<100) writeEntry();
			else file.close();
		});
}

QueueFile.create("test.tmp",100,40,(err,f)=>{
	file = f;
	writeEntry();
});
