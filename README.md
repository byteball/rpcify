# RPCify node.js modules

This module allows to expose the functions of node.js modules via JSON-RPC, which makes them available to other programs written in any language.

## Install
```sh
npm install https://github.com/byteball/rpcify.git
```

## Usage

```
var rpcify = require('rpcify');

var headlessWallet = require('headless-obyte');  // this is a module whose methods you want to expose via RPC
var balances = require('ocore/balances.js'); // another such module

// start listening on RPC port
rpcify.listen(6333, '127.0.0.1');

// expose some functions via RPC
rpcify.expose(headlessWallet.issueChangeAddressAndSendPayment);
rpcify.expose(balances.readBalance, true);
rpcify.expose([headlessWallet.readFirstAddress, headlessWallet.readSingleWallet, headlessWallet.issueOrSelectAddressByIndex], true);

```
After this point, the above functions will become available via JSON-RPC interface.  Node.js clients need to call
```
var rpc = require('json-rpc2');

var client = rpc.Client.$create(6333, '127.0.0.1');

client.call('issueChangeAddressAndSendPayment', [asset, amount, to_address, device_address], function(err, unit) {
    ...
});
```
which is similar to calling a function from a `require()`ed module.  Programs in other languages can also access the exposed node.js functions via RPC.

## API

You can expose any function that returns its result via callback.  The callback must be the last argument of the function.  

The parameters of the JSON-RPC request will be passed to the function as arguments.  The parameters can be of any type that JSON supports: `string`, `number`, `boolean`, `object`, but not `function`.  If the `params` of the JSON-RPC request is an array, it will be expanded to the list of arguments.  If it is an object, it will be passed as the 1st argument to the function.

The parameters of the callback will be returned in the JSON-RPC response.  By default, it is assumed that the first argument of the callback is an error.  If it is truthy, the request will end up with an error response:
```
{"jsonrpc":"2.0","error":{"code":-32603,"message":"not enough spendable funds from 4MIACTR3WJMC4UUKHHU3VX55LWW77EZW,QM63QOKZVOHGTMCKRQCB4GJVD4FCHL56 for 1000000000641"}
```
If the first argument of the callback is falsy, the request succeeds.  If there is only one remaining argument, it will be returned as the result of the JSON-RPC request.  If there are more remaining arguments, they will be wrapped in an array.

If the optional `bNoErrors` parameter of `expose()` (see below) is truthy, the request never ends with an error and the first and subsequent parameters of the callback are interpreted as the result.

To expose a function under its original name, use
```
rpcify.expose(func, bNoErrors);
```
To expose several functions under their original names, pass an array of functions:
```
rpcify.expose([func1, func2], bNoErrors);
```
To expose functions under different names, use this syntax:
```
rpcify.expose('func_name', func, bNoErrors);
rpcify.expose({func1_name: func1, func2_name: func2}, bNoErrors);
```

## Websocket & events

RPC commands can be send through a websocket, in this case events can be exposed and notified to all open connections.

```
var rpcify = require('rpcify');

var balances = require('ocore/balances.js'); // another such module
var eventBus = require('ocore/event_bus.js'); 

// start listening on RPC port
rpcify.listen(6333, '127.0.0.1');

// expose some functions 
rpcify.expose(balances.readBalance, true);

// expose some events 
rpcify.exposeEvent(eventBus, "my_transactions_became_stable");
rpcify.exposeEvent(eventBus, "new_my_transactions");

```
After this point, the above functions and events will become available via websocket interface. Example for Node.js client:
```
var WebSocket = require('ws');
var ws  = new WebSocket("ws://127.0.0.1:6333");

ws.on('open', function onWsOpen() {
	console.log("ws open");
	ws.send(JSON.stringify({"jsonrpc":"2.0", "id":1, "method":"readBalance", params:["LUTKZPUKQJDQMUUZAH4ULED6FSCA2FLI"]})); // send a command
});

ws.on('error', function onWsError(e){
	console.log("websocket error"+e);
})

ws.on('message', function onWsMessage(message){ // JSON responses
	console.error(message);
	// {"jsonrpc":"2.0","result":{"base":{"stable":0,"pending":0}},"error":null,"id":1} // response to readBalance
  // {"event":"my_transactions_became_stable","data":[["1pLZa3aVicNLE6vcClG2IvBe+tO0V7kDsxuzQCGlGuQ="]]} // event my_transactions_became_stable
});

```
