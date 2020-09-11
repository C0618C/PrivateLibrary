const fs = require("fs");
const Cache = require("./novel/cache").Cache;

let DirToMake = [
    Cache.SOLUTION_DIR_PATH,                    //工程目录
    process.cwd() + "/book",                    //输出的PDF目录
    Cache.FONT_DIR_PATH,                        //打印PDF时可选的字体存放目录
    Cache.NOVEL_DOWNLOAD_PATH,                  //小说下载的目录
    Cache.TEMP_FILE_PATH                        //网页缓存的目录——可以清空清理
]
DirToMake.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log("创建必要的运行目录：", dir);
        fs.mkdirSync(dir);
    }
})

if (!Cache.CheckFile(Cache.RULE_FILE_PATH)) {
    console.log("创建规则配置：", Cache.RULE_FILE_PATH)
    fs.writeFileSync(Cache.RULE_FILE_PATH, "{}");
}
if (!Cache.CheckFile(Cache.SOLUTION_FILE_PATH)) {
    console.log("创建书库记录文件：", Cache.SOLUTION_FILE_PATH)
    fs.writeFileSync(Cache.SOLUTION_FILE_PATH, "[]");
}
if (!Cache.CheckFile(Cache.PROOFREAD_RULE_PATH)) {
    console.log("创建校阅规则文件：", Cache.PROOFREAD_RULE_PATH)
    fs.writeFileSync(Cache.PROOFREAD_RULE_PATH, "{}");
}



console.warn("运行环境初始化完成！！可用 node start.js 运行程序。");