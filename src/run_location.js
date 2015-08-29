var nutella;

var _resources;

var LocationSubModule = function(main_nutella) {
    this.nutella = main_nutella;
    nutella = this.nutella;

    this._resources = {};
    _resources = this._resources;   // Global variable
    this._room = undefined;

    this._resourcesReady = false;
    this._roomReady = false;

    var self = this;

    // Download all resources
    this.nutella.net.request("location/resources", {}, function(reply) {
        reply.resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
        self._resourcesReady = true;

        if(self._roomReady == true && readyCallback != undefined) {
            readyCallback();
        }
    });

    // Update resources
    this.nutella.net.subscribe("location/resources/updated", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
    });

    // Add resources
    this.nutella.net.subscribe("location/resources/added", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            self._resources[resource.rid] = resource;
        });
    });

    // Remove resources
    this.nutella.net.subscribe("location/resources/removed", function(message) {
        var resources = message.resources;
        resources.forEach(function(resource) {
            delete self._resources[resource.rid];
        });
    });

    // Download the room dimension
    this.nutella.net.request("location/room", {}, function(reply) {
        self._room = reply;
        self._roomReady = true;

        if(self._resourcesReady == true && readyCallback != undefined) {
            readyCallback();
        }
    });

    // Update room dimension
    this.nutella.net.subscribe("location/room/updated", function(message) {
        self._room = message;
    });
};

// Resource list for notify the update
updateResources = [];
enterResources = [];
exitResources = [];

// Enter and exit callbacks
enterCallback = undefined;
exitCallback = undefined;

// Ready callback
readyCallback = undefined;


Object.defineProperty(LocationSubModule.prototype, 'resources', {
    get: function() {
        var self = this;

        var resources = [];

        Object.keys(this._resources).forEach(function(key) {
            resources.push(generateVirtualResource(self._resources[key]));
        });
        return resources;
    }
});

Object.defineProperty(LocationSubModule.prototype, 'resource', {
    get: function() {
        var self = this;

        var resource = {};

        // Create a virtual resource for every resource
        Object.keys(this._resources).forEach(function(key) {
            var r = self._resources[key];
            Object.defineProperty(resource, r.rid, {
                get: function() {
                    var virtualResource = generateVirtualResource(r);
                    return virtualResource;
                }
            });
        });
        return resource;
    }
});

Object.defineProperty(LocationSubModule.prototype, 'room', {
    get: function() {
        return this._room;
    }
});

function updateResource(resource) {
    var newResource = {};
    newResource.rid = resource.rid;
    if(resource.continuous != undefined) newResource.continuous = resource.continuous;
    if(resource.discrete != undefined) newResource.discrete = resource.discrete;

    newResource.parameters = [];

    for(p in resource.parameters) {
        newResource.parameters.push({key: p, value: resource.parameters[p]});
    }

    nutella.net.publish("location/resource/update", newResource);
}

