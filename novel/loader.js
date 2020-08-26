const fs = require('fs');             //
const cheerio = require('cheerio');     //通过类似jquery的形式解释html源码

const { pipeline } = require('stream');
const {
    isMainThread, parentPort, workerData, threadId,
    MessageChannel, MessagePort, Worker
} = require('worker_threads');

const { Cache } = require("./cache");
const PDFCreater = require("./pdf");
const { GetTextByURL, GetTempPathByUrl } = require("../dlfromurl");
const { ChangeRule, GetRule, GetHost } = require("./loader_rule");
const { QS_GetValueBySetting } = require("./analyzer")

let Solution;
let Servers;

const threads_num = 10;     //同时开多少线程在爬


function Init(solution, ss) {
    Solution = solution;
    Solution.loader = LoadNovelIndex;
    Servers = ss;

    return { LoadNovelIndex, DownloadNovel, DownLoadOneChapter, ChangeRule };
}

/**
 * 获取小说的目录
 * @param {*} url 
 * @param {function (id,novel,err)} callback 完成后的回调函数
 * @param {*} useCache 是否重新下载
 */
function LoadNovelIndex(url, callback, useCache = true) {
    //先尝试在工程里找
    let novel = Solution.GetItemByUrl(url);
    if (!novel || !useCache) {
        //载入远端数据
        //加载规则
        let host = GetHost(url);
        let rule = GetRule(url);
        let path = url.substr(url.indexOf(host) + host.length);

        if (!rule) return callback(null, null, "请配置网站的采集规则 " + host);

        //载入目录页
        GetTextByURL(url, rule.encoding, (text, err) => {
            if (err || text == null) {
                //let msg = { done: jobDoneCount, count: dwChapterCount, url: curChapterSetting.url, isok: false };
                //Servers.socketServer.emit("Novel/Downloading", novel.id, msg);           //通知出错了
                //callback(true, true);//出错了 就等等再重启下载
                console.error("抓目录失败了：", err.message);
                return;
            }

            //结果缓存进工程
            let n = ParseIndexPage(text, rule.index_page, path);
            let isStop = false;             //是否停更
            let hasUpdate = true;          //是否有更新

            //跟原来缓存进度合并
            if (Cache.CheckFile(Cache.GetNovelCacheSetting(n.title))) {//先检查原来项目是否存在
                let oldIndex = JSON.parse(Cache.GetNovelIndex(n.title));
                n.chapters.forEach(cp => {
                    let oldChapter = GetIndexSetting(cp, oldIndex);
                    if (oldChapter) Object.assign(cp, oldChapter);
                });
                if (oldIndex.chapters.length == n.chapters.length) {
                    hasUpdate = false;
                    let curTime = new Date().getTime();
                    if (curTime - oldIndex.time > 432000000) {//5天，超过5天判断为停更
                        n.time = oldIndex.time;
                        n.isStop = isStop = true;
                    }
                }
            }

            //更新书籍信息
            let id = Solution.AddNewItem({ url, title: n.title, count: n.chapters.length, isStop, hasUpdate }, true);

            //更新书籍详细目录信息
            n.id = id;
            n.url = url;
            n.host = host;

            //缓存章节列表
            Cache.CacheIndex(n);

            callback(id, n);
        }, useCache);

    }

    let id = novel && novel.id;
    if (id && useCache) callback(id);
    return id;
}


//下载指定小说文章
function DownloadNovel(novel) {
    // let dir = Cache.GetNovelCachePath(novel.title) + "/";
    console.log("开始爬：", novel);

    let chapters = novel.chapters;              //在排队的章节队列
    let host = novel.host;
    let rule = GetRule(host);
    let curIndex = JSON.parse(Cache.GetNovelIndex(novel.title));

    if (chapters.length == 0 || !host || !rule) {
        console.error("抓取书籍文本失败，相关信息不全！", chapters, host, rule);
        return;
    }

    if (novel.printPdf && !PDFCreater.CheckSetting()) {
        console.error("启用了生成PDF，但没设定具体字体，这将会导致乱码（PDF默认字体没有支持中文的）请到设置 -> PDF设置指定使用字体。");
        console.log("所有进程已停止");
        return;
    }

    let jobSetting = {
        chapters: chapters.concat(),
        curIndex: curIndex,
        iscompress: novel.iscompress,
        printPdf: novel.printPdf,
        sendmail: novel.sendmail,
        dwChapterCount: chapters.length,
        jobDoneCount: 0
    }
    __R1_DownTheUrlAndCacheFiles(novel, chapters, jobSetting, 0);
}


