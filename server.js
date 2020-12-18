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
var clienturl = 'http://127.0.0.1:5500/views/';


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
    // upload nguoi tham gia
    if (order.req === 'uploadpaticipantlist' && order.id !== undefined && order.id != null) {

        var sessionargs = {companyId: order.id};

        var sessioninfo = await database.getlist(sessionCollection, db, sessionargs);
        var sessionId = {_id: ObjectId(sessioninfo[0]._id)};
        var sessiondata = {};
        sessiondata.ngaybuoi = sessioninfo[0].ngaybuoi;
        sessiondata.startngaybuoi = sessioninfo[0].startngaybuoi;
        sessiondata.endngaybuoi = sessioninfo[0].endngaybuoi;
        sessiondata.numberbuoi = sessioninfo[0].numberbuoi;
        sessiondata.companyId = sessioninfo[0].companyId;
        sessiondata.session = sessioninfo[0].session;
        sessiondata.paticipantnumber = sessioninfo[0].paticipantnumber;
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
                    E: 'paticipantName',
                    F: 'paticipantPhone',
                    G: 'paticipantEmail',
                    H: 'attendsessions'
                }
            })
            result = result.Sheet1;
            result.shift();
            result.forEach(async element => {
                delete element.stt;
                element.sessionId = sessioninfo[0]._id.toString();
                element.attendsessions = element.attendsessions.split(",");
                element.ngaybuoi = [];
                element.startngaybuoi = [];
                element.endngaybuoi = [];
                for(var i = 0; i < element.attendsessions.length; i++){
                    element.attendsessions[i] = parseInt(element.attendsessions[i]);
                }
                for(var i = 0; i < element.attendsessions.length; i++){
                    element.ngaybuoi[i] = sessioninfo[0].ngaybuoi[element.attendsessions[i] - 1];
                    element.startngaybuoi[i] = sessioninfo[0].startngaybuoi[element.attendsessions[i] - 1];
                    element.endngaybuoi[i] = sessioninfo[0].endngaybuoi[element.attendsessions[i] - 1];
                    sessiondata.paticipantnumber[element.attendsessions[i] - 1] = sessiondata.paticipantnumber[element.attendsessions[i] - 1] + 1;
                }
                var insertvalue = await database.insertdata(paticipantCollection, db, element);
                // sendemail
                var from = 'tuanlinh-aiamcorporation@gmail.com';
                var to = element.paticipantEmail;
                var subject = `Đăng ký tham gia sự kiện ${element.eventinfo}`;
                var buoi = ``;
                j = 8;
                for(var i = 0; i < element.attendsessions.length; i++){
                    buoi += `buổi ${element.attendsessions[i]}: ngày ${element.ngaybuoi[i]}, từ ${element.startngaybuoi[i]}h tới ${element.endngaybuoi[i]}h`;
                    if(isNaN(element.attendsessions[i+1])){
                        break;
                        
                    }else{
                        buoi += ` và `;
                    }
                }
                var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${element.eventinfo} của công ty ${element.companyname}, ${buoi}. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}memberform.html?paticipantinfo&${insertvalue.insertedId}`;
                var emailresult = await email.sendemail(from, to, subject, emailcontent);
            })

            await database.editARecord(sessionCollection, db, sessiondata, sessionId);
            // var returnresult = await database.insertmany(paticipantCollection, db, data);
            // console.log(returnresult);
            // var f = files[Object.keys(files)[0]];
            // var workbook = xlsx.readFile(f.path);
            // var sheet_name_list = workbook.SheetNames;
            // console.log('3');
            // // workbook = JSON.stringify(workbook);
            // console.log(workbook);
        });
        res.writeHead(301, { Location: `${clienturl}index.html` });
        res.end();
        return;
    }
    // edit paticipant info
    if(order.req === "editpaticipant" && order.id !== undefined && order.id != null){
        args = { _id: ObjectId(order.id) };
        var form = new formidable.IncomingForm();
        var paticipantinfo = await database.getlist(paticipantCollection, db, args)
        var editdata = {};
        editdata.attendsessions = [];
        editdata.ngaybuoi = [];
        editdata.startngaybuoi = [];
        editdata.endngaybuoi = [];
        editdata.companyId = paticipantinfo[0].companyId;
        editdata.sessionId = paticipantinfo[0].sessionId;
        editdata.companyname = paticipantinfo[0].companyname;
        editdata.eventinfo = paticipantinfo[0].eventinfo;
        // console.log(paticipantinfo);
        var args1 = { _id: ObjectId(paticipantinfo[0].sessionId)};
        var sessioninfo = await database.getlist(sessionCollection, db, args1);

        form.parse(req, async function(err, fields, file) {
            
            editdata.paticipantName = fields.paticipantName;
            editdata.paticipantPhone = fields.paticipantPhone;
            editdata.paticipantEmail = fields.paticipantEmail;
            var j = 8;
            for(var i = 0; i < Object.keys(fields).length - 8; i++){// bắt đầu từ vị trí thứ 9 là buổi tham gia
                editdata.attendsessions[i] = parseInt(fields[Object.keys(fields)[j]]);
                j++;
            }
            
            var result = paticipantinfo[0].attendsessions.concat(editdata.attendsessions);// gộp 2 mảng
            var same = result.filter((item, index) => result.indexOf(item) !== index);// lấy ra các phần tử giống nhau trong 2 mảng
            
            var m = 0;
            
            result = editdata.attendsessions.concat(same);
            var add = [];
            
            for(var i = 0; i < result.length; i++){
                var temp = result[i];
                if(result.filter((value) =>{return value === temp}).length === 1){
                    add[m] = result.filter((value) =>{return value === temp})[0];
                    m++;
                }
            }
            result = paticipantinfo[0].attendsessions.concat(same);
            var remove = [];
            m = 0;
            for(var i = 0; i < result.length; i++){
                var temp = result[i];
                if(result.filter((value) =>{return value === temp}).length === 1){
                    remove[m] = result.filter((value) =>{return value === temp})[0];
                    m++;
                }
            }
            var sessiondata = {};
            
            sessiondata.ngaybuoi = sessioninfo[0].ngaybuoi;
            sessiondata.startngaybuoi = sessioninfo[0].startngaybuoi;
            sessiondata.endngaybuoi = sessioninfo[0].endngaybuoi;
            sessiondata.numberbuoi = sessioninfo[0].numberbuoi;
            sessiondata.companyId = sessioninfo[0].companyId;
            sessiondata.session = sessioninfo[0].session;
            sessiondata.paticipantnumber = [];
            for(var i = 0; i < same.length; i++){
                sessiondata.paticipantnumber[same[i]-1] = sessioninfo[0].paticipantnumber[same[i]-1];
            }
            for(var i = 0; i < add.length; i++){
                if(sessioninfo[0].paticipantnumber[add[i]-1] + 1 > sessioninfo[0].numberbuoi[add[i]-1]){
                    res.writeHead(301, { Location: `${clienturl}memberform.html?paticipantinfo&${order.id}` });
                    res.end();
                    return;
                }
                sessiondata.paticipantnumber[add[i]-1] = sessioninfo[0].paticipantnumber[add[i]-1] + 1;
            }

            for(var i = 0; i < remove.length; i++){
                sessiondata.paticipantnumber[remove[i]-1] = sessioninfo[0].paticipantnumber[remove[i]-1] - 1;
            }
            console.log(sessiondata.paticipantnumber[3]);
            for(var i = 0; i < parseInt(sessioninfo[0].session); i++){
                if(typeof sessiondata.paticipantnumber[i] === "undefined"){
                    sessiondata.paticipantnumber[i] = null;
                }
            }
            for(var i = 0; i < sessiondata.paticipantnumber.length; i++){
                if(typeof sessiondata.paticipantnumber[i] === "undefined" || sessiondata.paticipantnumber[i] === null){
                    sessiondata.paticipantnumber[i] = sessioninfo[0].paticipantnumber[i];
                }
            }
            for(var i = 0; i < editdata.attendsessions.length; i++){
                editdata.ngaybuoi[i] = sessioninfo[0].ngaybuoi[editdata.attendsessions[i] - 1];
                editdata.startngaybuoi[i] = sessioninfo[0].startngaybuoi[editdata.attendsessions[i] - 1];
                editdata.endngaybuoi[i] = sessioninfo[0].endngaybuoi[editdata.attendsessions[i] - 1];
            }

            var number = parseInt(fields.session);
            // console.log(sessiondata);
            // console.log(editdata);
            await database.editARecord(paticipantCollection, db, editdata, args)
            await database.editARecord(sessionCollection, db, sessiondata, args1)
            // sendemail
            var from = 'tuanlinh-aiamcorporation@gmail.com';
            var to = editdata.paticipantEmail;
            var subject = `Đăng ký tham gia sự kiện ${fields.eventinfo}`;
            var buoi = ``;
            j = 8;
            for(var i = 0; i < number; i++){
                buoi += `buổi ${parseInt(fields[Object.keys(fields)[j]])}: ngày ${sessioninfo[0].ngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}, từ ${sessioninfo[0].startngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}h tới ${sessioninfo[0].endngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}h`;
                if(isNaN(parseInt(fields[Object.keys(fields)[j+1]]))){
                    break;
                    
                }else{
                    buoi += ` và `;
                }
                j++
            }
            var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname}, ${buoi}. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}memberform.html?paticipantinfo&${order.id}`;
            var emailresult = await email.sendemail(from, to, subject, emailcontent);

        });
        res.writeHead(301, { Location: `${clienturl}index.html` });
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
            // console.log(fields);
            //path tmp trên server
            var data = {};
            var sessiondata = {};
            // data.attend = [];
            data.companyId = fields.companyId;
            data.sessionId = fields.sessionId;
            data.companyname = fields.companyname;
            data.eventinfo = fields.eventinfo;
            data.paticipantName = fields.paticipantName;
            data.paticipantPhone = fields.paticipantPhone;
            data.paticipantEmail = fields.paticipantEmail;
            var args = {_id: ObjectId(fields.sessionId)};
            var sessioninfo = await database.getlist(sessionCollection, db, args)
            // console.log(sessioninfo);
            sessiondata.ngaybuoi = sessioninfo[0].ngaybuoi;
            sessiondata.startngaybuoi = sessioninfo[0].startngaybuoi;
            sessiondata.endngaybuoi = sessioninfo[0].endngaybuoi;
            sessiondata.numberbuoi = sessioninfo[0].numberbuoi;
            sessiondata.companyId = sessioninfo[0].companyId;
            sessiondata.session = sessioninfo[0].session;
            sessiondata.paticipantnumber = sessioninfo[0].paticipantnumber;
            var number = parseInt(fields.session);
            
            
            data.attendsessions = [];
            data.ngaybuoi = [];
            data.startngaybuoi = [];
            data.endngaybuoi = [];
            // console.log(Object.keys(fields).length);
            var j = 8;
            // console.log(parseInt(fields[Object.keys(fields)[j]]));
            for(var i = 0; i < Object.keys(fields).length - 8; i++){// bắt đầu từ vị trí thứ 9 là buổi tham gia
                data.attendsessions[i] = parseInt(fields[Object.keys(fields)[j]]);
                j++;
            }
            for(var i = 0; i < data.attendsessions.length; i++){
                data.ngaybuoi[i] = sessioninfo[0].ngaybuoi[data.attendsessions[i] - 1];
                data.startngaybuoi[i] = sessioninfo[0].startngaybuoi[data.attendsessions[i] - 1];
                data.endngaybuoi[i] = sessioninfo[0].endngaybuoi[data.attendsessions[i] - 1];
                sessiondata.paticipantnumber[data.attendsessions[i] - 1] = sessiondata.paticipantnumber[data.attendsessions[i] - 1] + 1;
                if(sessiondata.paticipantnumber[data.attendsessions[i] - 1] > sessiondata.numberbuoi[data.attendsessions[i] - 1]){
                    res.writeHead(301, { Location: `${clienturl}memberform.html?companyinfo&${data.companyId}` });
                    res.end();
                    return;
                }
            }

            await database.editARecord(sessionCollection, db, sessiondata, args);
            var insertvalue = await database.insertdata(paticipantCollection, db, data);

            // sendemail
            var from = 'tuanlinh-aiamcorporation@gmail.com';
            var to = data.paticipantEmail;
            var subject = `Đăng ký tham gia sự kiện ${fields.eventinfo}`;
            var buoi = ``;
            j = 8;
            for(var i = 0; i < number; i++){
                buoi += `buổi ${parseInt(fields[Object.keys(fields)[j]])}: ngày ${sessioninfo[0].ngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}, từ ${sessioninfo[0].startngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}h tới ${sessioninfo[0].endngaybuoi[parseInt(fields[Object.keys(fields)[j]])-1]}h`;
                if(isNaN(parseInt(fields[Object.keys(fields)[j+1]]))){
                    break;
                    
                }else{
                    buoi += ` và `;
                }
                j++
            }
            var emailcontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname}, ${buoi}. Email này thay cho giấy mời. Truy cập vào link sau để sửa thông tin ${clienturl}memberform.html?paticipantinfo&${insertvalue.insertedId}`;
            var emailresult = await email.sendemail(from, to, subject, emailcontent);
            // console.log(emailresult);
            // sendsms
            // var phonenumber = fields.paticipantPhone;
            // var smscontent = `Bạn đã đăng ký thành công tham gia sự kiện ${fields.eventinfo} của công ty ${fields.companyname} từ ngày ${fields.start} tới ngày ${fields.end}.`;
            // var smsresult = await sms.sendsms(phonenumber, smscontent)
            // console.log(smsresult);
            // lấy số lượng người đã đăng ký
            // args = { _id: ObjectId(fields.companyId) };
            // var company = await database.getlist(companiesCollection, db, args);
            // if (company[0].paticipant < company[0].number) {
            //     await database.insertdata(paticipantCollection, db, data);
            //     company[0].paticipant = company[0].paticipant + 1;
            //     delete company[0]._id;
            //     database.editARecord(companiesCollection, db, company[0], args);
            // }

        });
        res.writeHead(301, { Location: `${clienturl}index.html` });
        res.end();
        return;
        
    }
    // xóa 1 company record
    if (order.req === 'deletecompany' && order.id !== undefined && order.id != null) {
        // console.log('companylist');
        args1 = { _id: ObjectId(order.id) };
        args2 = { companyId: order.id };
        var companylist = await database.getlist(companiesCollection, db, args);
        // console.log(companylist);
        var form = new formidable.IncomingForm();
        //Thiết lập thư mục chứa file trên server
        form.uploadDir = "uploads/";
        var newpath = form.uploadDir + companylist[0].logoname;
        fs.unlinkSync(newpath);
        var sessioninfo = await database.getlist(sessionCollection, db, args2);
        var sessionid = {_id: ObjectId(sessioninfo[0]._id)}
        var result1 = await database.deleteARecord(companiesCollection, db, args1);
        var result2 = await database.deleteARecord(sessionCollection, db, sessionid);
        res.writeHead(301, { Location: `${clienturl}index.html` });
        res.end();
        return;

    }
    // edit một company
    if (order.req === 'editcompany' && order.id !== undefined && order.id != null) {
        args = { _id: ObjectId(order.id) };
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
            sessiondata.paticipantnumber = [];
            data.companyinfo = fields.companyinfo;
            data.companyname = fields.companyname;
            data.eventinfo = fields.eventinfo;
            data.session = fields.session;
            var companyinfo = await database.getlist(companiesCollection, db, args);

            if (file.logo.name) {
                data.logoname = file.logo.name;
                var path = file.logo.path;
                //thiết lập path mới cho file
                var newpath = form.uploadDir + file.logo.name;
                fs.rename(path, newpath, function(err) {
                    if (err) throw err;
                    // res.end('Upload Thanh cong!');
                });
                var oldpath = form.uploadDir + companyinfo[0].logoname;
                fs.unlinkSync(oldpath);
            }else{
                data.logoname = companyinfo[0].logoname;
            }
            
            await database.editARecord(companiesCollection, db, data, args);
            var sessionargs = { companyId: order.id};
            var sessioninfo = await database.getlist(sessionCollection, db, sessionargs);
            // console.log(sessioninfo);
            var sessionid = {_id: ObjectId(sessioninfo[0]._id)}
            var number = parseInt(data.session);
            var j = 4;
            sessiondata.companyId = order.id;
            sessiondata.session = fields.session;
            sessiondata.paticipantnumber = sessioninfo[0].paticipantnumber
            for(var i = 0; i < number; i++){
                sessiondata.ngaybuoi[i] = fields[Object.keys(fields)[j]];
                sessiondata.startngaybuoi[i] = fields[Object.keys(fields)[j+1]];
                sessiondata.endngaybuoi[i] = fields[Object.keys(fields)[j+2]];
                sessiondata.numberbuoi[i] = fields[Object.keys(fields)[j+3]];
                j = j + 4;
            }
            console.log(sessiondata);
            await database.editARecord(sessionCollection, db, sessiondata, sessionid);
            // res.writeHead(301, { Location: 'https://noteatext.com/portfolio/phuc/' });

            res.writeHead(301, { Location: `${clienturl}index.html` });
            res.end();
        });
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
            sessiondata.paticipantnumber = [];
            data.companyinfo = fields.companyinfo;
            data.companyname = fields.companyname;
            data.logoname = file.logo.name;
            data.eventinfo = fields.eventinfo;
            data.session = fields.session;
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
            sessiondata.companyId = dataresult.insertedId.toString();
            sessiondata.session = fields.session;
            for(var i = 0; i < number; i++){
                
                sessiondata.ngaybuoi[i] = fields[Object.keys(fields)[j]];
                sessiondata.startngaybuoi[i] = fields[Object.keys(fields)[j+1]];
                sessiondata.endngaybuoi[i] = fields[Object.keys(fields)[j+2]];
                sessiondata.numberbuoi[i] = parseInt(fields[Object.keys(fields)[j+3]]);
                sessiondata.paticipantnumber[i] = 0;
                j = j + 4;
            }
            // console.log(sessiondata);
            var sesdata = await database.insertdata(sessionCollection, db, sessiondata);
            // đưa dữ liệu vào db
            // database.insertdata(companiesCollection, db, data);
            // res.writeHead(301, { Location: 'https://noteatext.com/portfolio/phuc/' });

        });
        res.writeHead(301, { Location: `${clienturl}index.html` });
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
        
        // get paticipant info
        if(order.req === "paticipantinfo" && order.id !== undefined && order.id != null){
            var args = { _id: ObjectId(order.id) };
            var paticipantinfo = await database.getlist(paticipantCollection, db, args);
            paticipantinfo = JSON.stringify(paticipantinfo);
            res.end(paticipantinfo);
            return;
        }
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
            // res.writeHead(301, { Location: '${clienturl}index.html' });
            // res.writeHead(302, { Location: `${clienturl}paticipantlist.html?paticipantlist&${order.companyid}` });
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
        if (order.req === 'getsession' && order.id !== undefined && order.id != null) {

            args = {companyId: order.id};
            var sessiondata = await database.getlist(sessionCollection, db, args);
            // console.log(sessiondata);
            sessiondata = JSON.stringify(sessiondata);
            res.end(sessiondata);
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