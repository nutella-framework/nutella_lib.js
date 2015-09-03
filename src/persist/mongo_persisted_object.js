/**
 * Persists a javascript object with inside a MongoDB document
 */

var MongoClient = require('mongodb').MongoClient;

/**
 * Creates a new persisted object
 * @param mongo_host
 * @param db
 * @param collection
 * @param doc_id
 * @return {Object}
 */
var MongoPersistedObject = function(mongo_host, db, collection, doc_id) {
    /**
     * Store the parameters
     */
    Object.prototype.host = function() {
        return mongo_host;
    };
    Object.prototype.db = function() {
        return db;
    };
    Object.prototype.mongoCollection = function() {
        return collection;
    };
    Object.prototype.doc = function() {
        return doc_id;
    };

    /**
     * Loads the persisted object into memory
     */
    Object.prototype.load = function(finished) {
        var cname = this.mongoCollection();
        MongoClient.connect('mongodb://' +  this.host() + ':27017/' + this.db(), (function(err, db) {
            if(err) return;
            var collection = db.collection(cname);
            collection.find({_id: this.doc()}).toArray(function(err, docs) {
                if(err || docs.length < 1) {
                    finished();
                    return;
                }

                var doc = docs[0];
                // Copy all the properties
                for (var k in doc) {
                    if (doc.hasOwnProperty(k)) {
                        this[k] = doc[k];
                    }
                }
                finished();
            }.bind(this));
        }).bind(this));
    };

    /**
     * Persists the object inside the mongo document
     */
    Object.prototype.save = function() {
        var cname = this.mongoCollection();
        MongoClient.connect('mongodb://' +  this.host() + ':27017/' + this.db(), (function(err, db) {
            if(err) return;
            var collection = db.collection(cname);
            if(this['_id']) {
                collection.update({_id: this['id']}, this, function(){
                });
            }
            else {
                this['_id'] = this.doc();
                collection.insert(this, function(){
                });
            }

        }).bind(this));
    };

    // Create instance and return it
    return {};
};




module.exports = MongoPersistedObject;