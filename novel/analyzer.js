/**
 * 依赖于JQ的规则解释器
 * @param {qsObject} item 
 * @param {rule} setting 
 */
function QS_GetValueBySetting(item, setting) {
    //item = $(item);
    if (!setting.includes("/")) return item.attr(setting);
    if (setting.startsWith("fn/")) return item[setting.replace("fn/", "")]();

    return;
}

exports.QS_GetValueBySetting = QS_GetValueBySetting;