function generateVirtualResource(resource) {
    var virtualResource = {};
    var rid = resource.rid;
    Object.defineProperty(virtualResource, 'rid', {
        get: function() {
            var resource = _resources[rid];
            return resource.rid;
        }
    });
    Object.defineProperty(virtualResource, 'model', {
        get: function() {
            var resource = _resources[rid];
            return resource.model;
        }
    });
    Object.defineProperty(virtualResource, 'type', {
        get: function() {
            var resource = _resources[rid];
            return resource.type;
        }
    });
    virtualResource.continuous = {
        get x() { return _resources[rid].continuous.x; },
        set x(value) { _resources[rid].continuous.x = value; updateResource(_resources[rid]); },

        get y() { return _resources[rid].continuous.y; },
        set y(value) { _resources[rid].continuous.y = value; updateResource(_resources[rid]); }
    };
    virtualResource.discrete = {
        get x() { return _resources[rid].discrete.x; },
        set x(value) { _resources[rid].discrete.x = value; updateResource(_resources[rid]); },

        get y() { return _resources[rid].discrete.y; },
        set y(value) { _resources[rid].discrete.y = value; updateResource(_resources[rid]); }
    };
    virtualResource.proximity = {
        get rid() { return _resources[rid].proximity.rid; },
        get continuous() {
            return {x: _resources[rid].proximity.continuous.x, y: _resources[rid].proximity.continuous.y};
        },
        get discrete() {
            return {x: _resources[rid].proximity.discrete.x, y: _resources[rid].proximity.discrete.y};
        },
        get distance() {
            return _resources[rid].proximity.distance;
        }
    };

    Object.defineProperty(virtualResource, 'notifyUpdate', {
        get: function () {
            return updateResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (updateResources.indexOf(virtualResource.rid) == -1) {
                    updateResources.push(virtualResource.rid);
                }
            }
            else {
                if (updateResources.indexOf(virtualResource.rid) != -1) {
                    updateResources.remove(updateResources.indexOf(virtualResource.rid));
                }
            }
        }
    });


    Object.defineProperty(virtualResource, 'notifyEnter', {
        get: function () {
            return enterResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (enterResources.indexOf(virtualResource.rid) == -1) {
                    enterResources.push(virtualResource.rid);
                    nutella.net.subscribe("location/resource/static/" + virtualResource.rid + "/enter", function(message) {
                        message.resources.forEach(function(dynamicResource) {
                            var staticVirtualResource = virtualResource;
                            var dynamicVirtualResource = generateVirtualResource(dynamicResource);
                            if(enterCallback != undefined) {
                                enterCallback(dynamicVirtualResource, staticVirtualResource);
                            }
                        });
                    });
                }
            }
            else {
                if (enterResources.indexOf(virtualResource.rid) != -1) {
                    enterResources.splice(enterResources.indexOf(virtualResource.rid), 1);
                    nutella.net.unsubscribe("location/resource/static/" + virtualResource.rid + "/enter");
                }
            }
        }
    });

    Object.defineProperty(virtualResource, 'notifyExit', {
        get: function () {
            return exitResources.indexOf(virtualResource.rid) != -1;
        },
        set: function (condition) {
            if(condition == true) {
                if (exitResources.indexOf(virtualResource.rid) == -1) {
                    exitResources.push(virtualResource.rid);
                    nutella.net.subscribe("location/resource/static/" + virtualResource.rid + "/exit", function(message) {
                        message.resources.forEach(function(dynamicResource) {
                            var staticVirtualResource = virtualResource;
                            var dynamicVirtualResource = generateVirtualResource(dynamicResource);
                            if(exitCallback != undefined) {
                                exitCallback(dynamicVirtualResource, staticVirtualResource);
                            }
                        });
                    });
                }
            }
            else {
                if (exitResources.indexOf(virtualResource.rid) != -1) {
                    exitResources.splice(exitResources.indexOf(virtualResource.rid), 1);
                    nutella.net.unsubscribe("location/resource/static/" + virtualResource.rid + "/exit");
                }
            }
        }
    });

    virtualResource.parameter = {};

    var parameters = [];
    for(p in resource.parameters) {
        parameters.push({value: _resources[rid].parameters[p], key: p});
    }
    parameters.forEach(function(p) {
        Object.defineProperty(virtualResource.parameter, p.key, {
            get: function() {
                return p.value;
            },
            set: function(value) {
                _resources[rid].parameters[p.key] = value;
                updateResource(_resources[rid]);
            }
        });
    });

    return virtualResource;
}

LocationSubModule.prototype.resourceUpdated = function(callback) {
    nutella.net.subscribe("location/resources/updated", function(message) {
        message.resources.forEach(function(resource) {
            var virtualResource = generateVirtualResource(resource);
            if(updateResources.indexOf(resource.rid) != -1) {
                callback(virtualResource);
            }
        });
    });
};

// /location/resource/static/<rid>/enter
LocationSubModule.prototype.resourceEntered = function(callback) {
    enterCallback = callback;
};

LocationSubModule.prototype.resourceExited = function(callback) {
    exitCallback = callback;
};

LocationSubModule.prototype.ready = function(callback) {
    readyCallback = callback;
};

module.exports = LocationSubModule;
