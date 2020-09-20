const fs = require('fs');             //
const Cache = require("./cache").Cache;

/**
 * 根据规则对内容进行修正（查找替换）
 * @param {*} ruleid 
 * @param {*} content 
 */
function Proofread(ruleid, content) {
    let ruleSetting = Cache.GetProofread();
    if (!Array.isArray(ruleSetting.common) && !Array.isArray(ruleid)) return content;
    if (!Array.isArray(ruleSetting.common)) ruleSetting.common = [];
    if (!Array.isArray(ruleid)) ruleid = [];

    let allrule = Array.of(...ruleSetting.common, ...ruleid);
    for (let id of allrule) {
        let rule = ruleSetting[id];

        if (rule == undefined) continue;

        let regexp = new RegExp(rule.regexp, "g");
        content = content.replace(regexp, rule.content);
    }
    return content;
}


/**
 * 抽检所给章节是否有雷同的
 * @param {Array} items 包含filepath属性的对象数组，检查结果按原样返回。
 */
function CheckFilesSimilarity(items) {  //传入章节地址，校验是否存在重复章节
    let result = [];
    for (let i = 0; i < items.length; i++) {
        let curText = fs.readFileSync(items[i].filepath).toString();
        if (curText.length < 50) {
            console.log("文件过短，可能存在问题：", items[i], curText);
            continue;
        }
        let p1 = Math.floor(curText.length / 4);
        let p2 = Math.floor(curText.length / 3);
        let p3 = Math.abs(curText.length - p1);
        let idxText = [curText.substr(p1, 30), curText.substr(p2, 30), curText.substr(p3, 30)];

        for (let j = i + 1; j < items.length; j++) {
            let ckText = fs.readFileSync(items[j].filepath).toString();

            let c = 0;
            if (ckText.includes(idxText[0])) c++;
            if (ckText.includes(idxText[1])) c++;
            if (ckText.includes(idxText[2])) c++;
            if (c >= 2) {                   //可能重复的只有其中一半 不保证三段完全都找到
                result.push({ a: items[i], b: items[j] });
            }
        }

        //判断文章是否正常结束了
        let lastText = curText.substr(-40).trim();
        if (!/[。！？”.!?’……]|本章完|更新|感谢|推荐|本书新?盟主?|上架|爆发|月票|加更/.test(lastText)) {
            console.log("没检测到文章末的结束：", items[i], lastText);
            console.log("\n");
        }
    }

    return result;
}



exports.Proofread = Proofread;
exports.CheckFilesSimilarity = CheckFilesSimilarity;