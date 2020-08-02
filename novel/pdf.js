const PDFDocument = require('pdfkit');
const fs = require('fs');

function CreatePDF(target, newFileName) {
    // let ct = fs.readFileSync(filePath).toString();
    // CreateWithContext(ct, newFileName);
    try {
        const newDoc = CreateNewDoc(newFileName);

        if (Array.isArray(target)) {
            MakeFilesToADoc(target, newDoc);
        }
    } catch (e) {
        console.log(e)
    }
}


function CreateNewDoc(filename) {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream("book/" + filename + '.pdf'));
    doc
        .font('font/Alibaba-PuHuiTi-Medium.ttf')
        .fontSize(25);

    return doc;
}

function MakeFilesToADoc(files, doc) {
    files.forEach(file => {
        let context = fs.readFileSync(file.filepath).toString();
        doc.text(context, 100, 100).addPage();
    });

    doc.end();
}

console.log("pdf.js")
exports.Create = CreatePDF