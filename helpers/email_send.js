const nodemailer = require('nodemailer');

const sendMail = async(email,subject,body,html)=> {
    try {
        return new Promise((resolve, reject) => {
                    const transport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions ={
         from: {
                    name: "ECOMMERCE SHOP APP",
                    address: process.env.EMAIL 
                },
        to: email,
        subject: subject,
        text: body,
        html: html,
    }
    transport.sendMail(mailOptions,(error,info)=>{
        if(error){
            if (error.code === 'EAUTH') {
                console.error('Email Auth Error: Invalid Gmail credentials. If you have 2FA enabled, you MUST use an "App Password" instead of your regular password.');
            } else {
                console.error('Error sending Email :', error);
            }
            resolve(false);
            return;
        }
        if (info) {
            console.log('Email send :', info.response);
        }
       resolve(true)
    })
        })
    } catch (err) {
        return false;
    }
}

module.exports = sendMail;