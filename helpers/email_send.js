const nodemailer = require('nodemailer');

const sendMail = async(email,subject,body)=> {
    try {
        return new Promise((resolve, reject) => {
                    const transport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
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
    }
    transport.sendMail(mailOptions,(error,info)=>{
        if(error){
            console.error('Error sending Email :',error);
            reject(false)
        }
        console.log('Email send :',info.response);
       resolve(true)
    })
        })
    } catch (err) {
        return false;
    }
}

module.exports = sendMail;