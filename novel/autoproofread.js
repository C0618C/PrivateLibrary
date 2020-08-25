const Cache = require("./cache").Cache;


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



exports.Proofread = Proofread;