/**
 * 【第一环】开始多线程爬文章
 * @param {*} chapters 这次批次要下载的章节数量
 * @param {*} jobSetting 当前任务设置
 * @param {*} retryTimes 重试次数
 */
function __R1_DownTheUrlAndCacheFiles(novel, chapters, jobSetting, retryTimes) {
    let checkChapters = [];                     //记录本次任务的文件，然后检查进度
    console.log("R1开始啦！！！！！！！！！！！！！！");
    let threads_exit_num = 0;
    retryTimes++;
    if (retryTimes == 10) {
        console.error("已达到最大重试上限，依然失败，已放弃任务，请检查网站是否能正确打开。这些下不来：", chapters);
        return;
    }

    let baseNovel = { host: novel.host, title: novel.title }

    //多开线程，ε=ε=ε=(~￣▽￣)~    // R1 开始
    const threads_count = Math.min(threads_num, chapters.length)
    for (var t = 0; t < threads_count; t++) {
        // console.log("开线程跑啊：", t);
        const worker = new Worker("./novel/loader_worker.js", { workerData: { isinit: true } });
        worker.on('exit', code => {        //有进程退出时
            threads_exit_num++;
            console.log(`线程已退出： ${code}`);

            if (threads_exit_num !== threads_count) return;               //尚有进程未退出，继续等待

            jobSetting.isSuccess = jobSetting.jobDoneCount == jobSetting.dwChapterCount
            __R2_CatchUrlFinishCallback(novel, jobSetting, checkChapters, retryTimes);
        });
        worker.on('message', msg => {
            if (!msg.initOk) {
                if (msg.isok) {
                    msg.cpStting.file = msg.file;
                    checkChapters.push(msg.cpStting);
                    GetIndexSetting(msg.cpStting, jobSetting.curIndex).file = msg.file;
                    GetIndexSetting(msg.cpStting, jobSetting).file = msg.file;
                    jobSetting.jobDoneCount++;
                } else {
                    chapters.push(msg.cpStting);
                }

                //广播爬取进度
                let noticeInfo = { done: jobSetting.jobDoneCount, count: jobSetting.dwChapterCount, url: msg.cpStting.url, isok: msg.isok };
                Servers.socketServer.emit("Novel/Downloading", novel.id, noticeInfo);
            }

            let isFinish = chapters.length == 0;//这只意味着任务分完 但不一定是全部完成。。。
            if (isFinish) return worker.postMessage({ isFinish: isFinish });

            let cpStting = chapters.shift();
            worker.postMessage({
                cpStting: cpStting,
                savedCpSetting: GetIndexSetting(cpStting, jobSetting.curIndex),
                isFinish: isFinish,
                NewCpID: Solution.NewCpID,
                novel: baseNovel
            });
        });
        worker.on("messageerror", err => { console.error(`线程出错:`, err); });
    }
}


/**
 * 【第二环】在所有线程都停止下载后执行的后续处理逻辑
 * @param {*} novel 最新的章节情况
 * @param {*} jobSetting 当前任务状态 
 * @param {Array} checkChapters 已完成下载的章节
 */
