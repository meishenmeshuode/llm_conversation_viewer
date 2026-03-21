const express = require('express'); 
const fs = require('fs');
const { exec } = require('child_process'); 
const session = require('express-session');
const bodyParser = require('body-parser');
const pty = require('@lydell/node-pty');
const EventEmitter = require('events');
const diff = require('fast-diff');
const { Mutex } = require('async-mutex');
const crypto = require('node:crypto');
const os = require('os');
 
const app = express();
const port = 3000; 
const CORRECT_PASSWORD = process.env.VIEWER_PASSWORD ||'';//PUT_YOUR_PASSWORD_TO_VIEWER_HERE_OR_SET_AN_ENVIRONMENT_VARIABLE
const EOL = os.EOL;
let ptyProcess=null;
const Emitter = new EventEmitter();
const mutex = new Mutex();
let previousfilecontent=''

async function openPowershell(){
	try {
		const ptyProcess = pty.spawn('powershell.exe', [], {
    name: 'dumb',//'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
	});
	 
    ptyProcess.onData(data => {
      process.stdout.write(data);
		Emitter.emit('data',data);
		if(data.includes("FINISH_SIGNAL")){
			return externalResolve();
		}
	});//python output to powershell&web
	
	ptyProcess.onExit(({ exitCode, signal }) => {
		console.log(`\n\rPTY process exited with code ${exitCode}`);
		process.stdin.setRawMode(false);
		process.exit();
	});
	process.stdin.setRawMode(true); 
	
	process.stdin.on('data', data => {
		ptyProcess.write(data.toString());

	});//powershell input to python process
	 await runPowerShellCommand(`cd`,'llm_conversation_viewer',ptyProcess);
	 //await runPowerShellCommand(`$PSStyle.OutputRendering = 'PlainText'`,'',ptyProcess);
	 await runPowerShellCommand(`cd .\\python`,"\\python>",ptyProcess);
	 await runPowerShellCommand(`python .\\serverDataprocess.py `,'(InteractiveConsole)',ptyProcess);
     return ptyProcess;
	}catch (error) {
    console.error(error);
	}
}

	
function runPythonCommand(command,ptyProcess) {
 
	try {
		const wCommand=command+`${EOL}`
		ptyProcess.write(wCommand); 
         return ; 
	  } catch (error) {
		console.error(error);
	  }
} 
function runPowerShellCommand(command,StrtoRecog,ptyProcess) {
	try {
		let commandHistory="";
		const wCommand=command+`${EOL}`
		ptyProcess.write(wCommand); 
         return new Promise((resolve,reject)=>{
			Emitter.on('data',(data)=>{
				commandHistory=commandHistory.concat(data);//closure
					if(commandHistory.includes(StrtoRecog)){
						//console.log("commandHistory:"+commandHistory);
						resolve();
						Emitter.removeAllListeners('data')
					}
				})
			}); 
	  } catch (error) {
		console.error(error);
	  }
}
function racePromise(timeout){
	const timer=new Promise((_,reject)=>{
		setTimeout(()=>{reject(new Error('Timeout'))},timeout);
	});
	const promise=new Promise((resolve, reject) => {
		externalResolve = resolve;
		externalReject = reject;
	});
	return Promise.race([promise,timer]);
}
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: crypto.randomBytes(70).toString('hex'),
    resave: false, 
    saveUninitialized: true, 
    cookie: { secure: false } 
}));

app.get('/', (req, res) => {
    res.redirect('/viewer');
});


app.post('/login', (req, res) => {
    const { password } = req.body;

    if (password === CORRECT_PASSWORD) {

        req.session.isLoggedIn = true;
        res.redirect('/viewer');
    } else {
        res.redirect('/viewer?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/viewer');
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/viewer');
    });
});
function checkAuth(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    } else {
		const lang = req.acceptsLanguages('zh','en');
		if(lang==='zh'){res.sendFile(__dirname + '/public/login-zh.html');}else{
		         res.sendFile(__dirname + '/public/login.html');}
    }
}

app.get('/viewer', checkAuth, (req, res) => {
	const lang = req.acceptsLanguages('zh','en');
	if(lang==='zh'){res.sendFile(__dirname + '/client-zh.html');}else{
	    res.sendFile(__dirname + '/client.html');}
});


