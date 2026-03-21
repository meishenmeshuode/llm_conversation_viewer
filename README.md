# LLM Openrouter Conversation Viewer

This is a Openrouter API used, node-structured WebUI tool serves as a conversations reader of llm(large language model), aiming to make user's managing, reviewing&messaging operation easier and more intuitive.

### Key Feature

- **Capable of remote access**: you can connect to viewer from any device as long as it support a modern brower and your local server is running.
- **Free branching**: User can freely branching,deleting,continuing an existing conversation, thus save your precious credit token.
- **Optimized fetching**: In frontend, A more traffic-frendly loading strategy is picked: Instead of loading all history data at once, user can drag&click on visual Nodemenu to choose the blocks they wanna fetch from the server.
- **Core mechanism**: this program creates a nodejs process for request handling and another python process for data store&Openrouter requests, Another terminal emulator process will be created too. The communicating mechanism between nodejs and python process is based on this terminal process.

### Screenshots
<img width="1103" height="913" alt="example" src="https://github.com/user-attachments/assets/a2eb5e95-100b-42b4-a226-4af667f9c4f7" />
### Installation

Installation of Nodejs and Python is required

- After cloning this repository, set the password to enter your viewer(locate in `serverReqhandle.js`) or set it as environment variable as `VIEWER_PASSWORD`
- Put the API key in your openrouter in  `python/serverDataprocess.py` or set it as environment variable as `OPENROUTER_API`
- Run the `server.ps1`.
- After the server lauched, navigate to the listening address(the default is `http://localhost:3000`) in your browser.
- You can set up an IP tunnel or using domain service to host your local on public address.

### On progress

- combinate conversations
- integrate into my node notebook
- refine mobile control

---

这是一个使用Openrouter API的节点式图形化WebUI大语言模型对话查看器, 开发目的主要是希望在操作查看大量的大模型对话时能够更加方便直观。

### 主要特点

- **远端访问** 在本地设立服务器后可以通过远程设备的浏览器访问
- **自由分支** 能对存储的任意对话进行分支，删除等操作
- **块式加载** 为避免每一次启动客户端都需要从服务器接收全部对话的繁琐，现在能直接在图形界面上拖动选择所需要向服务器请求的部分
- **主要机制** 通过一个伪终端进程实现nodejs进程与python进程间的通信，协同了请求处理与数据处理

### 截屏展示
<img width="1103" height="913" alt="example" src="https://github.com/user-attachments/assets/a2eb5e95-100b-42b4-a226-4af667f9c4f7" />
### 使用方法

需要先安装nodejs与python

- 将代码clone到本地后，先在`serverReqhandle.js`里输入你想要访问查看器时需要输入的密码或者设置为环境变量`VIEWER_PASSWORD`
- 在 `python/serverDataprocess.py` 里输入你的Openrouter API Key或者设置为环境变量`OPENROUTER_API`
- 运行根目录的`server.ps1`。
- 在服务器成功运行后，在你的浏览器里访问监听地址（默认是`http://localhost:3000`）
- 你可以建立IP tunneling 或者之间在公网设立你的服务器，这样就可以在任何能联网的设备上使用这个查看器。