function __R2_CatchUrlFinishCallback(novel, jobSetting, checkChapters, retryTimes) {
    if (!jobSetting.isSuccess) {
        console.error("爬文章时出错：所有文章都爬过了，但已完成的数量不对。。。请再试一次任务吧。", novel)
        return;
    }

    console.log("R1已完成，开始R2任务。");
    let failFiles = [];
    let isCheckOK = CheckCacheFile({ title: novel.title, chapters: checkChapters }, failFiles);
    if (!isCheckOK) {               //文件校验失败——文件缺失        重回第一环
        failFiles.forEach(file => {
            file.reload = true;
        });
        console.log("部分文件校验不通过，重新返回R1下载", failFiles);
        jobSetting.dwChapterCount = checkChapters.length;
        jobSetting.jobDoneCount = checkChapters.length - failFiles.length;
        __R1_DownTheUrlAndCacheFiles(novel, failFiles, jobSetting, retryTimes++);
        return;
    }

    Cache.CacheIndex(jobSetting.curIndex);       //保存最新章节信息

    let compressed = false;         //已合并TXT
    let pdfprinted = false;         //已合并PDF
    let files = [];                 //已完成文件信息收集

    let dir = Cache.GetNovelCachePath(novel.title) + "/";
    jobSetting.chapters.forEach(file => {
        file.filepath = dir + file.file;
    })

    if (jobSetting.iscompress) {//选择了合并
        console.log("开始合并TXT文件！！")
        CombineFiles({ title: novel.title, chapters: jobSetting.chapters }, (new_file_name) => {
            compressed = true;
            let fileName = new_file_name.split("/")
            files.push({ filename: fileName[fileName.length - 1], path: new_file_name });
            __R3_FilesFinishCallback(novel, jobSetting, { compressed: compressed, pdfprinted: pdfprinted, files: files });
        });
    }

    if (jobSetting.printPdf) {
        console.log("开始合并PDF文件！！");
        let novelInfo = Solution.GetItemByID(novel.id);
        PDFCreater.Create(novelInfo, jobSetting.chapters, novel.title + "_" + new Date().getTime(), (fileInfo, err) => {  //filename: string; path: string
            if (err) { return; }//生成PDF失败了

            pdfprinted = true;
            files.push(fileInfo);
            __R3_FilesFinishCallback(novel, jobSetting, { compressed: compressed, pdfprinted: pdfprinted, files: files });
        });
    }

    __R3_FilesFinishCallback(novel, jobSetting, { compressed: compressed, pdfprinted: pdfprinted, files: files });
}

/**
 * 【第三环】所有文件处理完毕后的回调
 * @param {*} novel 
 * @param {object} jobSetting 整个任务的所有设置状态
 * @param {*} status 当前状态
 */
function __R3_FilesFinishCallback(novel, jobSetting, status) {
    if (jobSetting.iscompress && !status.compressed) return;
    if (jobSetting.printPdf && !status.pdfprinted) return;

    console.log("R2已完成，开始R3。", jobSetting.iscompress, jobSetting.printPdf, status);
    if (jobSetting.sendmail) {       //需要发送文件 
        Servers.MailServer.SendMail({
            title: novel.title,
            content: "本文件通过 PrivateLibrary 自动生成并发送。" + JSON.stringify(status.files),
            files: status.files,
            callback: (result, err) => {
                if (result) {
                    Servers.socketServer.emit("Novel/Download/Finish", novel.id, novel);
                } else {
                    console.error("尝试发送邮件失败:", err);
                }
            }
        });
        return;
    } else {
        Servers.socketServer.emit("Novel/Download/Finish", novel.id, novel);
        console.log("R3已完成，所有步骤已完成，退出。");
    }
}

/**
 * 下载/重新下载某一章 已存在缓存的话会先删除
 * @param {*} novelid 
 * @param {*} url 
 * @param {*} isUseCace 
 * @param {*} cacheFile 
 */
function DownLoadOneChapter(novelid, url, isUseCace, cacheFile, host) {
    let novel = Solution.GetNoevlIndex(novelid, true);
    if (!novel) {
        console.log("找不到对应的书籍信息", novelid);
        return;
    }

    novel.host = host;
    if (!isUseCace) {
        let file = Cache.GetNovelCachePath(novel.title) + "/" + cacheFile;
        let temfile = GetTempPathByUrl(host + url);
        console.log("删除存档文件", file, temfile, novel.host + url);
        try { fs.unlinkSync(file); fs.unlinkSync(temfile); } catch (e) { }
    }

    //console.log("重下的小说信息", novelid, novel)

    let downLoadCP;
    novel.chapters.forEach(c => {
        if (c.url == url) downLoadCP = c;
    });
    if (!downLoadCP) {
        console.warn("重下指定章，定位章节失败", novelid, url);
        return;
    }
    downLoadCP.file = null;
    downLoadCP.reload = true;
    novel.chapters = [downLoadCP];
    DownloadNovel(novel);
}

