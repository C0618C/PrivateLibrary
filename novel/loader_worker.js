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

    let err_retry_time = 0;

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

    /**
     * 分析正文第一页
     * @param {*} text 
     * @param {*} err 
     */
    function _parseContext(text, err) {
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

        //存在下一页
        //console.log(JSON.stringify(rule))
        if (rule.content_page.next_page) {
            let url = GetNextPage(text, rule.content_page.next_page);
            GetTextByURL(GetRealURL(url, host), rule.encoding, _parseContext_next, !setting.cpStting.reload);
        }

        callback?.(setting, true);
    }

    /**
     * 分析正文第二页等
     * @param {*} text 
     * @param {*} err 
     */
    function _parseContext_next(text, err) {
        if (err || text == null) {
            //重试本次下载
            err_retry_time++;
            if (err_retry_time >= 10)
                return callback?.(setting, true, true);//出错了 就等等再重启下载;

            //TODO:立即重试
        }
        let content = ParseContentPage(text, rule.content_page);

        //保存到第一章的文件后面
        let fileName = setting.NewCpID + ".txt";
        setting.file = fileName;
        let cachePath = dir + fileName;
        Cache.SaveChapter(cachePath, content);

        //存在下一页
        //console.log(JSON.stringify(rule))
        if (rule.content_page.next_page) {
            let url = GetNextPage(text, rule.content_page.next_page);
            GetTextByURL(GetRealURL(url, host), rule.encoding, _parseContext_next, !setting.cpStting.reload);
        }

        //callback?.(setting, true);
    }


    //解释小说，提取正文
    GetTextByURL(GetRealURL(savedCpSetting.url, host), rule.encoding, _parseContext, !setting.cpStting.reload);
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

function GetNextPage(text, rule) {
    let url;
    try {
        if (rule.type == "querySelector" || rule.type == undefined) {
            $ = cheerio.load(text);
            // let title = QS_GetValueBySetting($(rule.title.selector), rule.title.text);
            // content = QS_GetValueBySetting($(rule.content.selector), rule.content.text);

            url = QS_GetValueBySetting($(rule.selector), rule.url);

        }
    } catch (err) {
        console.error("分析文章有内容的下一页地址时出错：", err);
        console.warn("出错的文章正文", text);
    }

    return url;
}

function GetRealURL(url, host) {
    return /^https?/.test(url) ? url : host + url;
}
