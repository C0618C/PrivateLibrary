const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

let mailServerSetting = {};

//setup the transporter


function GetServer(user) {
    return user.match(/(?<=@)[^.]+/)[0];
}

function CreateTransport(user, pass) {
    let setting = {
        service: GetServer(mailServerSetting.email),
        auth: {
            user: mailServerSetting.email,
            pass: mailServerSetting.pass
        }
    };
    if (user && pass) {
        setting.service = GetServer(user);
        setting.auth.user = user;
        setting.auth.pass = pass;
    }
    return nodemailer.createTransport(smtpTransport(setting));
}

function SendAMail({ callback, title, content, files, mailto, sender, pass }) {
    try {
        console.log("准备发送邮件：", title, content, files)
        var mailOptions = {
            from: sender || mailServerSetting.email,
            to: mailto || mailServerSetting.kindle_email,
            subject: title || "Send the mail by default",
            text: content || "This e-mail sent by PrivateLibrary!"
        };

        //添加附件
        if (files) {        //NOTE: 这儿回有将服务器任意文件通过邮件发出去的bug，会泄露服务器信息。
            mailOptions.attachments = [];
            files.forEach(ff => {
                mailOptions.attachments.push(ff);
            });
        }

        CreateTransport(sender, pass).sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("【SMTP】发送邮件失败：", error);
                if (callback) callback(false, error);
            } else {
                console.log("【SMTP】邮件发送完成。");
                if (callback) callback(true);
            }
        });
    }
    catch (err) {
        console.error("尝试发送邮件时失败：", err);
    }
}

exports.Init = (setting) => {
    mailServerSetting = setting;
}
exports.SendMail = SendAMail;