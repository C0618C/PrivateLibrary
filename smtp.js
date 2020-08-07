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
            console.log(error);
            if (callback) callback(false, error);
        } else {
            if (callback) callback(true);
        }
    });
}

exports.Init = (setting) => {
    mailServerSetting = setting;
}
exports.SendMail = SendAMail;