const Cache = require("../../../novel/cache").Cache;

function btoa(string) {
    // 转为base64
    return Buffer.alloc(string.length, string).toString('base64');
}

function atob(base64Str) {
    // base64反解析为字符串
    return Buffer.alloc(base64Str.length, base64Str, 'base64').toString();
}


exports.exec = async (req) => {
    return await Cache.GetFontFamily().then(async (result) => {
        let cssFile = "";
        result.forEach(font => {
            let fontName = btoa(encodeURIComponent(font));
            fontName = "fn" + fontName.replace(/[=+]/g, "");
            cssFile += `@font-face {
    font-family: ${fontName};
    src: url('/fonts/${font}');
}\n\n`;
        });
        return cssFile;
    });
}
