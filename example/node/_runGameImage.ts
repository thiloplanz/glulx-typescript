// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/**
 * Simple command-line test driver using Node.js and readline.
 * 
 * $ cd example/node
 * $ tsc
 * $ node runGameImage.js someGameImage.ulx
 * 
 */
 
 /// <reference path='../../core/Engine.ts' />
 /// <reference path='../../node/node-0.11.d.ts' />
 
let readline = require('readline'); 

let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});


let fs = require('fs');

let buffer = fs.readFileSync(process.argv[2]);
let testGame = new FyreVM.MemoryAccess(0);
testGame.buffer = new Uint8Array(buffer);
testGame['maxSize'] = testGame.buffer.byteLength * 2;

let engine = new FyreVM.Engine(new FyreVM.UlxImage(testGame));

// enable FyreVM extensions
// engine.enableFyreVM = false;

// enable Glk emulation
engine.glkMode = 1;

function glk_window_clear(){
	readline.cursorTo(process.stdout, 0, 0);
	readline.clearScreenDown(process.stdout);
}

let prompt_line = "";
let room = "";

engine.lineWanted = function (callback){
	rl.question(`\u001b[1;36m${room} ${prompt_line}\u001b[0m`, callback);
}

engine.keyWanted = engine.lineWanted;
engine.transitionRequested = glk_window_clear;
engine.saveRequested = function(quetzal:FyreVM.Quetzal, callback){
	fs.writeFileSync(process.argv[2]+".fyrevm_saved_game", new Buffer(new Uint8Array(quetzal.serialize())));
	callback(true);
}
engine.loadRequested = function(callback){
	let x = fs.readFileSync(process.argv[2]+".fyrevm_saved_game");
	if (x){
		let q = FyreVM.Quetzal.load(new Uint8Array(x));
		callback(q);
	}else{
		console.error("could not find the save game file");
		callback(null);
	}
}
engine.outputReady = function (x){
	if (engine['glkHandlers']){
		engine['glkHandlers'][0x2A] = glk_window_clear;
	}
	if (x.MAIN !== undefined)
		process.stdout.write(x.MAIN);
	prompt_line = x.PRPT || prompt_line;
	room = x.LOCN || room;
}

engine.run();