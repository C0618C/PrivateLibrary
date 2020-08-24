const Cache = require("./cache").Cache;


function Proofread(ruleid, content) {
    let ruleSetting = Cache.GetProofread();
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