const { Cache } = require("./cache");

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

/**
 * 返回纯粹的域名如 www.abc.com
 * @param {任意URL网址} url 
 */
function GetHost(url) {
    url = url.replace(/https?:\/\//, "");
    return url.indexOf("/") == -1 ? url : url.substr(0, url.indexOf("/"));
}

exports.ChangeRule = ChangeRule;
exports.GetRule = GetRule;
exports.GetHost = GetHost;