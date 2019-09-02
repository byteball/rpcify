/*jslint node: true */
"use strict";
var rpc = require('json-rpc2');

var server = rpc.Server.$create({
	'websocket': true, // is true by default 
	'headers': { // allow custom headers is empty by default 
		'Access-Control-Allow-Origin': '*'
	}
});

function listen(rpcPort, rpcInterface, timeout){
	var httpServer = server.listen(rpcPort, rpcInterface);
	if (timeout)
		httpServer.timeout = timeout;
}

// func must have a callback as last argument
// the callback must have error as first argument
function exposeByNameAndFunction(name, func, bNoErrors){
	if (typeof name !== 'string')
		throw Error('first arg is not a string');
	if (typeof func !== 'function')
		throw Error('second arg is not a function');
	server.expose(name, function(args, opt, cb){
		var function_args = [];
		if (Array.isArray(args))
			function_args = function_args.concat(args);
		else // object
			function_args.push(args);
		function_args.push(function(){
			if (arguments[0] && !bNoErrors) // error
				return cb(arguments[0]);
			var result = [];
			for (var i=0; i<arguments.length; i++) // copy
				result[i] = arguments[i];
			if (!bNoErrors)
				result.shift(); // remove 1st null arg
			if (result.length === 1) // (null, result)
				return cb(null, result[0]);
			// more than 2 arguments, the rpc result will be an array
			cb(null, result);
		});
		func.apply(func, function_args);
	});
}

function exposeByFunction(func, bNoErrors){
	if (typeof func !== 'function')
		throw Error('not a function')
	exposeByNameAndFunction(func.name, func, bNoErrors);
}

function exposeByObject(obj, bNoErrors){
	if (typeof obj !== 'object')
		throw Error('not an object')
	for (var name in obj)
		exposeByNameAndFunction(name, obj[name], bNoErrors);
}

function exposeByArray(arr, bNoErrors){
	if (!Array.isArray(arr))
		throw Error('not an array')
	arr.forEach(function(func){
		exposeByFunction(func, bNoErrors);
	});
}

function expose(arg1, arg2, arg3){
	if (typeof arg1 === 'string')
		exposeByNameAndFunction(arg1, arg2, arg3);
	else if (typeof arg1 === 'function')
		exposeByFunction(arg1, arg2);
	else if (Array.isArray(arg1))
		exposeByArray(arg1, arg2);
	else if (typeof arg1 === 'object')
		exposeByObject(arg1, arg2);
	else
		throw Error('invalid args');
}

function exposeEvent(eventBus, event_name){
	eventBus.on(event_name, function(...args){
		server.broadcastToWS(event_name, args);
	})
}

exports.exposeEvent = exposeEvent;
exports.expose = expose;
exports.listen = listen;

