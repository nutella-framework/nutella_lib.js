requirejs.config({
    baseUrl: '..',
    paths: {
        app: '../app'
    }
});

requirejs(['nutella_lib'], function(nut) {
	console.log(nut.test())
});
