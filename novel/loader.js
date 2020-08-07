const fs = require('fs');             //
const got = require('got');             //请求远程类容
const Iconv = require('iconv-lite');    //转码相关
const cheerio = require('cheerio');     //通过类似jquery的形式解释html源码

const { pipeline } = require('stream');

const Cache = require("./cache").Cache;
const PDFCreater = require("./pdf");


let Solution;
let Servers;

let Rules = Cache.GetRuleFromFile();
if (Rules.length == 0) Rules = {};
else {
    try {
        Rules = JSON.parse(Rules);
    } catch (e) {
        Rules = {};
    }
}
function ChangeRule(new_rule) {
    Rules = Object.assign({}, new_rule);
}

function GetRule(url) {
    let host = GetHost(url);
    if (!Rules[host]) {
        console.warn("请配置网站的采集规则：", host);
        return;
    }
    let rule = Rules[host];
    if (!rule.encoding) rule.encoding = "utf-8";
    return rule;
}



function Init(solution, ss) {
    Solution = solution;
    Solution.loader = LoadNovelIndex;
    Servers = ss;

    return { LoadNovelIndex, DownloadNovel, DownLoadOneChapter, ChangeRule };
}

/**
 * 下载小说的目录
 * @param {*} url 
 * @param {function (id,novel,err)} callback 完成后的回调函数
 * @param {*} useCache 
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
            let id = Solution.AddNewItem(url, n.title, n.chapters.length, true);

            n.id = id;
            n.url = url;
            n.host = host;

            //跟原来缓存进度合并
            if (Cache.CheckFile(Cache.GetNovelCacheSetting(n.title))) {//先检查原来项目是否存在
                let oldIndex = JSON.parse(Cache.GetNovelIndex(n.title));
                n.chapters.forEach(cp => {
                    let oldChapter = GetIndexSetting(cp, oldIndex);
                    if (oldChapter) cp.file = oldChapter.file;
                });
            }

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
    let index = Cache.GetNovelIndex(novel.title);
    let dir = Cache.GetNovelCachePath(novel.title) + "/";
    console.log("开始爬：", novel);
    //小说的索引、目录
    let curIndex = JSON.parse(index);
    let chapters = novel.chapters;
    const dwChapterCount = chapters.length;     //总共需要下载的章节数
    let jobDoneCount = 0;                       //已经下载数量
    let host = novel.host;
    let rule = GetRule(host);
    let checkChapters = [];                     //记录本次任务的文件，然后检查进度

    if (chapters.length == 0 || !host || !rule) {
        console.error("抓取书籍文本失败，相关信息不全！", chapters, host, rule);
        return;
    }

    /**
     * 单篇文章下载器
     * @param {*} chapterSetting 
     * @param {function(isNeedWait,isTryAgain)} callback 进入下一轮的定时器
     */
    let _loadAChapter = (chapterSetting, callback) => {
        //console.log("给我爬", chapterSetting)

        let curChapterSetting = GetIndexSetting(chapterSetting, curIndex);

        //缓存的章节目录没更新的情况下，远程服务器更新了页面的地址导致
        if (curChapterSetting == null) {
            curChapterSetting = chapterSetting;
            curIndex.chapters.push(curChapterSetting);
            console.warn("按道理不应该运行到这儿，请检查章节信息。必要时请更新书籍目录。")
        }
        checkChapters.push(curChapterSetting);

        //查到缓存记录，跳过
        if (curChapterSetting.file && Cache.CheckFile(dir + curChapterSetting.file) && chapterSetting.reload !== true) {
            //console.log("当前文件已缓存", curChapterSetting);
            jobDoneCount++;
            if (callback) callback(false);
            return;
        }

        //解释小说，提取正文
        GetTextByURL(host + curChapterSetting.url, rule.encoding, (text, err) => {
            if (err || text == null) {
                let msg = { done: jobDoneCount, count: dwChapterCount, url: curChapterSetting.url, isok: false };
                Servers.socketServer.emit("Novel/Downloading", novel.id, msg);           //通知出错了
                callback(true, true);//出错了 就等等再重启下载
                return;
            }
            let content = ParseContentPage(text, rule.content_page);

            //保存到文件
            let fileName = Solution.NewCpID + ".txt";
            curChapterSetting.file = fileName;
            let cachePath = dir + fileName;
            Cache.SaveChapter(cachePath, content);

            jobDoneCount++;

            //通知爬取进度
            let msg = { done: jobDoneCount, count: dwChapterCount, url: curChapterSetting.url, isok: true };
            Servers.socketServer.emit("Novel/Downloading", novel.id, msg);

            //更新章节情况
            Cache.CacheIndex(curIndex);

            if (callback) callback(true);
        });
    }

    const t_sleep_time = 1000;
    let _runner = () => {
        let cpStting = chapters.shift();
        if (!cpStting) return;//分派完 但不一定是已下载完

        _loadAChapter(cpStting, (needWait, isTryAgain) => {
            if (isTryAgain) { chapters.push(cpStting); console.warn("失败了，加入队尾重试", cpStting) }

            if (jobDoneCount == dwChapterCount) {
                let failFiles = [];
                let isCheckOK = CheckCacheFile({ title: novel.title, chapters: checkChapters }, failFiles);

                if (!isCheckOK) {       //文件校验失败——文件缺失
                    chapters.push(...failFiles);
                    jobDoneCount -= failFiles.length;
                    _runner();      //重新开始
                    return;
                }
                if (novel.iscompress) {//选择了不合并
                    CombineFiles({ title: novel.title, chapters: checkChapters }, (new_file_name) => {
                        Servers.socketServer.emit("Novel/Download/Finish", novel.id, curIndex, new_file_name);
                        console.log("所有任务已完成：", novel.title);
                    });
                    return;
                }

                let pdfFile;
                if (novel.printPdf) {
                    console.log("开始合并PDF文件！！")
                    pdfFile = PDFCreater.Create(checkChapters, novel.title + "_" + new Date().getTime());
                    if (!novel.sendmail) {
                        Servers.socketServer.emit("Novel/Download/Finish", novel.id, curIndex);
                        return;
                    }
                }

                if (novel.sendmail) {       //需要发送文件
                    Servers.MailServer.SendMail({
                        title: pdfFile.filename,
                        content: "本文件通过 PrivateLibrary 自动生成并发送。",
                        files: [pdfFile],
                        callback: (result, err) => {
                            if (result) {
                                Servers.socketServer.emit("Novel/Download/Finish", novel.id, curIndex);
                            } else {
                                console.error("尝试发送邮件失败:", err);
                            }
                        }
                    });
                    return;
                }

                Servers.socketServer.emit("Novel/Download/Finish", novel.id, curIndex);
            }
            let sleep_time = jobDoneCount % 5 == 0 ? t_sleep_time * 3 : t_sleep_time;//增加弹性等待时间 防止爬太快出错
            setTimeout(_runner, needWait ? sleep_time : 0);
        });
    }

    _runner();
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
                    if (callback) callback(new_file_path);
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
 * 返回纯粹的域名如 www.abc.com
 * @param {任意URL网址} url 
 */
