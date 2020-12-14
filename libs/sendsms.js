var twilio = require('twilio');
class XL_Goi_tin_nhan {
    sendsms(so_dien_thoai, noi_dung) {
        return new Promise((res, rej) => {
            var accountSid = 'ACecd098b60ca8b942831144af8b16f83e'; // Your Account SID from www.twilio.com
            var authToken = '6bcde2cfd60409752dc537e688687e39'; // Your Auth Token from www.twilio.com
            var client = new twilio(accountSid, authToken);
            res(client.messages.create({
                body: noi_dung,
                to: so_dien_thoai,
                from: '+12565884805' // Số điện thoại dịch vụ cung cấp 
            }));
        })
    }
}
var Goi_Tin_nhan = new XL_Goi_tin_nhan()
module.exports = Goi_Tin_nhan