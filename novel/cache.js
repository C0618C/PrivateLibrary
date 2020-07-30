const fs = require('fs');             //

const NOVEL_DOWNLOAD_PATH = process.cwd() + "/download";
const RULE_FILE_PATH = process.cwd() + "/.sln/rule.json";
const SOLUTION_FILE_PATH = process.cwd() + "/.sln/index.json";
class Cache {
    static get NOVEL_DOWNLOAD_PATH() { return NOVEL_DOWNLOAD_PATH; }
    static get RULE_FILE_PATH() { return RULE_FILE_PATH; }
    static get SOLUTION_FILE_PATH() { return SOLUTION_FILE_PATH; }




    static CacheIndex(novel) {
        fs.mkdirSync(this.GetNovelCachePath(novel.title), { recursive: true });

        novel.time = new Date().getTime();
        fs.writeFileSync(this.GetNovelCacheSetting(novel.title), JSON.stringify(novel));
    }
    static SaveIndexStatus(novel) {
        fs.writeFileSync(this.GetNovelCacheSetting(novel.title), JSON.stringify(novel));
    }

    static GetNovelPath(novel_name) {
        return NOVEL_DOWNLOAD_PATH + `/${novel_name}`
    }
    static GetNovelCachePath(novel_name) {
        return NOVEL_DOWNLOAD_PATH + `/${novel_name}/cache`
    }

    static GetNovelCacheSetting(novel_name) {
        return this.GetNovelCachePath(novel_name) + "/.nsl";
    }

    static GetNovelIndex(novel_name) {
        let setting = this.GetNovelCacheSetting(novel_name);
        return fs.readFileSync(setting).toString();
    }

    static SaveChapter(filepath, content) {
        // console.log("写入文件 : ", filepath);
        fs.writeFileSync(filepath, content);
    }


    static CheckFile(filepath) {
        try {
            let fileStatus = fs.statSync(filepath);
            return fileStatus.isFile() && fileStatus.size > 0;
        } catch (err) {
            // console.warn(err);
            return false;
        }
    }

    static DeleteNovel(novel_name) {
        let dir = Cache.GetNovelPath(novel_name);
        fs.rmdir(dir, { recursive: true }, (err) => {       //NOTE: 实验性的API
            if (err) console.error("尝试删除目录失败，请手工删除：", dir, e.message);
        });
    }



    //规则文件相关的
    static GetRuleFromFile() {
        return fs.readFileSync(RULE_FILE_PATH).toString()
    }
    static UpdateRuleFile(setting) {
        return fs.writeFileSync(RULE_FILE_PATH, typeof (setting) == "string" ? setting : JSON.stringify(setting));
    }
}

exports.Cache = Cache;