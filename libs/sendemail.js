var nodemailer = require('nodemailer');
class XL_GOI_THU_DIEN_TU {
    sendemail(from, to, subject, body) {
        return new Promise((res, rej) => {
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'tearbuttock1@gmail.com', // user gmail
                    pass: '0123698745' // pass gmail
                }
            });

            var mailOptions = {
                from: `Email được gửi từ <${from}>`,
                to: to,
                subject: subject,
                html: body
            };
            // Gọi phương thức sendMail -> Promise
            res(transporter.sendMail(mailOptions));
        })

    }
}
var Goi_thu = new XL_GOI_THU_DIEN_TU()
module.exports = Goi_thu