const PDFDocument = require('pdfkit');
const pdfSetting = require("./setting").pdf;
const fs = require('fs');

function CreatePDF(target, newFileName, callback) {
    let fileInfo = {
        filename: newFileName + ".pdf",
        path: "book/" + newFileName + '.pdf'
    };
    try {
        const newDoc = CreateNewDoc(fileInfo.path);

        if (Array.isArray(target)) {
            MakeFilesToADoc(target, newDoc.doc);
            console.log("【PDF】所有章节已安排生成");
        }

        newDoc.stream.on('finish', function () {
            console.log("【PDF】PDF文件输出已完成！", fileInfo)
            callback?.(fileInfo)
        });
    } catch (e) {
        console.log(e);
        if (e) callback(null, e);
    }
}
/**
 * 用指定的配置打印PDF（一般就是打印预览啦）
 * @param {*} setting 
 * @param {*} text 文件名称
 * @param {{filename,path}} filePath 保存的文件路径
 * @param {function()}callback 完成后的回调函数
 */
function CreatePDFWithSetting(setting, text, filePath, callback) {
    try {
        setting.paddingX *= 1;
        setting.paddingY *= 1;
        setting.pageWidth *= 1;
        setting.fontSize *= 1;
        const newDoc = CreateNewDoc(filePath, setting);
        newDoc.doc.text(text, setting.paddingX, setting.paddingY, { width: setting.pageWidth }).end();
        newDoc.stream.on('finish', function () {
            callback?.({ filename: "预览文件", path: filePath });
            console.log("PDF预览文件生成成功", filePath);
        });
    } catch (e) {
        console.log(e)
        if (e) callback(null, e);
    }
}



/**
 * 
 * @param {string} filepath 生成的文件路径
 * @param {object} setting 设置
 * @returns {object} { doc="pdf文档对象", stream="文件写入流" }
 */
function CreateNewDoc(filepath, setting) {
    setting = setting || pdfSetting.get();
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    if (setting.fontFamily) doc.font('font/' + setting.fontFamily);
    if (setting.fontSize) doc.fontSize(setting.fontSize);
    return { doc, stream };
}

function MakeFilesToADoc(files, doc) {
    setting = pdfSetting.get();
    files.forEach(file => {
        let context = fs.readFileSync(file.filepath).toString();
        doc.text(context, setting.paddingX, setting.paddingY, { width: setting.pageWidth }).addPage();
    });
    doc.end();
}

console.log("pdf.js")
exports.Create = CreatePDF;
exports.CreateWithSetting = CreatePDFWithSetting;

//确认当前PDF配置是否有致命错误
exports.CheckSetting = () => {
    return pdfSetting.get().fontFamily && pdfSetting.get().fontFamily != "";
}