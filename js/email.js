const nodemailer = require('nodemailer');
const { loadSettings } = require('./settings');

const sendEmail = async (email, name, message) => {
    console.log('sendEmail', email, name, message);

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
        subject: name, // Subject line
        text: message, // plain text body
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

const testEmail = async (receiver) => {
    return sendEmail(receiver, 'Test email', 'This is a test email from your clubfinance electron app');
}

module.exports = { sendEmail, testEmail };