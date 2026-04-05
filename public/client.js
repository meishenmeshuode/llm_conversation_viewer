const canvas = document.getElementById("canvas");
const viewport = document.getElementById('viewport');
const messageTextArea=document.getElementById('msgTextarea');
class TreeCanvas {
  constructor(canvasId, initialData) { 
    this.canvasBound=0;
	this.Boundid=0;
    this.elementMap = new Map(); // ID to Elements on canvas Map()
    this.transformBuffer = {
      x: 0,     
      y: 0,      
      scale: 1  
    };
	this.LayerX;
	this.Height;
    this.initDrag();
	this.uptCavExt();
	
  }


  render(blockId) {
	document.querySelector(`#svgLay${blockId}`).innerHTML='';
	document.querySelector(`#nodeLay${blockId}`).innerHTML='';
	this.elementMap.forEach((_v,key,_m)=>{if(key.split('_')[0]===String(blockId))this.elementMap.delete(key)})
	this.LayerX=0;
	this.Height=0;
	this.traverseAndRender(dataTree.nodeMap.get(`${blockId}_0`), null,null,blockId);
	document.querySelector(`#subcav${blockId}`).style.height=`${this.Height*50+45}px`;
	document.querySelector(`#svgLay${blockId}`).setAttribute('height',String(document.querySelector(`#subcav${blockId}`).offsetHeight));
	this.uptCavExt();
  }

