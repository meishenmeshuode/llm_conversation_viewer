from typing import Annotated,Any
from fastapi import Cookie,FastAPI,Response,status,Request,Form,Body
from fastapi.responses import HTMLResponse,RedirectResponse,FileResponse,StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from collections.abc import AsyncIterable, Iterable
import json
import requests
import sys
import re
import os
import time
import asyncio 
import uuid

lock=asyncio.Lock()
openRouterurl = "https://openrouter.ai/api/v1/chat/completions"
api_key=os.getenv('OPENROUTER_API', default='')#PUT_YOUR_OPENROUTER_API_KEY_HERE_OR_SET_AN_ENVIRONMENT_VARIABLE
CORRECT_PASSWORD = os.getenv('VIEWER_PASSWORD', default='')#PUT_YOUR_PASSWORD_TO_VIEWER_HERE_OR_SET_AN_ENVIRONMENT_VARIABLE
SESSION_ID=uuid.uuid4().hex
headers = {
    "Authorization": "Bearer "+api_key,
    "Content-Type": "application/json"
}

class SRsendMessage(BaseModel):
    message:str|None
    model:str
class SRnode(BaseModel):
    content:str
    role:str
    model:str|None=''
app= FastAPI(redirect_slashes=False)
app.mount("/public",StaticFiles(directory="public",html=True),name="public")     
@app.middleware("http")
async def session_check(request: Request,call_next):
    if request.url.path=="/" or request.url.path=="/docs" or "/login" in request.url.path or "/public/" in request.url.path:
        response= await call_next(request)
        return response
    if request.cookies["lcv_session_ID"]!=None:
        if request.cookies["lcv_session_ID"]!=SESSION_ID:
            return RedirectResponse(url="/?error=1")
        else:
            response= await call_next(request)
            return response
    else: 
        return RedirectResponse(url="/")
@app.get('/')
async def SRsendloginHTML():
    async with lock:
        response=RedirectResponse(url="/public/login.html")
    return response

@app.post("/login", response_class=HTMLResponse)
async def SRlogin(password:Annotated[str,Form()]=''):
    async with lock:
        if password== CORRECT_PASSWORD:
            response=RedirectResponse(url="/viewer",status_code=status.HTTP_302_FOUND)
            response.set_cookie(key="lcv_session_ID",
            value=SESSION_ID)
            return response
        else:
            response=RedirectResponse(url="/?error=1")
            return response
@app.get('/logout')
async def SRlogout():
    async with lock:
        response=RedirectResponse(url="/")
        response.delete_cookie("lcv_session_ID")
        return response        
@app.get('/viewer',response_class=FileResponse)
async def SRviewer():
    async with lock: 
        return FileResponse("client.html")
@app.post('/submit-data-a',response_class=StreamingResponse)
async def SRsubmita(b:Annotated[SRsendMessage,Body()])-> AsyncIterable[str]:
    async with lock:
        for chunk in send_message(ll,b.message,b.model,openRouterurl,headers):
            yield chunk
@app.post('/submit-data-u',response_class=StreamingResponse)
async def SRsubmitu(b:Annotated[SRsendMessage,Body()])-> AsyncIterable[str]:
    async with lock:
        for chunk in send_message_u(ll,b.model,openRouterurl,headers):
            yield chunk
@app.post('/append')
async def SRappend(node:Annotated[SRnode,Body()]):
    async with lock:  
        appendnode(node.content,node.role,node.model,ll)
        return Response(status_code=201)
@app.post('/delete')
async def SRdelete():
    async with lock: 
        deletenode(ll)
        return Response(status_code=200)
@app.post('/save-data')
async def SRsave():
    async with lock:
        saveSubtrees(ll)
        return Response(status_code=200)
@app.post('/load-tree')
async def SRload(response:Response):
    async with lock:
        response.headers['Content-Type']='text/plain;charset=utf-8'
        return transmitTree(ll)
@app.post('/load-lastblc')
async def SRloadlast(response:Response):
    async with lock: 
        response.headers['Content-Type']='text/plain;charset=utf-8'
        return transmitTree_lastBlc(ll)
@app.post('/locate')
async def SRlocate(Nodecoordinate:list[Any]=[]):#pydantic will automatically parse complex type from body
    async with lock: 
        print(Nodecoordinate)
        ll.locate(Nodecoordinate)
        return Response(status_code=200)
