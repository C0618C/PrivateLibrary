const Solution = new (require("./solution").Solution)();
let servers = require("../server").servers;
let Loader = require("./loader").Load(Solution, servers);
let setting = require("./setting");


console.log("index.js")
exports.Novel = {
    Solution: Solution,
    Loader: Loader,
    SettingManager:setting
};

