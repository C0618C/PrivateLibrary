const PDFDocument = require('pdfkit');
const pdfSetting = require("./setting").pdf;
const fs = require('fs');

function CreatePDF(target, newFileName) {
    let fileInfo = {
        filename: newFileName + ".pdf",
        path: "book/" + newFileName + '.pdf'
    };
    try {
        const newDoc = CreateNewDoc(fileInfo.path);

        if (Array.isArray(target)) {
            MakeFilesToADoc(target, newDoc);
        }
    } catch (e) {
        console.log(e)
    }

    return fileInfo;
}
function CreatePDFWithSetting(setting, text, filePaht) {
    try {
        setting.paddingX *= 1;
        setting.paddingY *= 1;
        setting.pageWidth *= 1;
        setting.fontSize *= 1;
        const newDoc = CreateNewDoc(filePaht, setting);
        newDoc.text(text, setting.paddingX, setting.paddingY, { width: setting.pageWidth }).end();
    } catch (e) {
        console.log(e)
    }
}



function CreateNewDoc(filepath, setting) {
    setting = setting || pdfSetting.get();
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filepath));
    if (setting.fontFamily) doc.font('font/' + setting.fontFamily);
    if (setting.fontSize) doc.fontSize(setting.fontSize);
    return doc;
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