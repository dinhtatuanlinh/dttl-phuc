var File = require("fs");
var imgPath = "uploads";

function Doc_Nhi_phan_Media(Ten_Tap_tin) {
    var Nhi_phan = ""
    var Duong_dan = imgPath + "//" + Ten_Tap_tin
    if (File.existsSync(Duong_dan))
        Nhi_phan = File.readFileSync(Duong_dan)
    return Nhi_phan
}
module.exports = {
    Doc_Nhi_phan_Media: Doc_Nhi_phan_Media,
}