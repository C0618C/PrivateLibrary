const fs = require('fs');             //

const NOVEL_DOWNLOAD_PATH = process.cwd() + "/download";
const TEMP_FILE_PATH = NOVEL_DOWNLOAD_PATH + "/temp";
const SOLUTION_DIR_PATH = process.cwd() + "/.sln";
const RULE_FILE_PATH = SOLUTION_DIR_PATH + "/rule.json";
const SOLUTION_FILE_PATH = SOLUTION_DIR_PATH + "/index.json";
const SYS_SETTING_FILE_PATH = SOLUTION_DIR_PATH + "/setting.json";  //系统设置文件
const FONT_DIR_PATH = process.cwd() + "/font";                      //可用字体目录
const PROOFREAD_RULE_PATH = SOLUTION_DIR_PATH + "/proofread.json"      //校阅规则文件


class Cache {
    static get NOVEL_DOWNLOAD_PATH() { return NOVEL_DOWNLOAD_PATH; }
    static get TEMP_FILE_PATH() { return TEMP_FILE_PATH; }
    static get RULE_FILE_PATH() { return RULE_FILE_PATH; }
    static get SOLUTION_DIR_PATH() { return SOLUTION_DIR_PATH; }
    static get SOLUTION_FILE_PATH() { return SOLUTION_FILE_PATH; }
    static get SYS_SETTING_FILE_PATH() { return SYS_SETTING_FILE_PATH; }
    static get FONT_DIR_PATH() { return FONT_DIR_PATH; }
    static get PROOFREAD_RULE_PATH() { return PROOFREAD_RULE_PATH; }


    static CacheIndex(novel) {
        fs.mkdirSync(this.GetNovelCachePath(novel.title), { recursive: true });

        if (!novel.time) novel.time = new Date().getTime();
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
        try {
            return fs.readFileSync(setting).toString();
        } catch (e) {
            console.error(`未找到 ${setting} 文件，请检查 title 规则是否正确`);
            console.error(e);
        }
    }

    static SaveChapter(filepath, content) {
        // console.log("写入文件 : ", filepath);
        fs.writeFileSync(filepath, content);
    }


    static CheckFile(filepath) {
        try {
            let fileStatus = fs.statSync(filepath);
            return fileStatus.isFile() && fileStatus.size > 50;
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


    //FileSystem
    static async GetDirStatus(curPath) {
        let result = {
            root: NOVEL_DOWNLOAD_PATH,
            curPath: NOVEL_DOWNLOAD_PATH + curPath,
            dir: [],
            file: []
        };
        const dir = fs.opendirSync(result.curPath);
        for await (const dirent of dir) {
            if (dirent.isDirectory()) result.dir.push(dirent.name);
            else if (dirent.isFile()) result.file.push(dirent.name);
        }
        return result;
    }

    static DeleteFloder(target) {
        console.warn("删除文件夹：", NOVEL_DOWNLOAD_PATH + target);
        fs.rmdir(NOVEL_DOWNLOAD_PATH + target, { recursive: true }, () => { });
    }
    static DeleteFile(target) {
        console.warn("删除文件：", NOVEL_DOWNLOAD_PATH + target);
        fs.unlinkSync(NOVEL_DOWNLOAD_PATH + target);
    }


    //Setting
    static GetSettingConfig(defSetting) {
        try {
            let curSetting = JSON.parse(fs.readFileSync(SYS_SETTING_FILE_PATH).toString());
            if (defSetting) return deepObjectMerge(defSetting, curSetting);
            else return curSetting;
        } catch (e) {
            this.SetSettingConfig(defSetting || {});
            return defSetting || {};
        }
    }

    static SetSettingConfig(setting) {
        fs.writeFileSync(SYS_SETTING_FILE_PATH, JSON.stringify(setting));
    }

    //Proofread
    static GetProofread() {
        return JSON.parse(fs.readFileSync(PROOFREAD_RULE_PATH).toString());
    }
    static SaveProofread(setting) {
        fs.writeFileSync(PROOFREAD_RULE_PATH, typeof (setting) == "string" ? setting : JSON.stringify(setting));
    }

    /**
     * 取得所有字体文件名称
     */
    static async GetFontFamily() {
        let result = [];
        const dir = fs.opendirSync(FONT_DIR_PATH);
        for await (const dirent of dir) {
            //注意 TTC格式字体需要传入字体名称 如doc.font('fonts/Chalkboard.ttc', 'Chalkboard-Bold')
            if (dirent.isFile() && /\.(ttf|otf|woff2?|fon)$/i.test(dirent.name)) result.push(dirent.name);
        }
        return result;
    }
}

function deepObjectMerge(FirstOBJ, SecondOBJ) { // 深度合并对象
    for (var key in SecondOBJ) {
        FirstOBJ[key] = FirstOBJ[key] && FirstOBJ[key].toString() === "[object Object]" ?
            deepObjectMerge(FirstOBJ[key], SecondOBJ[key]) : FirstOBJ[key] = SecondOBJ[key];
    }
    return FirstOBJ;
}

exports.Cache = Cache;