const MAX_STRING_LENGTH = 400;
/**
 * 
 * @param {string} str 
 */
function splitLongStr(str) {
    let ret = '';
    for (let i = 0, len = str.length; i < len; i += MAX_STRING_LENGTH) {
        ret += str.slice(i, i + MAX_STRING_LENGTH) + '\n\r'
    }
    return ret
}
module.exports = {
    /**
     * 换行处理，多余两空格视为换行
     * @param {string} str 
     */
    makeContentSplitLines(str) {
        return str.replace(/\s{2,}/gm, '\n\r').replace(/[^\n]+/gm, ($0) => {
            return $0.length > MAX_STRING_LENGTH ? splitLongStr($0) : $0
        })
    }
}