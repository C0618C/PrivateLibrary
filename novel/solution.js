const Cache = require("./cache").Cache;
const fs = require("fs");
const Servers = require("../server");

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
    AddNewItem(url, title, count, isSaveNow = false) {
        let nv = this.GetItemByUrl(url);
        if (nv == undefined) {
            nv = {
                id: this.NewID
            };
            this.data.add(nv);
        }
        nv.url = url
        nv.title = title
        nv.count = count
        nv.time = (new Date()).getTime()

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
        let content = fs.readFileSync(Cache.GetNovelCachePath(info.title) + "/" + getFile).toString();


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
}

console.log("solution.js")
exports.Solution = Solution;
