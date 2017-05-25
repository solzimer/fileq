var QueueFile = require("../queuefile.js");
var file=null, i=0;

function readEntry() {
		file.read((err,res)=>{
			console.log("***** "+res+ " *****");
			if(++i<100) readEntry();
			else file.close();
		});
}

QueueFile.open("test.tmp",(err,f)=>{
	file = f;
	readEntry();
});
