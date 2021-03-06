const fs = require("fs");
const Cache = require("./cache").Cache;


const defaultSetting = {
    system: {
        timeout: 10000
    },
    pdf: {
        paddingX: 10,
        paddingY: 10,
        fontSize: 26,
        pageWidth: 580,
        fontFamily: ""
    },
    kindle: {
        kindle_email: "",
        email: "",
        pass: ""
    }
};

let curSysSetting = Cache.GetSettingConfig(defaultSetting);

function GetSeting(type) {
    return Object.assign({}, type ? curSysSetting[type] : curSysSetting);
}
function SetSetting(setting, type) {
    curSysSetting = type ? Object.assign(curSysSetting, { [type]: setting }) : Object.assign(curSysSetting, setting);
    Cache.SetSettingConfig(curSysSetting);
    return true;
}


function GetPdfSetting() {
    let ps = GetSeting("pdf");
    ps.paddingX *= 1;
    ps.paddingY *= 1;
    ps.pageWidth *= 1;
    ps.fontSize *= 1;
    return ps;
}
function SetPdfSetting(setting) {
    return SetSetting(setting, "pdf");
}
exports.pdf = { get: GetPdfSetting, set: SetPdfSetting }



function GetKindleSetting() {
    return GetSeting("kindle");
}
function SetKindleSetting(setting) {
    return SetSetting(setting, "kindle");
}
exports.kindle = { get: GetKindleSetting, set: SetKindleSetting }
