const Cache = require("./cache").Cache;
const fs = require("fs");
const Servers = require("../server");
const Proofread = require("./autoproofread").Proofread;

const solutionCacheFile = process.cwd() + "/.sln/index.json";
class Solution {
    data = new Set();
    loader = null;
    constructor() {
        this.InitData();
    }

    //生成随机ID，注意要跟现有ID不重复
    get NewID() {
        let chart = "abcdefghijklmnopqrstuvwxyz_0123456789";
        const idl = 10;
        let newid = "";
        while (newid.length < idl) {
            let r = (Math.random() * 1000000 % (chart.length - 1)).toFixed(0);
            newid += chart[r];
        }
        return newid;
    }

    //取得章节ID
    get NewCpID() {
        return "cp_" + this.NewID;
    }

    async InitData() {
        let setting = await fs.readFileSync(solutionCacheFile).toString();
        try {
            this.data = new Set(JSON.parse(setting));
        } catch (e) {
        }
        setting = null;
    }
    SaveSetting() {
        try {
            fs.writeFile(solutionCacheFile, JSON.stringify(Array.from(this.data)), () => { });
        } catch (e) {
            console.error("更新书库库存时出错", e)
        }
    }
    AddNewItem({ url, title, count, isStop, hasUpdate }, isSaveNow = false) {
        let nv = this.GetItemByUrl(url);
        if (nv == undefined) {
            nv = {
                id: this.NewID
            };
            this.data.add(nv);
        }
        nv.url = url;
        nv.title = title;
        nv.count = count;

        if (isStop) nv.isStop = true;
        else if (hasUpdate) nv.time = (new Date()).getTime();

        if (isSaveNow) this.SaveSetting();
        return nv.id;
    }
    //取得所有书籍
    GetItems() {
        return Array.from(this.data, o => Object.assign({}, o));
    }

    GetItemBy(attr, value) {
        let n;
        this.data.forEach(i => { if (i[attr] == value) { n = i; return; } });
        return n;
    }
    GetItemByID(id) { return this.GetItemBy("id", id); }
    GetItemByUrl(url) { return this.GetItemBy("url", url); }

    DeleteItem(id, isDelFile) {
        let n = this.GetItemByID(id);

        if (isDelFile && n) Cache.DeleteNovel(n.title);

        if (this.data.delete(n)) {
            this.SaveSetting();
            return "ok";
        }
        return "none";
    }

    /**
     * 获取某个书籍的目录信息
     * @param {*} id 书籍ID
     * @param {*} isUseCache 是否从缓存/记录里获取（否将重新抓取目录信息)
     */
    GetNoevlIndex(id, isUseCache) {
        let novel = this.GetItemByID(id);
        if (novel == undefined) return null;
        try {
            if (!isUseCache) throw "重新爬";
            //载入缓存的目录
            let novelCache = Cache.GetNovelIndex(novel.title);
            return JSON.parse(novelCache);
        } catch (err) {
            //重新爬目录
            this.loader(novel.url, (id, novel) => {
                Servers.servers.socketServer.emit("Novel/LoadIndex/Finish", id, novel);
            }, false);
        }

        return novel;
    }

    /**
     * 阅读缓存的小说
     * @param {string} id 小说ID
     * @param {*} startFile 开始章节
     * @param {*} curFile 当前章节
     */
    GetNovelForReading(id, startFile, curFile) {
        let info = this.GetItemByID(id);
        let getFile = curFile ? curFile : startFile;

        if (getFile === "undefined") return "{}";//没找到任何章节——一般在第一章依然往上翻就这样

        let content = fs.readFileSync(Cache.GetNovelCachePath(info.title) + "/" + getFile).toString();

        //自动校阅
        content = Proofread(info.proofread, content);

        //置为已读
        let novel = this.GetNoevlIndex(id, true);
        this.SetReadedStatus(novel, getFile);

        //如果指定了curFile，则是在已有目录的情况下请求指定文章，不需要后续逻辑返回整个目录
        if (curFile) {
            return { content, cid: getFile };
        }

        //返回整个书目
        novel.content = content;
        novel.cid = getFile;
        novel = JSON.stringify(novel);
        return novel;
    }

    SetReadedStatus(book, file) {
        let cp = book.chapters;
        cp.forEach(c => {
            if (c.file == file) {
                c.readed = true;
                Cache.SaveIndexStatus(book);
            }
        })
    }

    /**
     * 设置某章隐藏
     * @param {*} bookid 书籍ID
     * @param {*} url 章节的地址
     */
    SetIgnore(bookid, url) {
        let book = this.GetNoevlIndex(bookid, true);
        book.chapters.forEach(c => {
            if (c.url == url) {
                c.ignore = true;
                Cache.SaveIndexStatus(book);
            }
        });
    }

    /**
     * 设置新的校阅规则
     * @param {*} bookid 
     * @param {Array} newProofread 
     */
    SetProofread(bookid, newProofread) {
        let book = this.GetItemByID(bookid);
        book.proofread = newProofread.concat();
        this.SaveSetting();
        return true;
    }
}

console.log("solution.js")
exports.Solution = Solution;
