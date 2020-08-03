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
        fontFamily: ""
    },
    kindle: {
        email: ""
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
    return GetSeting("pdf");
}
function SetPdfSetting(setting) {
    return SetSetting(setting, "pdf");
}

exports.pdf = { get: GetPdfSetting, set: SetPdfSetting }
