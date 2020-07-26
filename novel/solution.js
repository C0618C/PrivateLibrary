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
            setting = JSON.parse(setting);
        } catch (e) {
            setting = [];
        }
        for (let s of setting) {
            this.data.add(s);
        }
    }
    async SaveSetting() {
        let setting = [];
        this.data.forEach(s => setting.push(s));
        await fs.writeFileSync(solutionCacheFile, JSON.stringify(setting));
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
        let temp = [];
        this.data.forEach(i => {
            temp.push(Object.assign({}, i));
        });
        return temp;
    }
    GetItemByID(id) {
        let n;
        this.data.forEach(i => { if (i.id == id) { n = i; return; } });
        return n;
    }

    GetItemByUrl(url) {
        let t;
        this.data.forEach(i => {
            if (i.url == url) { t = i; return i; }
        });
        return t;
    }

    DeleteItem(id) {
        let n;
        this.data.forEach(i => { if (i.id == id) { n = i; return; } });
        if (this.data.delete(n)) {
            this.SaveSetting();
            return "ok";
        }

        return "none";
    }


    GetNoevlIndex(id, isUseCache) {
        let novel = this.GetItemByID(id);
        try {
            if (!isUseCache) throw "重新爬";
            //载入缓存的目录
            let novelCache = Cache.GetNovelIndex(novel.title);
            return novelCache;
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

        if (curFile) {
            return { content, cid: getFile };
        }

        let novel = this.GetNoevlIndex(id, true);
        novel = JSON.parse(novel);
        novel.content = content;
        novel.cid = getFile;
        novel = JSON.stringify(novel);
        return novel;
    }
}

console.log("solution.js")
exports.Solution = Solution;