const PDFDocument = require('pdfkit');
const pdfSetting = require("./setting").pdf.get();
const fs = require('fs');

function CreatePDF(target, newFileName) {
    // let ct = fs.readFileSync(filePath).toString();
    // CreateWithContext(ct, newFileName);
    try {
        const newDoc = CreateNewDoc("book/" + newFileName + '.pdf');

        if (Array.isArray(target)) {
            MakeFilesToADoc(target, newDoc);
        }
    } catch (e) {
        console.log(e)
    }
}
function CreatePDFWithSetting(setting, text, filePaht) {
    try {
        setting.paddingX *= 1;
        setting.paddingY *= 1;
        setting.fontSize *= 1;
        const newDoc = CreateNewDoc(filePaht, setting);
        newDoc.text(text, setting.paddingX, setting.paddingY).end();
    } catch (e) {
        console.log(e)
    }
}



function CreateNewDoc(filepath, setting) {
    setting = setting || pdfSetting;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filepath));
    if (setting.fontFamily) doc.font('font/' + setting.fontFamily);
    if (setting.fontSize) doc.fontSize(setting.fontSize);
    return doc;
}

function MakeFilesToADoc(files, doc) {
    files.forEach(file => {
        let context = fs.readFileSync(file.filepath).toString();
        doc.text(context, pdfSetting.paddingX, pdfSetting.paddingY).addPage();
    });
    doc.end();
}

console.log("pdf.js")
exports.Create = CreatePDF;
exports.CreateWithSetting = CreatePDFWithSetting;