@app.post('/display-node')
async def SRdisply(response:Response):
    async with lock: 
        response.headers['Content-Type']='text/plain;charset=utf-8'
        return transCont(ll.selectedNode)
@app.post('/search')
async def SRsearch():
    async with lock:
        return
def saveSubtrees(llist):
    try:
        filtered_list = [item for item in llist.head.c_node if item is not None]
        for subTree in filtered_list:
            subTreeID=subTree.data['subTreeID']
            filename="subtrees/subTreeID"+str(subTreeID)+".json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(subTree, f,indent=4,ensure_ascii=False,cls=CustomEncoder)
            print(f"subTree{subTreeID} successfully saved into {filename}")
        print("FINISH_SIGNAL")
    except IOError as e:
        print(f"Error:cannot write into {filename} {e}")
        print("FINISH_SIGNAL")
def savetoJSON(llist,filename):
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(llist, f,indent=4,ensure_ascii=False,cls=CustomEncoder) 
        print(f"subTree successfully saved into {filename}")
        print("FINISH_SIGNAL")
    except IOError as e:
        print(f"Error:cannot write into {filename} {e}")
        print("FINISH_SIGNAL")
def loadfromJSON(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f, object_hook=custom_decoder_hook)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error: Cannot load subTree from {filename} {e}")
        return None
def appendnode(content,role,model,llist):
    llist.node_append(content,role,model,None)
    print("FINISH_SIGNAL") 
def deletenode(llist):
    llist.node_delete()
    print("FINISH_SIGNAL")
def iterate_word():
    text=open("subtrees/template_answer").read()
    for word in text.split():
        outputword=word+" "
        yield outputword
def send_message(llist,message,modelname,url,headers):
    
    contentstring=""
    messagestosend=[]
    contentlist=llist.traverse_back()
    for i in contentlist:
        messagestosend.insert(0,i)
    lastmessage={
    "role":"user",
    "content":message,
    "model":modelname,
    "attachments":None
    }
    messagestosend.append(lastmessage)
    if modelname=='testmodel':
        for word in iterate_word():
            time.sleep(0.1)
            contentstring+=word
            yield word 
    else:
        payload = {
            "model": modelname,
            "messages": messagestosend,
            "stream": True
        }
        buffer = ""

        with requests.post(url, headers=headers, json=payload, stream=True) as r:
            r.encoding='utf-8'
            for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
                buffer += chunk
                while True:
                    try:
                        # Find the next complete SSE line
                        line_end = buffer.find('\n')
                        if line_end == -1:
                            break
                        line = buffer[:line_end].strip()
                        buffer = buffer[line_end + 1:]
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                break
                            try:
                                data_obj = json.loads(data)
                                content = data_obj["choices"][0]["delta"].get("content")
                                if content:
                                    yield content
                                    contentstring+=content
                            except json.JSONDecodeError:
                                pass
                    except Exception:
                        print(Exception)
                        break
           
    print()
    print("FINISH_SIGNAL")
    llist.node_append(message,"user","userINPUT",None)
    llist.node_append(contentstring,'assistant',modelname,None)
    #print('contentstring:'+contentstring)
def send_message_u(llist,modelname,url,headers):

    contentstring=""
    messagestosend=[]
    contentlist=llist.traverse_back()
    for i in contentlist:
        messagestosend.insert(0,i)
    if modelname=='testmodel':
        for word in iterate_word():##automating next()
            time.sleep(0.1)
            contentstring+=word
            yield word 
    else:
        payload = {
            "model": modelname,
            "messages": messagestosend,
            "stream": True
        }
        buffer = ""
        with requests.post(url, headers=headers, json=payload, stream=True) as r:
            r.encoding='utf-8'
            for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
                buffer += chunk
                while True:
                    try:
                        # Find the next complete SSE line
                        line_end = buffer.find('\n')
                        if line_end == -1:
                            break
                        line = buffer[:line_end].strip()
                        buffer = buffer[line_end + 1:]
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                break
                            try:
                                data_obj = json.loads(data)
                                content = data_obj["choices"][0]["delta"].get("content")
                                if content:
                                    yield content  
                                    contentstring+=content
                            except json.JSONDecodeError:
                                pass
                    except Exception:
                        print(Exception)
                        return
           
    print("FINISH_SIGNAL")
    llist.node_append(contentstring,'assistant',modelname,None)
def transmitTree(linkedlist):
    LinkedList.arrayTree=[]
    linkedlist.getarrayTree(linkedlist.head)
    return LinkedList.arrayTree
    print("FINISH_SIGNAL")
