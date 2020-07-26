const Http = require("http");
const Socket = require("socket.io");
const Express = require("express");
const Router = require("./router");
const Cache = require("./novel/cache")


//初始化服务器
let webServer = Express();
let httpServer = Http.createServer(webServer);
let socketServer = Socket(httpServer);
let servers = { webServer, httpServer, socketServer, fileServer: Cache.Cache };



//设置路由
exports.InitRouter = (Novel) => {
    Router.Init(servers, Novel);
    socketServer.on('connection', (socket) => {
        Router.socketApi(socket, socketServer, Novel);
    });
}


httpServer.listen(8899, (...x) => { console.log("已启动服务，请访问 http://localhost:8899", ...x) });

console.log("server.js")
exports.servers = servers;

