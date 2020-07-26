/**
 * 重新加载制定书的目录
 * @param {string} id 书籍ID 
 * @param {boolen} isUseCache 是否使用从缓存中加载
 * @param {function} callback 加载完目录后的回调
 */
function ReloadIndex(id, isUseCache, callback) {
    if (!id) return console.error("没有书籍ID，更新目录失败。")
    $.ajax({
        url: "/api/novel/index", dataType: "json",
        data: { id: id, isUseCache: isUseCache }, method: "POST",
        success: (result) => {
            if (callback) callback(result);
        }
    });
}

/**
 * 从书库中删除指定的书籍
 * @param {string} id 书籍ID
 * @param {boolen} isDelFile 
 * @param {function} callback 
 */
function DeleteNovel(id, isDelFile, callback) {
    $.ajax({
        url: "/api/solution/deleteitem", method: "DELETE", data: { id: id, isDelFile: isDelFile },
        success: (result) => {
            if (!result || result.length == 0) return;
            let isSuccess = result == "ok";
            if (callback) callback(isSuccess);
        }
    });
}


function GetRuleSetting(callback) {
    $.ajax({
        url: "/api/webside/rule", method: "GET", dataType: "json",
        success: (result) => {
            if (callback) callback(result);
        }
    });
}
//更新
function UpdateRuleSetting(setting, callback) {
    $.ajax({
        url: "/api/webside/rule", method: "PUT", dataType: "json", contentType: 'application/json', data: JSON.stringify(setting),
        success: (result) => {
            if (callback) callback(result);
        }
    });
}


function NoticeMessage(message, title, { type, delayMS } = { type: "primary", delayMS: 0 }) {
    let msgBox = $(`<div class="alert alert-${type} fixed-top" role="alert"><strong>${title}</strong>${message} <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`);
    $("body").append(msgBox);
    if (delayMS != 0) setTimeout(() => { msgBox.remove(); }, delayMS);
}
function Alert(message, title, delayMS = 0) {
    if (title == undefined) title = "警告："
    NoticeMessage(message, title, { type: "danger", delayMS });
}
function Success(message, title, delayMS = 0) {
    if (title == undefined) title = "成功："
    NoticeMessage(message, title, { type: "success", delayMS });
}
function Warning(message, title, delayMS = 0) {
    if (title == undefined) title = "注意："
    NoticeMessage(message, title, { type: "warning", delayMS });
}