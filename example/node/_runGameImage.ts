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
  /// <reference path='../../node/core-on-node.ts' />
 /// <reference path='../../node/node-0.11.d.ts' />
 
let readline = require('readline'); 

let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let testGame = FyreVM.BufferMemoryAccess.loadFile(process.argv[2]);
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

engine.outputReady = function (x){
	if (engine['glkHandlers']){
		engine['glkHandlers'][0x2A] = glk_window_clear;
	}
	process.stdout.write(x.MAIN);
	prompt_line = x.PRPT || prompt_line;
	room = x.LOCN || room;
}

engine.run();