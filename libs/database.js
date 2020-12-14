var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;
var url = 'mongodb+srv://dinhtatuanlinh:164342816@cluster0.ktgtg.mongodb.net/phuc?retryWrites=true&w=majority';

var db;


function connectdatabase(collection, database) {
    return new Promise((res, rej) => {
        MongoClient.connect(url, function(err, result) {
            if (err) {
                console.log(err)
            } else {
                db = result.db(database);
                db.collection(collection, (err, result) => {

                    if (err) {
                        rej(err);
                    }
                    res(result);
                })
            }
        })
    })
}

function getdata(col, args) {
    return new Promise((res, rej) => {
        if (args == undefined) {
            col.find({}).toArray(function(err, result) {
                if (err) rej(err);
                res(result);
            });
        } else {
            // res(col.find(args));
            col.find(args).toArray(function(err, result) {
                if (err) rej(err);
                res(result);
            });
        }

    })
}

// -------------------------
// ket noi database
// -------------------------
// insert data
function insertdata(collection, database, data) {
    return new Promise(async(res, rej) => {
        var col = await connectdatabase(collection, database);
        // var collection = await connectcollection(co, db);
        col.insertOne(data, (err, result) => {
            if (err) {
                console.log(err);
            }
            res(result);
        });
    })
}
// get list
function getlist(collection, database, args) {
    return new Promise(async(res, rej) => {
        var col = await connectdatabase(collection, database);
        var list = await getdata(col, args);
        // console.log(list);
        res(list);
    })
}
// edit một record
function editARecord(collection, database, data, args) {
    return new Promise(async(res, rej) => {
        var col = await connectdatabase(collection, database);
        col.update(args, data, function(err, result) {
            if (err) throw err
            res('update thành công');
        })
    })
}

// delete 1 record
function deleteARecord(collection, database, args) {
    return new Promise(async(res, rej) => {
        var col = await connectdatabase(collection, database);
        // console.log('123');
        col.deleteOne(args, function(err, result) {
            if (err) throw err;

            res("1 document deleted"); //phải res() ra thì các dòng code tiếp theo mới có thể chạy
        });
        // MongoClient.connect(url, function(err, db) {
        //     if (err) throw err;
        //     var dbo = db.db(database);
        //     dbo.collection(collection).deleteOne(args, function(err, obj) {
        //         if (err) throw err;
        //         console.log("1 document deleted");
        //         db.close();
        //     });
        // });
    })
}
// insert many
function insertmany(collection, database, data){
    return new Promise(async(res, rej) =>{
        var col = await connectdatabase(collection, database);
        col.insertMany(data, function(err, result){
            if (err) throw err;
            res("insert many thành công")
        })
    })
}
module.exports = {
    insertdata: insertdata,
    getlist: getlist,
    editARecord: editARecord,
    deleteARecord: deleteARecord,
    insertmany: insertmany,
}