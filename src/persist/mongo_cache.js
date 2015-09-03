var MongoClient = require('mongodb').MongoClient;

var connections = {};

module.exports.getConnection = function(host, db, callback) {

    if(connections[host] == undefined) {
        MongoClient.connect('mongodb://' +  host + ':27017/' + db, function(err, _db) {
            connections[host] = {};
            connections[host][db] = _db;
            callback(err, _db);
        });
    }
    else if(connections[host][db] == undefined) {
        MongoClient.connect('mongodb://' +  host + ':27017/' + db, function(err, _db) {
            connections[host][db] = _db;
            callback(err, _db);
        });
    }
    else {
        callback(undefined, connections[host][db]);
    }


};