const bodyParser = require('body-parser');

const WebRoot = __dirname + "/Web";

exports.Init = function (servers, NovelLibrary) {
    let web = servers.webServer;
    // 创建 application/x-www-form-urlencoded 编码解析
    var urlencodedParser = bodyParser.urlencoded({ extended: false })

    web.get("/", (req, res) => {
        res.sendFile(WebRoot + '/index.html');
    });
    web.get("/script/:filename", (req, res) => {
        res.sendFile(WebRoot + `/script/${req.params.filename}.js`);
    });
    web.get("/page/:filename", (req, res) => {
        res.sendFile(WebRoot + `/${req.params.filename}.html`);
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
        //读取某个小说目录
        web.post("/api/novel/index", urlencodedParser, (req, res) => {
            let cache = req.body.isUseCache == "true";
            res.send(NovelLibrary.Solution.GetNoevlIndex(req.body.id.split("#")[0], cache));
        });

        web.post("/api/novel/loadchapters", urlencodedParser, (req, res) => {
            let cache = req.body.isUseCache == "true";
            NovelLibrary.Loader.DownLoadOneChapter(req.body.id, req.body.url, cache, req.body.file, req.body.host);
            res.send("started");
        });

    }

    {
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
            PDFCreater.CreateWithSetting(req.body, req.body.text, servers.fileServer.TEMP_FILE_PATH + "/" + tempFileName);
            res.send(tempFileName);
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
            servers.MailServer.SendMail(mail);
        });
    }
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