/**
 * 检查下载的文件是否成功
 * @param {*} novel 已下载的章节信息
 * @param {*} fall_files 校验失败的文件列表
 */
function CheckCacheFile(novel, fall_files = []) {
    let dir = Cache.GetNovelCachePath(novel.title) + "/";
    const count = novel.chapters.length;
    let done = 0;

    novel.chapters.forEach(chapter => {
        chapter.filepath = dir + chapter.file;
        let isOk = chapter.file && Cache.CheckFile(chapter.filepath);
        done++;
        if (!isOk) fall_files.push(chapter);
        Servers.socketServer.emit("Novel/CheckCache", novel.id, { done: done, count: count }, isOk ? null : chapter.url);
    });

    if (fall_files.length > 0) {
        console.warn("已下载文件校验失败:", fall_files);
        return false;
    }
    return true;
}

/**
 * 合并小说
 * @param {*} novel 
 * @param {function(filename)} callback 
 */
function CombineFiles(novel, callback) {
    let dir = Cache.GetNovelCachePath(novel.title) + "/";
    const count = novel.chapters.length;
    let done = 0;
    let new_file_path = "download/" + novel.title + "/" + novel.title + "_" + new Date().getTime() + ".txt";
    let chapters = novel.chapters.concat();

    let _combiner = () => {
        let curChapter = chapters.shift();
        pipeline(
            fs.createReadStream(dir + curChapter.file), fs.createWriteStream(new_file_path, { flags: "a" }), (err) => {
                if (err) {
                    console.error("合并文件时出错:", err.message, curChapter);
                    Servers.socketServer.emit("Novel/CombineFiles", novel.id, { done: done, count: count }, curChapter.url);
                    return;
                }
                done++;
                Servers.socketServer.emit("Novel/CombineFiles", novel.id, { done: done, count: count });

                if (done == count) {
                    callback?.(new_file_path);
                    return;
                }
                _combiner();
            }
        )
    }
    _combiner();
}

/**
 * 根据现有章节信息，找到已登记的章节信息
 * @param {*} chapterSetting 
 * @param {*} curIndex 
 */
function GetIndexSetting(chapterSetting, curIndex) {
    let curChapterSetting = null;   //已记录的文章章节信息
    curIndex.chapters.forEach(cp => {
        if (cp.url == chapterSetting.url) {     //通过两者的地址相同，判断是同一个文章——如果远程服务器地址经常改变，这可能会引起混乱——另外通过章节名称判断相同也不靠谱，经常有重名的章节。
            curChapterSetting = cp;
            return;
        }
    });
    return curChapterSetting;
}

/**
 * 解释某目录，收集书籍的章节信息
 * @param {string} text 网页源码
 * @param {object} rule 爬取规则设置
 * @param {string} path 网站的服务器基准地址
 */
function ParseIndexPage(text, rule, path) {
    let title;
    let chapters = [];
    let basePath = path;
    if (!basePath.endsWith("/")) {
        if (basePath.lastIndexOf("/") != -1)
            basePath = basePath.substr(0, basePath.lastIndexOf("/"));
        basePath += "/";//两种情况都得补上/结尾
    }
    try {
        if (rule.type == "querySelector" || rule.type == undefined) {
            $ = cheerio.load(text);
            //NOTE: 抓取书名
            title = QS_GetValueBySetting($(rule.title.selector), rule.title.text);

            let cItems = $(rule.chapters.selector);
            for (let i = 0; i < cItems.length; i++) {
                let item = $(cItems[i]);
                let cp_url = QS_GetValueBySetting(item, rule.chapters.url);

                if (!cp_url.startsWith("/") && !/^https?:\/\//.test(cp_url)) {
                    cp_url = basePath + cp_url;
                    // console.log(basePath, cp_url);           //小说目录地址出错时排查
                }

                chapters.push({
                    title: QS_GetValueBySetting(item, rule.chapters.text),
                    url: cp_url
                });
            }
        }
    } catch (err) {
        console.error("解释目录时失败，请检查爬取规则：", err.message);
    }
    return { title, chapters }
}




console.log("loader.js")
exports.Load = Init;