def transmitTree_lastBlc(linkedlist):
    LinkedList.arrayTree=[]
    filtered_list = [item for item in linkedlist.head.c_node if item is not None]
    MaxsubTreeID=linkedlist.head.c_node[len(filtered_list)-1].data['subTreeID']
    Maxname='subtrees/subTreeID'+str(MaxsubTreeID)+".json"
    while os.path.exists(Maxname):
        MaxsubTreeID=MaxsubTreeID+1
        Maxname='subtrees/subTreeID'+str(MaxsubTreeID)+".json"
    MaxsubTreeID=MaxsubTreeID-1
    lastblcID=int((MaxsubTreeID-MaxsubTreeID%20)/20)
    linkedlist.loadBlock(lastblcID)
    linkedlist.getarrayTree(linkedlist.head);
    LinkedList.arrayTree.insert(0,lastblcID)
    return LinkedList.arrayTree
    print("FINISH_SIGNAL")
def transCont(selectedNode):
    return selectedNode.data
    print("FINISH_SIGNAL")
def custom_decoder_hook(dct):
    if "__type__" in dct:
        if dct["__type__"] == "Node":

            new_node=Node(dct["data"]["role"],dct["data"]["content"],dct["data"]["model"],None)
            new_node.c_node=dct["c_node"]
            for item in new_node.c_node:
                item.p_node=new_node
            return new_node
    return dct

class CustomEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Node):
            return o.to_dict()
        if isinstance(o, TransNode):
            return o.to_dict()
        return super().default(o)    

class Node:

    def __init__(self,role,content,model,attachments):
        self.data={}
        self.data['role'] = role
        self.data['content'] = content
        self.data['model'] = model 
        self.data['attachments'] = attachments 
        self.data['subTreeID'] = None
        self.p_node = None 
        self.c_node = []
    def copy_n(self,node):
        self=node
    def display_self(self):
        print(self.data)
    def display_children(self):
        elements = []
        for i in self.c_node:
            elements.append(i.data)
        print(str(elements))
    def to_dict(self):
        return{
        '__type__': "Node",
        'data': {
            'role':self.data['role'],
            'content':self.data['content'],
            'model':self.data['model']
            },
        'c_node': self.c_node
        }
class TransNode:
    def __init__(self,text):
        self.t=text
        self.c=[]
    def to_dict(self):
        return{
        't':self.t,
        'c':self.c
        }