function GetHost(url) {
    url = url.replace(/https?:\/\//, "");
    return url.indexOf("/") == -1 ? url : url.substr(0, url.indexOf("/"));
}


/**
 * 爬指定的地址
 * @param {string} url 
 * @param {string} encoding 
 * @param {function} callback 成功爬完目标地址后的回调处理函数
 */
function _GetTextByURL(url, encoding, callback) {
    console.log("正在爬地址：", url);
    try {
        got.stream(url, { timeout: 10000 }).pipe(Iconv.decodeStream(encoding)).collect(function (err, body) {
            console.log("爬地址完成：", url);
            callback(body);
        });
    } catch (err) {
        console.error(`抓取网页失败${url}   `, err);
        if (callback) callback(null);
    }
}

/**
 * 
 * @param {*} url 
 * @param {*} encoding 
 * @param {function(text,err)} callback_text_err 下载完后的回调函数，返回下载成的文本或null和错误信息 
 * @param {*} isUseCace 
 */
function GetTextByURL(url, encoding, callback_text_err, isUseCace = true) {
    //console.log("正在爬地址：", url);
    let tempFilePath = GetTempPathByUrl(url);
    if (Cache.CheckFile(tempFilePath)) {
        if (isUseCace) {
            console.warn("使用了临时文件：", url, tempFilePath);
            callback_text_err(fs.readFileSync(tempFilePath).toString());
            return;
        }
    }

    pipeline(
        got.stream(url, { timeout: 10000 }),
        Iconv.decodeStream(encoding),
        fs.createWriteStream(tempFilePath),                     //NOTE: 这个临时文件显得有点多余
        (err) => {
            if (err) {                  //进这儿的一般是超时出错
                console.error(url, tempFilePath, err.message);
                callback_text_err(null, err);
                return;
            }
            callback_text_err(fs.readFileSync(tempFilePath).toString());
            //console.log("爬完", url, tempFilePath);
        }
    );
}

function GetTempPathByUrl(url) {
    let host = GetHost(url);
    return Cache.TEMP_FILE_PATH + url.substr(url.indexOf(host) + host.length).replace(/[\/\\\.\?\#]/g, "");
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

                if (!cp_url.startsWith("/")) {
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


/**
 * 依赖于JQ的规则解释器
 * @param {qsObject} item 
 * @param {rule} setting 
 */
function QS_GetValueBySetting(item, setting) {
    //item = $(item);
    if (!setting.includes("/")) return item.attr(setting);
    if (setting.startsWith("fn/")) return item[setting.replace("fn/", "")]();

    return;
}

console.log("loader.js")
exports.Load = Init;