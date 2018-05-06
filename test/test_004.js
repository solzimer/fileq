const
	Semaphore = require('../lib/semaphore');

async function test1() {
	let sem = new Semaphore(10);

	for(let i=0;i<30;i++) {
		sem.take().then(()=>console.log(`Taken sem ${i}`));
	}

	setTimeout(()=>{
		for(let i=0;i<10;i++) {
			sem.leave();
		}
	},1000);

	setTimeout(()=>{
		sem.capacity(20);
	},5000);
}

async function testAll() {
	try {
		await test1();
	}catch(err) {
		console.error(err);
	}
}

testAll();
