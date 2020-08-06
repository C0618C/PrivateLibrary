const servers = require("./server");

const Novel = require("./novel").Novel;

servers.InitRouter(Novel);
servers.InitMailServer(Novel.SettingManager.kindle.get());

console.log("所有服务已启动。")