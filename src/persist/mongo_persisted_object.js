/**
 * Persists a javascript object with inside a MongoDB document
 */

var mongoCache = require('./mongo_cache');

/**
 * Creates a new persisted object
 * @param mongo_host
 * @param db
 * @param collection
 * @param doc_id
 * @return {Object}
 */
var MongoPersistedObject = function(mongo_host, db, collection, doc_id) {

    var object = function() {

    };

    /**
     * Store the parameters
     */
    object.prototype.host = function() {
        return mongo_host;
    };
    object.prototype.db = function() {
        return db;
    };
    object.prototype.mongoCollection = function() {
        return collection;
    };
    object.prototype.doc = function() {
        return doc_id;
    };

    /**
     * Loads the persisted object into memory
     */
    object.prototype.load = function(finished) {
        var cname = this.mongoCollection();
        mongoCache.getConnection(this.host(), this.db(), (function(err, db) {
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
    object.prototype.save = function() {
        var cname = this.mongoCollection();
        mongoCache.getConnection(this.host(), this.db(), (function(err, db) {
            if(err) return;
            var collection = db.collection(cname);
            if(this['_id']) {
                collection.update({_id: this['_id']}, this, function(){
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
    return new object();
};




module.exports = MongoPersistedObject;