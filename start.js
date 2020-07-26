const servers = require("./server");

const Novel = require("./novel").Novel;

servers.InitRouter(Novel);

console.log("所有服务已启动。")