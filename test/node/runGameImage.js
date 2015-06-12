// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/*
* Simple test driver using Node.js.
*
* In the top directory, do
*  
*   $ tsc
*   $ node test/node/runGameImage.js someGameImage.ulx
*
*/


var fs = require("fs");
eval(fs.readFileSync('test.js').toString());

var readline = require('readline');
	
var rl = readline.createInterface({
  	input: process.stdin,
  	output: process.stdout
});
	
var testGame = FyreVM.BufferMemoryAccess.loadFile(process.argv[2]);

var engine = new FyreVM.Engine(new FyreVM.UlxImage(testGame));
	
var prompt = "";
var room = "";
	
engine.lineWanted = function(callback){
	rl.question(prompt, function(answer){
		callback(answer);
	});
}
engine.keyWanted = engine.lineWanted;
engine.outputReady = function(x){
	rl.write(x.MAIN);
	prompt = x.PRPT;
	room = x.ROOM;
}
engine.run();
