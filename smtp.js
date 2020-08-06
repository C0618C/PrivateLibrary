const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

let mailServerSetting = {};

//setup the transporter


function GetServer() {
    return mailServerSetting.email.match(/(?<=@)[^.]+/)[0];
}

function CreateTransport() {
    let setting = {
        service: "",
        auth: {
            user: "",
            pass: ""
        }
    };
    setting.service = GetServer();
    setting.service.auth.user = mailServerSetting.email;
    setting.service.auth.pass = mailServerSetting.pass;
    return nodemailer.createTransport(smtpTransport(setting));
}

function SendAMail({ callback, title, message, files, toMail }) {
    var mailOptions = {
        from: mailServerSetting.email,
        to: toMail || mailServerSetting.kindle_email,
        subject: title || "Send the mail by default",
        text: message || "This e-mail sent by PrivateLibrary!"
    };

    //添加附件
    if (files) {
        mailOptions.attachments = [];
        files.forEach(ff => {
            mailOptions.attachments.push({
                filename: ff.filename,
                path: ff.path
            });
        });
    }

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            //console.log('Email Sent ');
            if (callback) callback();
        }
    });
}

exports.Init = (setting) => {
    mailServerSetting = setting;
    console.log(mailServerSetting);
}
exports.SendMail = SendAMail;