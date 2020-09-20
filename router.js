const bodyParser = require('body-parser');

const fs = require('fs')
const WebRoot = __dirname + "/Web";
const multer = require('multer')
let _servers;

exports.Init = function (servers, NovelLibrary) {
    _servers = servers;
    let web = servers.webServer;
    // 创建 application/x-www-form-urlencoded 编码解析
    var urlencodedParser = bodyParser.urlencoded({ extended: false })

    web.get("/", (req, res) => {
        res.sendFile(WebRoot + '/index.html');
    });
    web.get("/script/:filename", (req, res) => {
        res.sendFile(WebRoot + `/script/${req.params.filename}.js`);
    });
    //动态的样式文件
    web.get("/style/:filename", (req, res) => {
        let fileName = req.params.filename;
        // res.set('Content-Type', 'text/css; charset=UTF-8');
        // res.set('Content-Type22', 'text/css; charset=UTF-8');
        res.type('css');
        if (/(.*).acss$/.test(fileName)) {
            let action = require(WebRoot + `/style/active/` + RegExp.$1);
            action.exec(req).then((result) => res.send(result));
        }
        else
            res.sendFile(WebRoot + `/style/${fileName}`);
    });
    web.get("/page/:filename", (req, res) => {
        res.sendFile(WebRoot + `/${req.params.filename}.html`);
    });
    web.get("/img/:filename", (req, res) => {
        res.sendFile(WebRoot + `/img/${req.params.filename}`);
    });
    web.get("/fonts/:filename", (req, res) => {
        res.sendFile(`${servers.fileServer.FONT_DIR_PATH}/${req.params.filename}`);
    });

    /*** Web服务 ***/
    //具体某个小说页
    web.get("/item/:id", (req, res) => {
        res.sendFile(WebRoot + "/item.html");
    });
    //具体某个小说页
    web.route("/read/:novelid/:cachefile/(:curfile?)").get((req, res) => {
        res.sendFile(WebRoot + "/reading.html");
    }).post((req, res) => {
        res.send(NovelLibrary.Solution.GetNovelForReading(req.params.novelid, req.params.cachefile, req.params.curfile));
    });

    //系统设置页
    web.get("/setting", (req, res) => {
        res.sendFile(WebRoot + "/setting.html");
    });
    web.get("/favicon.ico", (req, res) => {
        res.sendFile(WebRoot + "/img/libraries-32.ico");
    });




    /*** 提供的API ***/

    {    /** 针对书库的API **/
        //首页加载书库所有书籍
        web.get("/api/solution/getitems", (req, res) => {
            res.send(JSON.stringify(NovelLibrary.Solution.GetItems()));
        });

        //删除书库中的某本书
        web.delete("/api/solution/deleteitem", urlencodedParser, (req, res) => {
            res.send(NovelLibrary.Solution.DeleteItem(req.body.id, req.body.isDelFile));
        });
    }


    {    /** 单本书籍的API **/
        //读取某个小说目录——重新抓取目录
        web.post("/api/novel/index", urlencodedParser, (req, res) => {
            let cache = req.body.isUseCache == "true";
            res.send(NovelLibrary.Solution.GetNoevlIndex(req.body.id.split("#")[0], cache));
        });

        web.post("/api/novel/loadchapters", urlencodedParser, (req, res) => {
            let cache = req.body.isUseCache == "true";
            NovelLibrary.Loader.DownLoadOneChapter(req.body.id, req.body.url, cache, req.body.file, req.body.host);
            res.send("started");
        });
        //将某章设置为隐藏
        web.post("/api/novel/ignorechapter", urlencodedParser, (req, res) => {
            NovelLibrary.Solution.SetIgnore(req.body.id, req.body.url);
            res.send(JSON.stringify({ status: "success" }));
        });
    }

    {/** 文件相关的API */
        web.post("/api/fs/dirstatus", urlencodedParser, (req, res) => {
            let curPath = req.body.curPath;
            servers.fileServer.GetDirStatus(curPath).then((status) => {
                res.send(JSON.stringify(status));
            });
        });
        web.post("/api/fs/delete", urlencodedParser, (req, res) => {
            let curPath = req.body.target;
            let type = req.body.type;
            if (type == "floder") {
                servers.fileServer.DeleteFloder(curPath);
            } else if (type == "file") {
                servers.fileServer.DeleteFile(curPath);
            }

            res.send("ok");
        });

        const fileStorage = multer.diskStorage({
            destination: function (req, file, cb) {
                let saveDir = "";
                switch (req.body.type) {
                    case "font": saveDir = servers.fileServer.FONT_DIR_PATH; break;
                    case "upload_book": saveDir = servers.fileServer.TEMP_FILE_PATH + "/tempbook/" + req.body.bookname; break;
                }
                cb(null, saveDir);
            },
            filename: function (req, file, cb) {
                cb(null, file.originalname)
            }
        })
        const fontUpload = multer({ storage: fileStorage })
        web.post("/api/fs/upload", fontUpload.fields([
            { name: 'font', maxCount: 9999 },                  //上传字体
            { name: 'upload_book', maxCount: 9999 }            //上传的图书
        ]), (req, res) => {
            if (req.body.type == "upload_book") {     //上传图书成功后：记录书籍、分割章节、转移存放、清理中间文件
                console.log("TODO: 上传图书成功后：记录书籍、分割章节、转移存放、清理中间文件");
            }
            res.json({ result: "success" });
        });
        web.delete("/api/fs/upload/:fileName", (req, res) => {
            try {
                const { fileName } = req.params
                fs.unlinkSync(`${servers.fileServer.FONT_DIR_PATH}/${fileName}`)
                res.json({ result: 'success' })
            } catch (e) {
                console.error(e)
                res.json({ result: 'error' })
            }

        });
    }
    {/** 校阅相关的API */
        web.get("/api/proofread/getrule", (req, res) => {
            res.sendFile(servers.fileServer.PROOFREAD_RULE_PATH);
        });
        web.put("/api/proofread/saverule", bodyParser.json({ limit: '2mb' }), (req, res) => {
            servers.fileServer.SaveProofread(req.body);
            res.send(JSON.stringify({ "result": "success" }));
        });
        web.put("/api/proofread/savetobook", bodyParser.json({ limit: '2mb' }), (req, res) => {
            NovelLibrary.Solution.SetProofread(req.body.id, req.body.proofread);
            res.send(JSON.stringify({ "result": "success" }));
        });
    }
    {   /** 其它API **/
        web.route("/api/setting/rule")
            .get((req, res) => {
                res.sendFile(servers.fileServer.RULE_FILE_PATH);
            })
            .put(bodyParser.json({ limit: '1mb' }), (req, res) => {
                NovelLibrary.Loader.ChangeRule(req.body);
                servers.fileServer.UpdateRuleFile(req.body)
                res.send(`{"statu":"success"}`);
            });

        web.route("/api/setting/pdf").get((req, res) => {
            res.send(JSON.stringify(NovelLibrary.SettingManager.pdf.get()));
        }).put(bodyParser.json({ limit: '1mb' }), (req, res) => {
            res.send(NovelLibrary.SettingManager.pdf.set(req.body));
        });

        web.get("/api/setting/font", (req, res) => {
            servers.fileServer.GetFontFamily().then(fonts => {
                res.send(JSON.stringify(fonts));
            });
        });

        web.post("/api/setting/viewpdf", bodyParser.json({ limit: '1mb' }), (req, res) => {
            // res.send(NovelLibrary.SettingManager.pdf.set(req.body));
            const PDFCreater = require("./novel/pdf");
            let tempFileName = "temp_" + new Date().getTime() + ".pdf";
            PDFCreater.CreateWithSetting(req.body, req.body.text, servers.fileServer.TEMP_FILE_PATH + "/" + tempFileName, (fileInfo) => {
                res.send(tempFileName);
            });
        });

        web.get("/view/pdf/:filename", (req, res) => {
            res.sendFile(servers.fileServer.TEMP_FILE_PATH + "/" + req.params.filename);
        });

        web.route("/api/setting/kindle").get((req, res) => {
            res.send(JSON.stringify(NovelLibrary.SettingManager.kindle.get()));
        }).put(bodyParser.json({ limit: '1mb' }), (req, res) => {
            res.send(NovelLibrary.SettingManager.kindle.set(req.body));
        });

        web.post("/api/email/send", bodyParser.json({ limit: '1mb' }), (req, res) => {
            let mail = req.body;
            mail.callback = (result, err) => {
                res.send(JSON.stringify({
                    result: result,
                    err: err && err.message
                }));
            }

            if (mail.files) {
                mail.files.forEach(file => {
                    if (file.isRelativeFile) {
                        file.path = ServerMapPath(file.path);
                    }
                });
            }

            servers.MailServer.SendMail(mail);
        });
    }

    servers.MapPath = ServerMapPath;
}

//Socket通信的应答
exports.socketApi = function (socket, socketServer, NovelLibrary) {
    socket.on('Novel/LoadIndex', (msg) => {
        //目前首页载入按钮用的是这儿
        NovelLibrary.Loader.LoadNovelIndex(msg, (id, novel, err) => {
            if (err) {
                socketServer.emit('Novel/LoadIndex/Fail', msg, err);
                return;
            }
            socketServer.emit('Novel/LoadIndex/Finish', id, novel);
        });
        //TEST: 测试用
        // Novel.Solution.AddNewItem(msg,"测试的标题",true);
    });
    socket.on('Novel/Download', (novel) => {
        NovelLibrary.Loader.DownloadNovel(novel);
    });

}


function ServerMapPath(urlPath) {
    console.log("要找到这个地址", urlPath);

    //TODO: 这儿应该根据路由规则实现，而不是写对照表
    if (urlPath.startsWith("/view/pdf/")) {
        urlPath = _servers.fileServer.TEMP_FILE_PATH + "/" + urlPath.replace("/view/pdf/", "");
    }

    return urlPath;
}