  traverseAndRender(nodeData, parentData,parentY,blockId) {
    if (!nodeData) return;
	if (parentData) {

		const nodeElement = document.createElement('div');
		nodeElement.className = 'node';
		nodeElement.id = nodeData.id;
		nodeElement.textContent = nodeData.text;
		this.elementMap.set(nodeElement.id, nodeElement);

		nodeElement.style.left = `${this.LayerX}px`;
		nodeElement.style.top = `${this.Height*50}px`;

		nodeElement.addEventListener('click', () => {
		});
		
		document.querySelector(`#nodeLay${blockId}`).appendChild(nodeElement);
		const roleEle = document.createElement('div');
		roleEle.className = 'roleInCan';
		roleEle.textContent=nodeData.role.slice(0,1).toUpperCase();
		nodeElement.appendChild(roleEle);
		

		if(parentData.id.split("_")[1]!=="0"){//only enter if it's SYSTEM node

		  var parentX = this.LayerX-5; //start Endpoint X of parent Edge

		  var childX = this.LayerX;//end Endpoint X of parent Edge
		  var childY = this.Height*50 + 20;
		  if(parentY===childY){
			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', parentX);
			line.setAttribute('y1', parentY);
			line.setAttribute('x2', childX);
			line.setAttribute('y2', childY);      
			document.querySelector(`#svgLay${blockId}`).appendChild(line);
		  }else{
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			const pathAttr=`M${parentX} ${parentY} L ${parentX} ${childY-5} C ${parentX} ${childY},${parentX} ${childY},${childX} ${childY}`
			path.setAttribute('d',pathAttr);
			document.querySelector(`#svgLay${blockId}`).appendChild(path);
		  }
		}
		const nodeY=this.Height*50 + 20;
		this.LayerX=this.LayerX+nodeData.predictedWidth+5;

		for(let i=0;i<nodeData.Cnode.length;i++){
			this.traverseAndRender(nodeData.Cnode[i],nodeData,nodeY,blockId);
			if(i<nodeData.Cnode.length-1)this.Height++;
		}
		this.LayerX=this.LayerX-nodeData.predictedWidth-5;
	}else{//only enter if it's initial node
		
		this.LayerX=50;
		this.Height=this.Height+0.1;//height offset
		const nodeY=this.Height*50 + 20;//height offset
		for(let i=0;i<nodeData.Cnode.length;i++){
			this.traverseAndRender(nodeData.Cnode[i],nodeData,nodeY,blockId);
			if(i<nodeData.Cnode.length-1)this.Height++;
		}
	}
	return this.Height;
  }
   navitoBlcID(ID){
    this.transformBuffer.y=0;
    for(let i=0;i<ID;i++){
		if(document.querySelector(`#subcav${i}`)===null){
			this.transformBuffer.y+=-1500*this.transformBuffer.scale;
		}else{
			this.transformBuffer.y+=-document.querySelector(`#subcav${i}`).offsetHeight*this.transformBuffer.scale
		}
	}
	this.transformBuffer.x=0;
	this.updateTransform();
	this.uptCavExt();
   }
   updateTransform() {
    const { x, y, scale } = this.transformBuffer;

    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  initDrag() {
	let startX, startY;
	let initialCanvasX, initialCanvasY;
	
	canvas.addEventListener('mousedown', (e) => {
	e.preventDefault();
	startX = e.clientX;
	startY = e.clientY;
	canvas.style.cursor = 'grabbing';
	const transformMatrix = new DOMMatrix(getComputedStyle(canvas).transform);
	initialCanvasX = transformMatrix.e; 
	initialCanvasY = transformMatrix.f; 

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
	});
	canvas.addEventListener('touchstart', (e) => {

	const touch=e.touches[0]
	startX = touch.clientX;
	startY = touch.clientY;
	const transformMatrix = new DOMMatrix(getComputedStyle(canvas).transform);
	initialCanvasX = transformMatrix.e; 
	initialCanvasY = transformMatrix.f;
	document.addEventListener('touchmove', onTouchMove, { passive: false });
	document.addEventListener('touchend', onTouchEnd, { passive: false });
	});

	const onMouseMove=(e)=>{

		const deltaX = e.clientX - startX;
		const deltaY = e.clientY - startY;

		canvasTree.transformBuffer.x= initialCanvasX + deltaX;
		canvasTree.transformBuffer.y= initialCanvasY + deltaY;
		canvasTree.updateTransform();
	}
	const onTouchMove=(e)=>{

		e.preventDefault();
		const touch = e.touches[0];
		const deltaX = touch.clientX - startX;
		const deltaY = touch.clientY - startY;
		canvasTree.transformBuffer.x= initialCanvasX + deltaX;
		canvasTree.transformBuffer.y= initialCanvasY + deltaY;
		canvasTree.updateTransform();
	}

	const onMouseUp=()=>{

		canvas.style.cursor = 'grab';

		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
		this.uptCavExt();
	}
	const onTouchEnd=(e)=>{
	if(e.touches.length===0){
			canvas.style.cursor = 'grab';
			document.removeEventListener('touchmove', onTouchMove);
			document.removeEventListener('touchend', onTouchEnd);
			this.uptCavExt();
		}
	}

	const handleScroll=(e)=>{
		e.preventDefault();
		const zoomFactor = Math.exp(-e.deltaY * 0.001);
		const oldScale = canvasTree.transformBuffer.scale;
		let newScale = oldScale * zoomFactor;
		newScale = Math.max(0.1, Math.min(5.0, newScale));
		const XinCanvas = (e.clientX - canvasTree.transformBuffer.x) / oldScale;
		const YinCanvas = (e.clientY - canvasTree.transformBuffer.y) / oldScale;//f(e.clientX)
		canvasTree.transformBuffer.x = e.clientX - XinCanvas * newScale;
		canvasTree.transformBuffer.y = e.clientY - YinCanvas * newScale;//After this,f(e.clientX)=XinCanvas still applied.
		canvasTree.transformBuffer.scale = newScale;

		canvasTree.updateTransform();
		this.uptCavExt();
	}
		canvas.addEventListener('wheel',handleScroll,{passive:false});
  }
	uptCavExt(){
		let checkCanvpos;
		while(1){
			this.canvasBound=canvas.offsetHeight;
			checkCanvpos=this.canvasBound+10;
			const checkpositionY=this.transformBuffer.y+(checkCanvpos) * this.transformBuffer.scale;
			if (checkpositionY>=600){
				break;
			}else if (checkpositionY<600){
				const newcavelement = document.createElement('div');
				newcavelement.className = 'cavblock';
				newcavelement.id=`subcav${this.Boundid}`;
				canvas.appendChild(newcavelement);
				const newloadelement = document.createElement('div');
				newloadelement.className = 'loadBtn';
				newloadelement.innerText="L";
				newloadelement.id=`loadBtn${this.Boundid}`;
				newcavelement.appendChild(newloadelement);
				newloadelement.addEventListener('click',async (e)=>{
					newloadelement.classList.add("Loading");
					await sendCoordinate_thenAction('load');
					newloadelement.classList.remove("Loading");
					newloadelement.classList.add("afterLoad");
				});
				const newspanelement = document.createElement('span');
				newspanelement.className='Blockspan';
				newspanelement.innerHTML="SubTreeID:<span style='text-combine-upright: all;'>"+`
				${this.Boundid*20}`+"</span>-<span style='text-combine-upright: all;'>"+`${this.Boundid*20+19}`+"</span>";
				
				newspanelement.id=`Spanele${this.Boundid}`;
				newcavelement.appendChild(newspanelement);
				const newnodeLayer = document.createElement('div');
				const newsvgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				newnodeLayer.id = `nodeLay${this.Boundid}`;
				newsvgLayer.id = `svgLay${this.Boundid}`;
				newnodeLayer.className="node-layer";
				newsvgLayer.setAttribute('class',"svg-layer");
				newsvgLayer.setAttribute('width',String(newcavelement.offsetWidth))
				newsvgLayer.setAttribute('height',String(newcavelement.offsetHeight))
				newcavelement.appendChild(newsvgLayer);
				newcavelement.appendChild(newnodeLayer);
				this.Boundid++;
			}
		}
	}  
}
class TreeNode{
	constructor(parent){
	this.Pnode=parent;
	this.Cnode=[];
	this.text="";
	this.content="";
	this.role="";
	this.model="",
	this.id="";
	this.predictedWidth=0;
	this.beforeInit=true;
	}
}
function predictWidth(text){
	const canvas = document.createElement('canvas');
	cachedCanvasContext = canvas.getContext('2d');
	cachedCanvasContext.font = '16px "Times New Roman"';
	return cachedCanvasContext.measureText(text).width
}
class TreeData{
	static 	DataPydict={
	S:"system",
	U:"user",
	A:"assistant",
	}
	
