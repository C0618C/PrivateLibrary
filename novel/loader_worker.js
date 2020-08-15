const {
    isMainThread, parentPort, workerData, threadId,
    MessageChannel, MessagePort, Worker
} = require('worker_threads');
const cheerio = require('cheerio');     //通过类似jquery的形式解释html源码

const { GetTextByURL } = require("../dlfromurl");
const { ChangeRule, GetRule, GetHost } = require("./loader_rule");
const { Cache } = require("./cache");
const { QS_GetValueBySetting } = require("./analyzer")


try {

    if (isMainThread) process.exit();
    // console.log(`[线程${threadId}]准备就绪！！！`);
    let runOnecTime = (setting, isNeedWait, isTryAgain) => {
        setting.isok = !isTryAgain;

        if (setting.isok) console.log(`[线程${threadId}]完成任务:\t`, setting.cpStting.title)

        parentPort.postMessage(setting);
    }
    parentPort.on('message', msg => {
        if (msg.isFinish) { process.exit(); }
        LoadAndCacheTheWeb(msg, runOnecTime);
    });

    if (workerData.isinit) {
        parentPort.postMessage({ initOk: true });
        // console.log(`[线程${threadId}]初始化完成`);
        return;
    }
} catch (err) {
    console.error(`[线程${threadId}]出错:`, err);
}



/**
  * 单篇文章下载器
  * @param {*} setting 
  * @param {function(setting,isNeedWait,isTryAgain)} callback 进入下一轮的定时器
  */
function LoadAndCacheTheWeb(setting, callback) {
    // console.log(`[线程${threadId}]开始任务：`, setting);

    let savedCpSetting = setting.savedCpSetting;
    if (savedCpSetting == null) {
        savedCpSetting = setting.cpStting;
    }
    let novel = setting.novel;

    let dir = Cache.GetNovelCachePath(novel.title) + "/";
    let host = novel.host;
    let rule = GetRule(host);

    //查到缓存记录，跳过
    if (savedCpSetting.file && Cache.CheckFile(dir + savedCpSetting.file) && setting.cpStting.reload !== true) {
        //console.log("当前文件已缓存", savedCpSetting);
        setting.file = savedCpSetting.file;
        callback?.(setting, false);
        return;
    }

    //解释小说，提取正文
    GetTextByURL(/^https?/.test(savedCpSetting.url) ? savedCpSetting.url : host + savedCpSetting.url, rule.encoding, (text, err) => {
        if (err || text == null) {
            callback?.(setting, true, true);//出错了 就等等再重启下载
            return;
        }
        let content = ParseContentPage(text, rule.content_page);

        //保存到文件
        let fileName = setting.NewCpID + ".txt";
        setting.file = fileName;
        let cachePath = dir + fileName;
        Cache.SaveChapter(cachePath, content);

        callback?.(setting, true);
    }, !setting.cpStting.reload);
}


/**
 * 解释小说正文逻辑
 * @param {*} text 网页源码
 * @param {*} rule 规则
 */
function ParseContentPage(text, rule) {
    let content;
    try {
        if (rule.type == "querySelector" || rule.type == undefined) {
            $ = cheerio.load(text);
            let title = QS_GetValueBySetting($(rule.title.selector), rule.title.text);
            content = QS_GetValueBySetting($(rule.content.selector), rule.content.text);

            content = title + "\n" + content + "\n\n";
        }
    } catch (err) {
        console.error("分析文章有内容时出错：", err);
        console.warn("出错的文章正文", text);
    }

    return content;
}

