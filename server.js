var http = require('http');
var fs = require('fs');

var querystring = require('query-string'); // hàm xử lý chuỗi url
var mongodb = require('mongodb');
var formidable = require('formidable'); // module này để lấy thông tin từ form
const excelToJson = require('convert-excel-to-json');

var sms = require('./libs/sendsms');
var email = require('./libs/sendemail');
var database = require('./libs/database');
var getfiles = require('./libs/getfiles');

var ObjectId = require('mongodb').ObjectID;
var MongoClient = mongodb.MongoClient;
var url = 'mongodb+srv://dinhtatuanlinh:164342816@cluster0.ktgtg.mongodb.net/phuc?retryWrites=true&w=majority';
var db;



var Port = normalizePort(process.env.PORT || 1000);
var db = 'phuc';
var companiesCollection = 'companies';
var paticipantCollection = 'clients';
var sessionCollection = 'session';
var args;



var Dich_vu = http.createServer(async function(req, res) {
    var url1 = req.url.replace('/', '');
    var order = querystring.parse(url1);
    var receivedString = "";
    // file excel
    if (req.url === '/uploadpaticipantlist' && req.method.toLowerCase() === 'post') {

        var form = new formidable.IncomingForm();
        form.uploadDir = "excels/";
        form.parse(req, async function(err, fields, file) {

            var path = file.paticipantlist.path;
            var result = excelToJson({
                source: fs.readFileSync(path),
                // source: fs.readFileSync(form.uploadDir + file.paticipantlist.name),
                columnToKey: {
                    A: 'stt',
                    B: 'companyId',
                    C: 'companyname',
                    D: 'eventinfo',
                    E: 'start',
                    F: 'end',
                    G: 'session',
                    H: 'number',
                    I: 'paticipantName',
                    J: 'paticipantPhone',
                    K: 'paticipantEmail'
                }
            })
            result = result.Sheet1;
            result.shift();
            var data = [];
            result.forEach(element => {
                delete element.stt;
                data.push(element);
            })
            console.log(typeof data);
            var returnresult = await database.insertmany(paticipantCollection, db, data);
            console.log(returnresult);
            // var f = files[Object.keys(files)[0]];
            // var workbook = xlsx.readFile(f.path);
            // var sheet_name_list = workbook.SheetNames;
            // console.log('3');
            // // workbook = JSON.stringify(workbook);
            // console.log(workbook);
        });
        res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
        res.end();
        return;
    }
    // add paticipant

    if (req.url === '/addpaticipant' && req.method.toLowerCase() === 'post') {

        //Khởi tạo form
        var form = new formidable.IncomingForm();
        // console.log(form);
        //xử lý upload
        form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
            if (err) throw err;
            // console.log('abc');
            //path tmp trên server
            var data = {};

            data.companyId = fields.companyId;
            data.companyname = fields.companyname;
            data.eventinfo = fields.eventinfo;
            data.start = fields.start;
            data.end = fields.end;
            data.session = fields.session;
            data.number = fields.number;
            data.paticipantName = fields.paticipantName;
            data.paticipantPhone = fields.paticipantPhone;
            data.paticipantEmail = fields.paticipantEmail;
            // sendemail
            var from = 'tuanlinh-aiamcorporation@gmail.com';
            var to = 'dinhtatuanlinh@gmail.com';
            var subject = `Đăng ký tham gia sự kiện ${fields.eventinfo}`;
            var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname} từ ngày ${fields.start} tới ngày ${fields.end}. Email này thay cho giấy mời.`;
            var emailresult = await email.sendemail(from, to, subject, emailcontent);
            console.log(emailresult);
            // sendsms
            var phonenumber = fields.paticipantPhone;
            var smscontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname} từ ngày ${fields.start} tới ngày ${fields.end}.`;
            var smsresult = await sms.sendsms(phonenumber, smscontent)
            console.log(smsresult);
            // lấy số lượng người đã đăng ký
            args = { _id: ObjectId(fields.companyId) };
            var company = await database.getlist(companiesCollection, db, args);
            if (company[0].paticipant < company[0].number) {
                await database.insertdata(paticipantCollection, db, data);
                company[0].paticipant = company[0].paticipant + 1;
                delete company[0]._id;
                database.editARecord(companiesCollection, db, company[0], args);
            }

        });

        res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
        res.end();
        return;
    }
    // add company
    if (req.url === '/addcompany' && req.method.toLowerCase() === 'post') {
        // console.log(req)
        //Khởi tạo form
        var form = new formidable.IncomingForm();
        //Thiết lập thư mục chứa file trên server
        form.uploadDir = "uploads/";
        //xử lý upload
        form.parse(req, async function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
            //path tmp trên server
            var data = {};
            var sessiondata = {};
            sessiondata.ngaybuoi = [];
            sessiondata.startngaybuoi = [];
            sessiondata.endngaybuoi = [];
            sessiondata.numberbuoi = [];
            data.companyinfo = fields.companyinfo;
            data.companyname = fields.companyname;
            data.logoname = file.logo.name;
            data.eventinfo = fields.eventinfo;
            data.session = fields.session;
            data.paticipant = 0
            if (file.logo.name) {
                var path = file.logo.path;
                //thiết lập path mới cho file
                var newpath = form.uploadDir + file.logo.name;
                fs.rename(path, newpath, function(err) {
                    if (err) throw err;
                    // res.end('Upload Thanh cong!');
                });
            }
            var dataresult = await database.insertdata(companiesCollection, db, data);
            var number = parseInt(data.session);
            var j = 4;
            sessiondata.companyId = dataresult.insertedId
            sessiondata.session = fields.session;
            for(var i = 0; i < number; i++){
                
                sessiondata.ngaybuoi[i] = fields[Object.keys(fields)[j]];
                sessiondata.startngaybuoi[i] = fields[Object.keys(fields)[j+1]];
                sessiondata.endngaybuoi[i] = fields[Object.keys(fields)[j+2]];
                sessiondata.numberbuoi[i] = fields[Object.keys(fields)[j+3]];
                j = j + 4;
            }
            // console.log(sessiondata);
            var sesdata = await database.insertdata(sessionCollection, db, sessiondata);
            // đưa dữ liệu vào db
            // database.insertdata(companiesCollection, db, data);
            // res.writeHead(301, { Location: 'https://noteatext.com/portfolio/phuc/' });

        });
        res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
        res.end();
        return;
    }



    req.on('data', (chunk) => { receivedString += chunk; }); // nhận dữ liệu từ client gửi lên
    // console.log(recievedString);
    //Nếu request là uplooad và method là post
    req.on('end', async() => {

        res.setHeader("Access-Control-Allow-Origin", '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        // xóa người tham gia
        if (req.url === '/deletemember') {
            receivedString = JSON.parse(receivedString);

            var args0 = { _id: ObjectId(receivedString.paticipantid) };
            var args1 = { _id: ObjectId(receivedString.companyid) };
            var args2 = { companyId: receivedString.companyid }
            var company = await database.getlist(companiesCollection, db, args1);
            var result = await database.deleteARecord(paticipantCollection, db, args0);
            company[0].paticipant = company[0].paticipant - 1;
            delete company[0]._id;
            database.editARecord(companiesCollection, db, company[0], args1);
            var paticipantlist = await database.getlist(paticipantCollection, db, args2);
            paticipantlist = JSON.stringify(paticipantlist);
            // console.log(paticipantlist);
            // res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
            // res.writeHead(302, { Location: `http://127.0.0.1:5500/views/paticipantlist.html?paticipantlist&${order.companyid}` });
            res.end(paticipantlist);
            return;
        }
        // danh sách tham gia
        if (order.req === 'paticipantlist' && order.id !== undefined && order.id != null) {
            args = { companyId: order.id };
            // console.log(args);
            var companylist = await database.getlist(paticipantCollection, db, args);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }

        // xóa 1 company record
        if (order.req === 'deletecompany' && order.id !== undefined && order.id != null) {
            // console.log('companylist');
            args1 = { _id: ObjectId(order.id) };
            args2 = { companyId: ObjectId(order.id) };
            var companylist = await database.getlist(companiesCollection, db, args);
            // console.log(companylist);
            var form = new formidable.IncomingForm();
            //Thiết lập thư mục chứa file trên server
            form.uploadDir = "uploads/";
            var newpath = form.uploadDir + companylist[0].logoname;
            fs.unlinkSync(newpath);
            var result1 = await database.deleteARecord(companiesCollection, db, args1);
            var result2 = await database.deleteARecord(sessionCollection, db, args2);
            console.log(result2);
            res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
            res.end();
            return;

        }
        // edit một record
        if (order.req === 'editcompany' && order.id !== undefined && order.id != null) {
            args = { _id: ObjectId(order.id) };
            var form = new formidable.IncomingForm();
            //Thiết lập thư mục chứa file trên server
            form.uploadDir = "uploads/";
            //xử lý upload
            form.parse(req, function(err, fields, file) { // fields là các trường được gửi lên, file là file được gửi lên qua form
                //path tmp trên server
                var data = {};
                data.companyinfo = fields.companyinfo;
                data.companyname = fields.companyname;
                data.logoname = file.logo.name;
                data.eventinfo = fields.eventinfo;
                data.start = fields.start;
                data.end = fields.end;
                data.session = fields.session;
                data.number = field.number;
                if (file.logo.name) {
                    var path = file.logo.path;
                    //thiết lập path mới cho file
                    var newpath = form.uploadDir + file.logo.name;
                    fs.rename(path, newpath, function(err) {
                        if (err) throw err;
                        // res.end('Upload Thanh cong!');
                    });
                }

                database.editARecord(companiesCollection, db, data, args);
                // res.writeHead(301, { Location: 'https://noteatext.com/portfolio/phuc/' });

                res.writeHead(301, { Location: 'http://127.0.0.1:5500/views/index.html' });
                res.end();
            });
            return;
        }
        // lấy thông tin để đưa vào form edit
        if (order.req === 'companyinfo' && order.id !== undefined && order.id != null) {
            args = { _id: ObjectId(order.id) }; // nếu là ObjectID phải thêm var ObjectId = require('mongodb').ObjectID;
            var companylist = await database.getlist(companiesCollection, db, args);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }

        if (req.url === '/getcompanylist') {
            var companylist = await database.getlist(companiesCollection, db);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }
        // get session
        if (req.url === '/getsession') {

            var companylist = await database.getlist(sessionCollection, db);
            // console.log(companylist);
            companylist = JSON.stringify(companylist);
            res.end(companylist);
            return;
        }

        // lấy logo để hiển thị ngoài list
        if (order.req === 'getlogo' && order.name !== undefined && order.name != null) {
            Nhi_phan_Kq = getfiles.Doc_Nhi_phan_Media(order.name)
                // console.log('abc');
            res.setHeader("Access-Control-Allow-Origin", '*')
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(Nhi_phan_Kq, 'binary');
            return;
        }
        res.end('app is working');
    })

    // if (req.url === '/addnewcompany') {
    //     //xét header cho request
    //     res.writeHead('200', { 'Content-Type': 'text/html' });
    //     //Đọc file index và trả về dữ liệu
    //     fs.readFile('./views/form.html', 'utf8', function(err, data) {
    //         //nếu nỗi thì thông báo
    //         if (err) throw err;
    //         //không lỗi thì render data
    //         res.end(data);
    //     })
    // }
    // //xét header cho request
    // res.writeHead('200', { 'Content-Type': 'text/html' });
    // //Đọc file index và trả về dữ liệu
    // fs.readFile('./views/list.html', 'utf8', function(err, data) {
    //     //nếu nỗi thì thông báo
    //     if (err) throw err;
    //     //không lỗi thì render data
    //     res.end(data);
    // })
})
Dich_vu.listen(Port, console.log(`Dịch vụ Dữ liệu đang thực thi tại địa chỉ: http://localhost:${Port}`));
Dich_vu.on('error', onError);
Dich_vu.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}
/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof Port === 'string' ?
        'Pipe ' + Port :
        'Port ' + Port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = Dich_vu.address();
    var bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    console.log('Listening on ' + bind);
}