class LinkedList:
    arrayTree=[]
    Roledict={"system":"S","user":"U","assistant":"A"}
    def __init__(self):
        self.head = None
        self.subTreeset=set([])
        self.selectedNode=None
    def is_empty(self):
        return self.head is None
        
    def traverse_back(self):
        messages=[]
        temp_n=self.selectedNode
        while temp_n.p_node:
            messages.append(temp_n.data)
            temp_n = temp_n.p_node
        return messages
        
    def node_append(self,content,role,model,attachments):
        if self.selectedNode is not self.head:
            new_node = Node(role,content,model,None)
            if self.is_empty():
                self.head = new_node
                return
            
            new_node.p_node=self.selectedNode
            self.selectedNode.c_node.append(new_node)
            self.selectedNode=new_node               
        else:            
            filtered_list = [item for item in self.selectedNode.c_node if item is not None]
            subTreeIDtoadd=0
            Maxname='subtrees/subTreeID'+str(subTreeIDtoadd)+".json"
            while os.path.exists(Maxname):
                subTreeIDtoadd=subTreeIDtoadd+1
                Maxname='subtrees/subTreeID'+str(subTreeIDtoadd)+".json"
            new_node = Node(role,content,model,None)
            new_node.data['subTreeID']=subTreeIDtoadd
            with open(Maxname,"w", encoding='utf-8') as file:
                json.dump(new_node,file,ensure_ascii=False,cls=CustomEncoder)
                file.flush()
            if self.selectedNode.c_node[subTreeIDtoadd%20] is None:
                self.loadSubtree(subTreeIDtoadd)
                self.subTreeset.add(subTreeIDtoadd)
    def node_delete(self):
        if self.selectedNode.data['subTreeID'] is None:
            self.selectedNode.p_node.c_node.remove(self.selectedNode)
            self.selectedNode=self.selectedNode.p_node
        else:
            subTreeIDtodel=self.selectedNode.data['subTreeID']
            filtered_list = [item for item in self.selectedNode.p_node.c_node if item is not None]
            for i in range(len(filtered_list)):
                if self.selectedNode.p_node.c_node[i].data['subTreeID']>subTreeIDtodel:
                   self.selectedNode.p_node.c_node[i-1]=self.selectedNode.p_node.c_node[i]
                   self.selectedNode.p_node.c_node[i-1].data['subTreeID']=self.selectedNode.p_node.c_node[i-1].data['subTreeID']-1
            filename='subtrees/subTreeID'+str(subTreeIDtodel)+".json"
            os.remove(filename)
            subTreeIDtodel=subTreeIDtodel+1
            filename='subtrees/subTreeID'+str(subTreeIDtodel)+".json"
            while os.path.exists(filename):
                os.rename(filename,'subtrees/subTreeID'+str(subTreeIDtodel-1)+".json")
                subTreeIDtodel=subTreeIDtodel+1
                filename='subtrees/subTreeID'+str(subTreeIDtodel)+".json"
            maxSubtreeID=max(self.subTreeset)
            self.subTreeset.remove(maxSubtreeID)
            self.selectedNode.p_node.c_node[len(filtered_list)-1]=None
            self.loadSubtree(maxSubtreeID)#try to load last subtree
            self.selectedNode=self.selectedNode.p_node
    def search(self, data):
        current_node = self.head
        while current_node: 
            if current_node.data == data:
                return True
            current_node = current_node.c_node
        return False
    def getarrayTree(self,node):
        textTOappend=LinkedList.Roledict[node.data["role"]]+node.data['content'][:20]
        LinkedList.arrayTree.append(textTOappend)
        for i in range(len(node.c_node)):
            if node.c_node[i] is not None:
                self.getarrayTree(node.c_node[i])
        if type(LinkedList.arrayTree[len(LinkedList.arrayTree)-1]) is int:
            LinkedList.arrayTree[len(LinkedList.arrayTree)-1]+=1
        else:
             LinkedList.arrayTree.append(1)
    def getnodeTree(self,node):
        new_node=TransNode(node.data['content'][:20])
        for child in node.c_node:
            if child is not None:
                new_node.c.append(self.getnodeTree(child))
        return new_node
    def locate(self,coordinate):
        locatedNode=self.head
        if len(coordinate)>0:
            if coordinate[0] not in self.subTreeset:
                blockID=int((coordinate[0]-coordinate[0]%20)/20)
                self.loadBlock(blockID)
            locatedNode=locatedNode.c_node[coordinate[0]%20]
            for i in coordinate[1:]:
                locatedNode=locatedNode.c_node[i]
        self.selectedNode=locatedNode
        print("FINISH_SIGNAL")
    def loadBlock(self,blcID):
        for i in range(blcID*20,blcID*20+19):
            self.loadSubtree(i)
    def loadSubtree(self,Treeid):
        if Treeid not in self.subTreeset:
            cInd=Treeid%20
            try:
                if self.head.c_node[cInd] is not None:
                    replacedID=self.head.c_node[cInd].data['subTreeID']
                    filename="subtrees/subTreeID"+str(replacedID)+".json"
                    with open(filename, 'w', encoding='utf-8') as f:
                        json.dump(self.head.c_node[cInd], f,indent=4,ensure_ascii=False,cls=CustomEncoder)
                    self.subTreeset.remove(replacedID)
                    print(f"subTree successfully saved into {filename}")
            except IOError as e:
                print(f"Error:cannot write into {filename} {e}")
            try:
                filename="subtrees/subTreeID"+str(Treeid)+".json"
                if os.path.exists(filename):
                    with open(filename, 'r', encoding='utf-8') as f:
                        self.head.c_node[cInd]=json.load(f, object_hook=custom_decoder_hook)
                    self.head.c_node[cInd].data['subTreeID']=Treeid
                    self.head.c_node[cInd].p_node=self.head
                    self.subTreeset.add(Treeid)
                else:
                    self.head.c_node[cInd]=None
            except (IOError, json.JSONDecodeError) as e:
                print(f"Error: Cannot load subTree from {filename} {e}")
                return None
      
   
ll = LinkedList()
##ll.node_append(None,"initial","user",None)
ll.head=Node("system","INITIAL_NODE",None,None)
ll.selectedNode=ll.head
for i in range(20):
    ll.head.c_node.append(None)
ll.loadBlock(0)