	constructor(){
	this.nodeMap= new Map();
	}
	constructTree_obj(blockID){
		let id=0;
		function traverseAndPredicWid(nodeMap,Node){
			Node.id=`${blockID}_${id}`;
			Node.predictedWidth=predictWidth(Node.text)+30+2;
			nodeMap.set(Node.id,Node);
			id++;
			for(let i=0;i<Node.Cnode.length;i++){
				traverseAndPredicWid(nodeMap,Node.Cnode[i]);
			}
		}
		const blockHead=this.nodeMap.get(`${blockID}_0`);
		this.nodeMap.forEach((_v,key,_m)=>{if(key.split('_')[0]===String(blockID))this.nodeMap.delete(key)});
		if(blockHead!==undefined&&blockHead.Cnode.length>0){
			traverseAndPredicWid(this.nodeMap,blockHead);
		}
		canvasTree.render(blockID);
	}
	constructTree(TreeDataPy,blockID){
		let Nodeholder;let id=0;
		this.nodeMap.forEach((_v,key,_m)=>{if(key.split('_')[0]===String(blockID))this.nodeMap.delete(key)});
		if(TreeDataPy.length>1){
			for(let i=0;i<TreeDataPy.length;i++){
				if(typeof(TreeDataPy[i])==="number"){
					for(let j=0;j<TreeDataPy[i];j++){
					Nodeholder=Nodeholder.Pnode;
					}
				}else{
					const newNode=new TreeNode(Nodeholder);
					if(i>0){Nodeholder.Cnode.push(newNode);}
					Nodeholder=newNode;
					Nodeholder.id=`${blockID}_${id}`;
					Nodeholder.role=TreeData.DataPydict[TreeDataPy[i].slice(0,1)]
					if(TreeDataPy[i].slice(1)===""){Nodeholder.text=`node-${id}`}else{Nodeholder.text=TreeDataPy[i].slice(1);}
					Nodeholder.predictedWidth=predictWidth(Nodeholder.text)+30+2;
					Nodeholder.content='';
					this.nodeMap.set(Nodeholder.id, Nodeholder); 
					id++;
				}
				}
		}
	canvasTree.render(blockID);
	}
	find_Loc(nodeID){
		let nodeData=this.nodeMap.get(nodeID);
		let blockID=nodeData.id.split("_")[0];
		let coordinate=[];
		while(nodeData.text!=="INITIAL_NODE"){
			for(let i=0;i<nodeData.Pnode.Cnode.length;i++){
				if(nodeData.Pnode.Cnode[i].id===nodeData.id){
				coordinate.splice(0,0,i);
				break;
			}
		}
		nodeData=nodeData.Pnode;
	}
	coordinate[0]=blockID*20+coordinate[0];
	return coordinate
	}
	appendNode(parentID,node){
		let parentNode=this.nodeMap.get(parentID);
		node.Pnode=parentNode;
		parentNode.Cnode.push(node);
		this.constructTree_obj(parseInt(parentID.split("_")[0]));
	}
	deleteNode(deleteID){
		let nodeToDelete=this.nodeMap.get(deleteID);
		let i;
		for(i=0;i<nodeToDelete.Pnode.Cnode.length;i++){
			if(nodeToDelete.Pnode.Cnode[i].id===nodeToDelete.id)break;}
		nodeToDelete.Pnode.Cnode.splice(i,1);
		this.constructTree_obj(parseInt(deleteID.split("_")[0]));	
	}
}

canvas.addEventListener('click', function(event) {

    const target = event.target;

    // .closest() getting most close parent node div
    const item = target.closest('.node');

    if (!item) {return;
	}else{
		document.getElementById("addNodebutton").disabled = false;
		document.getElementById("deleteNodebutton").disabled = false;
		document.getElementById("displybutton").disabled = false;
		const currentActive = canvas.querySelector('.node.active');
		if (currentActive && currentActive !== item) {
			currentActive.classList.remove('active');
		}
		item.classList.add('active');
		if(item.getElementsByClassName("roleInCan")[0].innerText==="U"){messageTextArea.disabled = true;}else{messageTextArea.disabled = false;}
		const clickedNode=dataTree.nodeMap.get(item.id)
		Responsearea.innerHTML=marked.parse(clickedNode.content);
		if(clickedNode.beforeInit===false){Responsemodel.textContent=`  From: ${clickedNode.model}`;}else{Responsemodel.textContent="";}
		console.log(dataTree.find_Loc(item.id));
	}
});
const canvasTree = new TreeCanvas('canvas', null);
const dataTree = new TreeData();
marked.use(markedHighlight.markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  }));
const Responsearea = document.getElementById("Responsearea");
const Responsemodel=document.getElementById("Responsemodel");
console.log('Initialization Complete');


