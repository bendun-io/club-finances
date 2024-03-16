const nodemailer = require('nodemailer');
const { loadSettings } = require('./settings');
const fs = require('fs');
const os = require('os');
const path = require('path');


const sendEmail = async (options) => {
    var email = options.email.trim();
    var subject = options.subject.trim();
    var message = options.message.trim();
    var attachments = options.attachments ?? [];
    var cc = options.cc ?? '';

    console.log('sendEmail', email, subject, message);

    var settings = loadSettings();

    let transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587, // 587
        secure: false, // true for 465, false for other ports
        auth: {
            user: settings.email.account,
            pass: settings.email.password
        },
        debug: true,
        tls: {
            ciphers:'SSLv3',
            rejectUnauthorized: false // do not fail on invalid certs
        }
    });

    let mailOptions = {
        from: `"${settings.orgname}" <${settings.email.account}>`, // sender address
        to: email, // list of receivers
        cc: cc, // CC receiver
        subject: subject, // Subject line
        text: message, // plain text body
        replyTo: settings.treasurer_email, // email address for replies
        attachments: attachments
    };


    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return {success: true};
    } catch (error) {
        console.error('Error sending email: ' + error);
        return {success: false, error: error};
    }
}

const testEmail = async (receiver, addAttachement=false) => {
    const filePath = path.join(os.homedir(), 'test.txt');
    fs.writeFileSync(filePath, 'This is a test email attachement from your clubfinance electron app');

    var attachment = {
        filename: 'test.txt',
        path: filePath
    }
    
    var options = {
        email: receiver,
        subject: 'Test email',
        message: 'This is a test email from your clubfinance electron app',
        attachments: addAttachement ? [attachment] : []
    }
    return sendEmail(options);
}

module.exports = { sendEmail, testEmail };