app.use(express.json()); 
let externalResolve=null;
let externalReject=null;
app.post('/submit-data-a',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	const message = req.body.message;
	const modelname = req.body.model;
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	previousfilecontent='';
	fs.watchFile('./python/py_js_interchange',{interval:1000}, (curr, prev) => {
		if(curr.mtime.getTime()===prev.mtime.getTime())
		{return;}
		fs.readFile('./python/py_js_interchange', 'utf8', (err, data) => {
			let difference='';
			diff(previousfilecontent,data).forEach(item=>{if(item[0]===1){difference=difference.concat(item[1])}});
			if(externalResolve!==null){
				res.write(difference);
				previousfilecontent=data;
			}
		});
	});
	//let correctedMessage="";
	//message.split("'").forEach((item)=>{correctedMessage=correctedMessage.concat(item,"\\'")})
	//correctedMessage=correctedMessage.slice(0,-2);
	const comamnd="send_message(ll,'"+message.replaceAll("'","\\'").replaceAll('"','\\"')+"','"+modelname+"',url,headers)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.setHeader('Transfer-Encoding', 'chunked');
	await racePromise(180000).catch(err=>{console.log(err)});
	
	fs.unwatchFile('./python/py_js_interchange');
	const filedata=fs.readFileSync('./python/py_js_interchange', 'utf8');
	let difference='';
	diff(previousfilecontent,filedata).forEach(item=>{if(item[0]===1){difference=difference.concat(item[1])}});
	res.write(difference);
	previousfilecontent=filedata;		
	res.end();	
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	externalReject=null;
	externalResolve=null;
 })
});
app.post('/submit-data-u',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	const modelname = req.body.model;
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	previousfilecontent='';
	fs.watchFile('./python/py_js_interchange',{interval:1000}, (curr, prev) => {
		if(curr.mtime.getTime()===prev.mtime.getTime())
		{return;}
		fs.readFile('./python/py_js_interchange', 'utf8', (err, data) => {
			let difference='';
			diff(previousfilecontent,data).forEach(item=>{if(item[0]===1){difference=difference.concat(item[1])}});
			if(externalResolve!==null){
				res.write(difference);
				previousfilecontent=data;
			}
		});
	});
	const comamnd="send_message_u(ll,'"+modelname.replaceAll("'","\\'").replaceAll('"','\\"')+"',url,headers)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.setHeader('Transfer-Encoding', 'chunked');
	await racePromise(180000).catch(err=>{console.log(err)});
	
	fs.unwatchFile('./python/py_js_interchange');
	const filedata=fs.readFileSync('./python/py_js_interchange', 'utf8');
	let difference='';
	diff(previousfilecontent,filedata).forEach(item=>{if(item[0]===1){difference=difference.concat(item[1])}});
	res.write(difference);
	previousfilecontent=filedata;		
	res.end();	
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	externalReject=null;
	externalResolve=null;
 })
});
app.post('/append',(req,res)=>{
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	const comamnd="appendnode('"+req.body.content.replaceAll("'","\\'").replaceAll('"','\\"')+"','"+req.body.role+"','"+req.body.model+"',ll)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	racePromise(180000).catch(err=>{
		console.log(err);	
		res.status(503);	
		externalReject=null;
		externalResolve=null;
		throw new Error();//this will cause promise of catch rejected,and go to then's error branch
	}).then(v=>{//otherwise
		res.end();	
		externalReject=null;
		externalResolve=null;	
	},e=>{
		res.end();		
	});
 })	
});
app.post('/delete',(req,res)=>{
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	const comamnd="deletenode(ll)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	racePromise(180000).catch(err=>{
		console.log(err);	
		res.status(503);	
		externalReject=null;
		externalResolve=null;
		throw new Error();//this will cause promise of catch rejected,and go to then's error branch
	}).then(v=>{//otherwise
		res.end();	
		externalReject=null;
		externalResolve=null;	
	},e=>{
		res.end();	
	});
 })	
});
app.post('/save-data',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	const comamnd="saveSubtrees(ll)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	await racePromise(180000).catch(err=>{console.log(err)});

	res.end();	

	externalReject=null;
	externalResolve=null;
 })
});
app.post('/load-tree',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	const comamnd="transmitTree(ll)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	await racePromise(180000).catch(err=>{console.log(err)});

	const filedata=fs.readFileSync('./python/py_js_interchange', 'utf8');
	res.send(filedata);	
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});

	externalReject=null;
	externalResolve=null;
 })
});
app.post('/load-lastblc',(req,res)=>{
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
	const comamnd="transmitTree_lastBlc(ll)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	racePromise(180000).catch(err=>{
		console.log(err);	
		res.status(503);	
		externalReject=null;
		externalResolve=null;
		throw new Error();//this will cause promise of catch rejected,and go to then's error branch
	}).then(v=>{//otherwise
		const filedata=fs.readFileSync('./python/py_js_interchange', 'utf8');
		res.send(filedata);	
		fs.writeFile('./python/py_js_interchange',"",(err)=>{});
		externalReject=null;
		externalResolve=null;	
	},e=>{
		res.end();			
	});


 })	
});
app.post('/locate',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
    const coordinate = req.body;
	const comamnd=`Nodecoordinate=[${coordinate}];ll.locate(Nodecoordinate)`
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	racePromise(180000).catch(err=>{
		console.log(err);	
		res.status(503);	
		externalReject=null;
		externalResolve=null;
		throw new Error();//this will cause promise of catch rejected,and go to then's error branch
	}).then(v=>{//otherwise
		res.end();	
		externalReject=null;
		externalResolve=null;	
	},e=>{
		res.end();	
	});
 })
});
app.post('/display-node',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});
    const coordinate = req.body;
	const comamnd=`transCont(ll.selectedNode)`
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	await racePromise(180000).catch(err=>{console.log(err)});

	const filedata=fs.readFileSync('./python/py_js_interchange', 'utf8');
	res.send(filedata);
	fs.writeFile('./python/py_js_interchange',"",(err)=>{});	

	externalReject=null;
	externalResolve=null;
 })
});
app.post('/search',(req, res) => {
 mutex.runExclusive(async ()=>{
    console.log('received data:', req.body);
    const message = req.body.message;
	const comamnd="locate(ll,keyword)"
    runPythonCommand(comamnd,ptyProcess);
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	await racePromise(180000).catch(err=>{console.log(err)});

	res.end();	

	externalReject=null;
	externalResolve=null;
 })
});
app.use(express.static('public'));

openPowershell().then((ps)=>{ptyProcess=ps;
app.listen(port, () => {
  process.stdout.write(`Lauched server successfully，listening to http://localhost:${port}\r\n`);
	});
  
});