async function sendCoordinate_thenAction(action){
	const overlayer = document.createElement('div');
	overlayer.className = 'overlay';
	document.querySelector("body>div").appendChild(overlayer);
	let coordinate=[];
	if(document.getElementById("subTreeAddBtn").checked===true){
		coordinate=[];
	}else if(action==='load'){
		coordinate=[parseInt(canvas.querySelector('.loadBtn.Loading').id.slice(7))*20];
	}else{
		coordinate=dataTree.find_Loc(canvas.querySelector('.node.active').id);
	}
	const response=await fetch('/locate',{
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(coordinate) 
		});
	if(response.ok){
		switch(action){
		case "append":
			await Sappend();
			console.log("Append Complete");
			break;
		case "delete":
			await Sdelete();
			console.log("delete Complete");
			break;
		case "display":
			await displayCont();
			break;
		case "load":
			await loadTree();
			break;
		case "submit":
			const NodeBefore=dataTree.nodeMap.get(canvas.querySelector('.node.active').id);
			if(NodeBefore.role==="user"){
				await sendToRouter_u();}else{
				await sendToRouter_a();}
			break;
		}
	}else {
      console.error('Server Error:', response.statusText);
    }
	document.querySelector("body>div").removeChild(overlayer);
	document.getElementById("subTreeAddBtn").checked=false;
}
async function displayCont(){
	const nodeTodisplay=dataTree.nodeMap.get(canvas.querySelector('.node.active').id);
	if(nodeTodisplay.beforeInit===true){
		const overlayer = document.createElement('div');
		overlayer.className = 'overlay';
		document.querySelector("body>div").appendChild(overlayer);
		const coordinate=dataTree.find_Loc(canvas.querySelector('.node.active').id);
		try{ 
			const response = await fetch('/display-node', {
            	method: 'POST', 
            	headers: {
               		'Content-Type': 'application/json' 
            	},
            	body: JSON.stringify(coordinate) 
        	});
			if(response.ok){
				const nodeData=JSON.parse(await response.text());
				nodeTodisplay.content=nodeData.content;
				nodeTodisplay.model=nodeData.model;
				nodeTodisplay.role=nodeData.role;
				nodeTodisplay.beforeInit=false;
			} else {
            console.error('Server Error:', response.statusText);
        	}
		}catch (error) {
        console.error('Request Failed:', error);
    	}
	document.querySelector("body>div").removeChild(overlayer);
	}
	Responsearea.innerHTML=marked.parse(nodeTodisplay.content);
	Responsemodel.textContent=`  From: ${nodeTodisplay.model}`;
}
async function sendToRouter_a() {
    const messageContent = messageTextArea.value;
	const modelName=document.getElementById('modelArea').value
    const dataToSend = {
        message: messageContent,
        timestamp: new Date().toISOString(),
		model: modelName,
		after: "a"
    };
	Responsearea.innerHTML="";
	let textbuffer="";
    try {
        const response = await fetch('/submit-data-a', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(dataToSend) 
        });

        if (response.ok) {
			const reader=response.body.getReader();
			const decoder=new TextDecoder();
			while(true){
			const {done,value}=await reader.read();
			if(done){
			console.log('Stream finished');
			break;}
			const textChunk=decoder.decode(value,{stream:true});
			textbuffer+=textChunk;
			Responsearea.innerHTML=marked.parse(textbuffer);
			}
			const usernode=new TreeNode(null);const botnode=new TreeNode(null);
			usernode.text=messageContent.slice(0,10);botnode.text=textbuffer.slice(0,10);
			usernode.content=messageContent;botnode.content=textbuffer;
			usernode.beforeInit=false;usernode.role="user";
			botnode.beforeInit=false;
			botnode.model=modelName;botnode.role="assistant";
			const parentID=canvas.querySelector('.node.active').id;
			dataTree.appendNode(parentID,usernode);
			dataTree.appendNode(usernode.id,botnode);
			canvasTree.elementMap.get(botnode.id).click();
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}
async function sendToRouter_u() {
    const NodetoSend = dataTree.nodeMap.get(canvas.querySelector('.node.active').id);
	if(NodetoSend.beforeInit===true)await displayCont();
	const modelName=document.getElementById('modelArea').value
    const dataToSend = {
        timestamp: new Date().toISOString(),
		model: modelName,
		after: "u",
		message:null
    };
	Responsearea.innerHTML="";
	let textbuffer="";
    try {
        const response = await fetch('/submit-data-u', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(dataToSend) 
        });

        if (response.ok) {
			const reader=response.body.getReader();
			const decoder=new TextDecoder();
			while(true){
			const {done,value}=await reader.read();
			if(done){
			console.log('Stream finished');
			break;}
			const textChunk=decoder.decode(value,{stream:true});
			textbuffer+=textChunk;
			Responsearea.innerHTML=marked.parse(textbuffer);
			}
			const botnode=new TreeNode(null);
			botnode.text=textbuffer.slice(0,10);
			botnode.content=textbuffer;
			botnode.model=modelName;botnode.role="assistant";
			botnode.beforeInit=false;
			const parentID=canvas.querySelector('.node.active').id;
			dataTree.appendNode(parentID,botnode);
			canvasTree.elementMap.get(botnode.id).click();
			
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}
async function saveJSON(){
  try {
		const overlayer = document.createElement('div');
		overlayer.className = 'overlay';
		document.querySelector("body>div").appendChild(overlayer);
        const response = await fetch('/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: '' 
        });

        if (response.ok) {
			console.log('Save complete');
			document.querySelector("body>div").removeChild(overlayer);
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}
async function loadTree(){
  try {
        const response = await fetch('/load-tree', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: '', 
        });

        if (response.ok) {
			const treeArray=JSON.parse(await response.text());
			dataTree.constructTree(treeArray,parseInt(canvas.querySelector('.loadBtn.Loading').id.slice(7)));
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}
async function LoadlastBlk(){
  try {
        const response = await fetch('/load-lastblc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: '', 
        });

        if (response.ok) {
			const treeArray=JSON.parse(await response.text());
			const maxblcID=treeArray[0];
			treeArray.shift();
			canvasTree.navitoBlcID(parseInt(maxblcID));
			dataTree.constructTree(treeArray,maxblcID);
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}
async function updateCont(){
	const nodeToupdate=dataTree.nodeMap.get(canvas.querySelector('.node.active').id);
	const messageContent = messageTextArea.value;
	if(messageContent!=="")nodeToupdate.content=messageContent;

}
async function updateMod(){
	const nodeToupdate=dataTree.nodeMap.get(canvas.querySelector('.node.active').id);
	const modelName=document.getElementById('modelArea').value
	if(modelName!=="")nodeToupdate.model=modelName;

}
const appendCont=document.getElementById('contentToAdd')
const appendModel=document.getElementById('modelToAdd')
const appendRole=document.getElementById('roleToAdd')
async function Sappend(){
	  if (appendRole.value===""){alert("the role of appended node needs to be specified!"); return;}
  try {
		const appendObj={
		role: appendRole.value,
		content: appendCont.value,
		model: appendModel.value,
		attachments:null
		}
        const response = await fetch('/append', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appendObj)
        });

        if (response.ok) {
			const node=new TreeNode(null);
			node.content=appendCont.value;
			node.text=appendCont.value.slice(0,10);
			node.role=appendRole.value;
			node.model=appendModel.value;
			node.beforeInit=false;
			if(document.getElementById("subTreeAddBtn").checked===false){
				const parentID=canvas.querySelector('.node.active').id;
				dataTree.appendNode(parentID,node);
				canvasTree.elementMap.get(node.id).click();
			}else{
				await LoadlastBlk();
				if(canvas.querySelector('.node.active')!==null){
				canvas.querySelector('.node.active').classList.remove('active');
				}
			}
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('request failed:', error);
    }
}

async function Sdelete(){
  try {
        const response = await fetch('/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: '' 
        });

        if (response.ok) {
			const nodeToDel=dataTree.nodeMap.get(canvas.querySelector('.node.active').id)
			if(nodeToDel.Pnode.id.split("_")[1]===0){
				let maxblcID=nodeToDel.Pnode.id.split("_")[0];
				dataTree.nodeMap.forEach((_v,key,_i)=>{
					if(parseInt(key.split("_")[0])>maxblcID)maxblcID=parseInt(key.split("_")[0]);
				})
				let lastSubTree;
				for(let i=maxblcID;i>parseInt(nodeToDel.Pnode.id.split("_")[0]);i--){
					if(dataTree.nodeMap.has(`${i}_0`)===true){
						if(lastSubTree!==null){
							dataTree.nodeMap.get(`${i}_0`).Cnode.push(lastSubTree);
							lastSubTree=dataTree.nodeMap.get(`${i}_0`).Cnode[0];
							dataTree.nodeMap.get(`${i}_0`).Cnode.shift();
							dataTree.constructTree_obj(`${i}_0`);
							}else if(lastSubTree===null){
							lastSubTree=dataTree.nodeMap.get(`${i}_0`).Cnode[0];
							await loadBlock(i);}
					}else if(dataTree.nodeMap.has(`${i}_0`)===false){
						lastSubTree=null;
					}
				}
				
			}
			dataTree.deleteNode(nodeToDel.id);
        } else {
            console.error('Server Error:', response.statusText);
        }
    } catch (error) {
        console.error('Request Failed:', error);
    }
	
}
function checkExpOrFold(){
	const expandBtn=document.querySelector("#expand\\&fold");
	if(document.querySelector("#addArea").style.display==="none"){
		document.querySelector("#addArea").style.display="block";
		expandBtn.textContent=">>";
	}else if(document.querySelector("#addArea").style.display==="block"){
		document.querySelector("#addArea").style.display="none";
		expandBtn.textContent="<<";
	}
}