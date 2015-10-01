/**
 * Persists a javascript array inside a MongoDB collection
 */

var mongoCache = require('./mongo_cache');

var MongoClient = require('mongodb').MongoClient;

// Helper function used in order to extend the array
function extend(x, y){
    for(var key in y) {
        if (y.hasOwnProperty(key)) {
            x[key] = y[key];
        }
    }
    return x;
}


/**
 * Creates a new persisted array
 * @param mongo_host
 * @param db
 * @param collection
 * @return {Array}
 */
var MongoPersistedCollection = function(mongo_host, db, collection) {

    var arrayMongo = function() {
    };

    arrayMongo.prototype = Array.prototype;

    extend(arrayMongo.prototype, {
        /**
         * Store the parameters
         */
        host: function() {
            return mongo_host;
        },
        db: function() {
            return db;
        },
        mongoCollection: function() {
            return collection;
        },
        load: function(finished) {
            console.log('HERE');
            var self = this;
            var cname = this.mongoCollection();
            mongoCache.getConnection(this.host(), this.db(), (function(err, db) {
                if(err) return;
                var collection = db.collection(cname);
                collection.find().toArray(function(err, docs) {
                    if(err || docs.length < 1) {
                        finished();
                        return;
                    }

                    // Copy all the documents in the array
                    docs.forEach(function(doc) {
                        self.push(doc);
                    });
                    finished();
                }.bind(this));
            }).bind(this));
        },
        save: function() {
            var self = this;
            var cname = this.mongoCollection();
            mongoCache.getConnection(this.host(), this.db(), (function(err, db) {
                if(err) return;
                var collection = db.collection(cname);
                self.forEach(function(element) {
                    if(element['_id']) {
                        collection.update({_id: element['_id']}, element, function(){
                        });
                    }
                    else {
                        collection.insert(element, function(){
                        });
                    }
                });
            }).bind(this));
        }
    });

    // Create instance and return it
    return new arrayMongo();
};




module.exports = MongoPersistedCollection;