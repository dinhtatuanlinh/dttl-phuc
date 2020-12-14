var Dia_chi_Dich_vu = "https://phuc-dttl.herokuapp.com/"
var lh = 'http://localhost:1000/'

// console.log(currentUrl);

function lay_thong_tin_cong_ty(Tham_so, id) {
    var Du_lieu = {};
    var Dia_chi_Xu_ly;
    var Xu_ly_HTTP = new XMLHttpRequest();
    id == null ? Dia_chi_Xu_ly = `${lh}${Tham_so}` : Dia_chi_Xu_ly = `${lh}req=${Tham_so}&id=${id}`;
    Xu_ly_HTTP.open("POST", Dia_chi_Xu_ly, false);
    Xu_ly_HTTP.send("");
    var Chuoi_JSON = Xu_ly_HTTP.responseText;
    // if (Chuoi_JSON = "xoa member thanh cong") { location.reload() }
    if (Chuoi_JSON != "") Du_lieu = JSON.parse(Chuoi_JSON);
    return Du_lieu;

}

function deletearecord(Tham_so, data) {
    var Dia_chi_Xu_ly;
    var Xu_ly_HTTP = new XMLHttpRequest();
    Dia_chi_Xu_ly = `${lh}${Tham_so}`;

    Xu_ly_HTTP.open("POST", Dia_chi_Xu_ly, false);
    Xu_ly_HTTP.send(data);
    var Chuoi_JSON = Xu_ly_HTTP.responseText;
    var Du_lieu = {};
    if (Chuoi_JSON != "") Du_lieu = JSON.parse(Chuoi_JSON);
    return Du_lieu;
}
function getsession(){
    var Du_lieu = {};
    var Dia_chi_Xu_ly = `${Dia_chi_Dich_vu}getsession`
    var Xu_ly_HTTP = new XMLHttpRequest();
    Xu_ly_HTTP.open("POST", Dia_chi_Xu_ly, false);
    Xu_ly_HTTP.send("");
    var Chuoi_JSON = Xu_ly_HTTP.responseText;
    // if (Chuoi_JSON = "xoa member thanh cong") { location.reload() }
    if (Chuoi_JSON != "") Du_lieu = JSON.parse(Chuoi_JSON);
    return Du_lieu;
}