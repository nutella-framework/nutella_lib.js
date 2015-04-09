var LocationSubModule = function(main_nutella) {
    this.nutella = main_nutella;

    this._resources = [];
    this._initialized = false;

    var self = this;

    // Download all resources
    this.nutella.net.request("location/resources", {}, function(reply) {
        console.log(reply);
        self._resources = reply.resources;
        this._initialized = true;
    });
};


Object.defineProperty(LocationSubModule.prototype, 'resources', {
    get: function() {
        return this._resources;
    }
});

Object.defineProperty(LocationSubModule.prototype, 'resource', {
    get: function() {
        var resource = {};

        // Create a virtual resource for every resource
        this._resources.forEach(function(r) {
            Object.defineProperty(resource, r.rid, {
                get: function() {
                    var virtualResource = {};
                    virtualResource.continuous = {
                        get x() { return r.continuous.x; },
                        set x(value) { r.continuous.x = value; updateResource(r); },

                        get y() { return r.continuous.y; },
                        set y(value) { r.continuous.y = value; updateResource(r); }
                    };
                    virtualResource.discrete = {
                        get x() { return r.discrete.x; },
                        set x(value) { r.discrete.x = value; updateResource(r); },

                        get y() { return r.discrete.y; },
                        set y(value) { r.discrete.y = value; updateResource(r); }
                    };
                    virtualResource.proximity = {
                        get rid() { return r.proximity.rid; },
                        get continuous() {
                            return {x: r.proximity.continuous.x, y: r.proximity.continuous.y};
                        },
                        get discrete() {
                            return {x: r.proximity.discrete.x, y: r.proximity.discrete.y};
                        }
                    };

                    virtualResource.notifyUpdate = false;
                    virtualResource.notifyEnter = false;
                    virtualResource.notifyExit = false;

                    virtualResource.parameter = {};

                    var parameters = [];
                    for(p in r.parameters) {
                        parameters.push({value: r.parameters[p], key: p});
                    }
                    parameters.forEach(function(p) {
                        Object.defineProperty(virtualResource.parameter, p.key, {
                            get: function() {
                                return p.value;
                            },
                            set: function(value) {
                                r.parameters[p.key] = value;
                                updateResource(r);
                            }
                        });
                    });

                    return virtualResource;
                }
            });
        });
        return resource;
    }
});

function updateResource(resource) {
    var newResource = {};
    newResource.rid = resource.rid;
    if(resource.continuous != undefined) newResource.continuous = resource.continuous;
    if(resource.discrete != undefined) newResource.continuous = resource.discrete;

    newResource.parameters = [];

    for(p in resource.parameters) {
        newResource.parameters.push({key: p, value: resource.parameters[p]});
    }

    nutella.net.publish("location/resource/update", newResource);
}


module.exports = LocationSubModule;
