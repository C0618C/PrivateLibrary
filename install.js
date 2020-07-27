const fs = require("fs");
const Cache = require("./novel/cache").Cache;

let DirToMake = [
    process.cwd() + "/.sln",
    process.cwd() + "/download",
    process.cwd() + "/download/temp"
]
DirToMake.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log("创建下载文件及临时目录", dir);
        fs.mkdirSync(dir);
    }
})

if (!Cache.CheckFile(Cache.RULE_FILE_PATH)) {
    console.log("创建规则配置：", Cache.RULE_FILE_PATH)
    fs.writeFileSync(Cache.RULE_FILE_PATH, "{}");
}
if (!Cache.CheckFile(Cache.SOLUTION_FILE_PATH)) {
    console.log("创建书库记录文件：", Cache.SOLUTION_FILE_PATH)
    fs.mkdirSync(Cache.SOLUTION_FILE_PATH.substr(0, Cache.SOLUTION_FILE_PATH.lastIndexOf("/")));
    fs.writeFileSync(Cache.SOLUTION_FILE_PATH, "[]");
}



console.warn("运行环境初始化完成！！，可用 node start.js 运行程序。");