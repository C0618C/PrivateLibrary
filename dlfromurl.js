const fs = require('fs');             //
const { pipeline } = require('stream');
const got = require('got');             //请求远程类容
const Iconv = require('iconv-lite');    //转码相关

const { Cache } = require("./novel/cache");

/**
 * 获取对应URL的HTML内容
 * @param {*} url 
 * @param {*} encoding 
 * @param {function(text,err)} callback_text_err 下载完后的回调函数，返回下载成的文本或null和错误信息 
 * @param {*} isUseCace 
 */
function GetTextByURL(url, encoding, callback_text_err, isUseCace = true) {
    //console.log("正在爬地址：", url);
    let tempFilePath = GetTempPathByUrl(url);
    if (Cache.CheckFile(tempFilePath)) {
        if (isUseCace) {
            console.warn("使用了临时文件：", url, tempFilePath);
            callback_text_err(fs.readFileSync(tempFilePath).toString());
            return;
        }
    }

    pipeline(
        got.stream(url, { timeout: 10000 }),
        Iconv.decodeStream(encoding),
        fs.createWriteStream(tempFilePath),                     //NOTE: 这个临时文件显得有点多余
        (err) => {
            if (err) {                  //进这儿的一般是超时出错
                //console.error(url, tempFilePath, err.message);
                callback_text_err(null, err);
                return;
            }
            callback_text_err(fs.readFileSync(tempFilePath).toString());
            fs.unlinkSync(tempFilePath);        //临时文件用完删掉
        }
    );
}


function GetTempPathByUrl(url) {
    return Cache.TEMP_FILE_PATH + "/" + url.replace(/[:\/.?#]/g, "");
}


exports.GetTextByURL = GetTextByURL;
exports.GetTempPathByUrl = GetTempPathByUrl;