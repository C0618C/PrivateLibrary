const Solution = new (require("./solution").Solution)();
let servers = require("../server").servers;
let Loader = require("./loader").Load(Solution, servers);


console.log("index.js")
exports.Novel = {
    Solution: Solution,
    Loader: Loader
};

