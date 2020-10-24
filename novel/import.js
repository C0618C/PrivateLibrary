/**
 * 这负责本地上传文件到书架或直接上传到Kindle
 */

class Importer {
    constructor(Solution, servers) {
        this.Solution = Solution;
        this.servers = servers;
    }

    /**
     * 上传图书
     * @param {*} setting 
     */
    ImportBooks(setting) {
        if (!setting.isSpilt) {
            this.SendTheFile(setting);
        }
    }


    GetImportPath(bookname) {
        return this.servers.fileServer.TEMP_FILE_PATH + "/tempbook/" + bookname;
    }


    /**
     * 上传的文件直接发邮件
     * @param {*} setting 
     */
    SendTheFile(setting) {
        let files = [];
        let fileList = setting.fileList.split(",");
        for (let file of fileList) {
            files.push({
                filename: file,
                path: this.GetImportPath(setting.bookname) + "/" + file
            });
        }

        this.servers.MailServer.SendMail({
            title: setting.bookname,
            content: "本文件通过 PrivateLibrary 自动生成并发送。" + JSON.stringify(files),
            files: files,
            callback: (result, err) => {
                if (result) {
                    //Servers.socketServer.emit("Novel/Download/Finish", novel.id, novel);
                    console.log("\x1B[32m 邮件发送成功 \x1B[0m");
                } else {
                    console.error("尝试发送邮件失败:", err);
                }
            }
        });
    }
}


exports.Importer = Importer;