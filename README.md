# LLM Openrouter Conversation Viewer

This is a Openrouter API used conversations llm(large language model) reader tool with a node flow-chart webUI, aiming to make user's managing, reviewing&messaging operation easier and more intuitive. This gives a huge advantage over other regular chat UI when you want to have a light weight but massive operations such as switching back and forth or opening multiple branches on one parent node.

### Key Feature

- **Capable of remote access**: you can connect to viewer from any device as long as it support a modern brower and your local server is running.
- **Free branching**: User can freely branching,deleting,continuing an existing conversation, thus save your precious credit token.
- **Optimized fetching**: In frontend, A more traffic-frendly loading strategy is picked: Instead of loading all history data at once, user can drag&click on visual Nodemenu to choose the blocks they wanna fetch from the server.
- **backend&transmission optimization**: Correspondingly, the server will only took the activated conversations into memory synced to client, which only send requests to server when it is required to(i.e. need to call openrouter API), smoothing the experience as possible.

### Demonstration
Login & View node

Manually append node

Send message to model


Installation Python is required

- After cloning this repository,Put the password to enter your viewer and API key of your openrouter in  `serverDataprocess.py` or set as environment variable as `OPENROUTER_API` `VIEWER_PASSWORD` respectively.
- Run `pip install -r requirements.txt;fastapi dev .\serverDataprocess.py`.
- After the server lauched, navigate to the listening address(the default is `http://localhost:8000`) in your browser.
- You can set up an IP tunnel or using domain service to host your local on public address.

### On progress

---

这是一个使用Openrouter API的流程节点图形式的WebUI的大语言模型对话查看器, 开发目的主要是希望在操作查看大量的大模型对话时能够更加方便直观。

### 主要特点

- **远端访问** 在本地设立服务器后可以通过远程设备的浏览器访问
- **自由分支** 能对存储的任意对话进行分支，删除等操作
- **块式加载** 为避免每一次启动客户端都需要从服务器接收全部对话的繁琐，现在能直接在图形界面上拖动选择所需要向服务器请求的部分
- **性能优化** 客户端只在必要时向服务器发送请求，提升操作流畅性；对话数据根据活跃块动态加载进入内存，减少负担。

### 展示
登录&展示节点

手动添加节点

发送消息


需要先安装python

- 将代码clone到本地
- 在 `serverDataprocess.py` 里，输入你访问查看器时需要输入的密码或者设置为环境变量`VIEWER_PASSWORD`
- 输入你的Openrouter API Key或者设置为环境变量`OPENROUTER_API`
- 运行`pip install -r requirements.txt;fastapi dev .\serverDataprocess.py`。
- 在服务器成功运行后，在你的浏览器里访问监听地址（默认是`http://localhost:8000`）
- 你可以建立IP tunneling 或者之间在公网设立你的服务器，这样就可以在任何能联网的设备上使用这个查看器。

