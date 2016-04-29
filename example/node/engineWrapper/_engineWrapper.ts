// Written in 2016 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/**
 * Node.js command line to invoke the "EngineWrapper" to run a single game step
 * 
 * $ cd example/node/engineWrapper
 * $ tsc
 * $ node engineWrapper.js someGameImage.ulx sessionName "look around"
 * 
 * What this does is:
 * 
 * 1) load the game image
 * 2) look for the latest savepoint for this session in the current working directory
 * 3) load that savepoint if found
 * 4) execute the game command given
 * 5) write the channel output to STDOUT
 * 6) create a new savepoint for the session
 * 
 * 
 * The implementation is pretty simplistic.
 * 
 * In particular, there are no "magic hooks" into the game engine.
 * All is done using the regular "save" and "restore" commands
 * (which are transmitted to the running game just as if a user
 * entered them). What this also means is that the (potentially heavy)
 * boot process of the game software is executed every time. 
 * 
 * 
 */
 
 /// <reference path='../../../core/EngineWrapper.ts' />
 /// <reference path='../../../node/node-0.11.d.ts' />

let imageFile = process.argv[2];

if (imageFile === undefined){
    console.error("The first argument must be a valid FyreVM enabled Glulx story file. (GBlorb's are not supported at this time)");
    process.exit(1)
}

if (imageFile == "--help"){
    console.info("USAGE: chester story.ulx session \"command\" turn");
}

let sessionName = process.argv[3];

if (sessionName === undefined){
    console.error("The second argument must be the name of the sessions stored ({sessionName}.{turn})");
    process.exit(1)
}

let command = process.argv[4];

let fs = require('fs');

let sessionData : FyreVM.Quetzal = null;
let turnData = process.argv[5];
let turn:number = 0;

if (!(turnData === undefined)) {
    turn = Number(turnData);
}

let sessionFile = sessionName;
let saveFile = "";

// Look for previous session files...
let guessTurn:number = 0;
let checkFile = "";
do {
    guessTurn++;
    checkFile = sessionFile + "." + guessTurn;
} while (fs.existsSync(checkFile));
guessTurn--;

// if user specified a turn, load that file
let loadFile = false;
if (turnData === undefined){
    if (guessTurn > 0) {
        saveFile = sessionFile + "." + (guessTurn + 1);
        sessionFile = sessionFile + "." + guessTurn;
        loadFile = true;
    } else {
        saveFile = sessionFile + ".1";
    }
} else {
    saveFile = sessionFile + "." + (turn + 1);
    sessionFile = sessionFile + "." + turn;
    loadFile = true;
}

// Start a branch off the request turn file...
if (fs.existsSync(saveFile)) {
    saveFile = sessionFile + ".1";
}

if (loadFile) {
    if (fs.existsSync(sessionFile)) {
        sessionData = FyreVM.Quetzal.load(new Uint8Array(fs.readFileSync(sessionFile)));
    } else {
        console.error("Cannot file specified session file: " + sessionFile);
    }
}

if (command === undefined){
    if (sessionData){
        console.error("Please specify a command or start a new session. This one is already in progress.");
        process.exit(1);
    }
}

let game = new FyreVM.MemoryAccess(0);
game.buffer = new Uint8Array(fs.readFileSync(imageFile));
game['maxSize'] = game.buffer.byteLength * 2;

// load the image
let engine = new FyreVM.EngineWrapper(game, true);

let result = engine.run();

if (result.state !== FyreVM.EngineState.waitingForLineInput){
    console.error(`engine does not accept input (state ${result.state})`);
    if (result.channelData){
        console.error(JSON.stringify(result.channelData));
    }
    process.exit(result.state);
}

// did we have an existing session? If so, load it
if (sessionData){
   engine.restoreSaveGame(sessionData);
}

// is there a command? If so, run it
if (command){
    let result = engine.receiveLine(command);
    console.info(JSON.stringify(result.channelData));
     // inject a "look" to create the undo buffer for our command
    engine.receiveLine("look")
    // and update the session with the undo state
    fs.writeFileSync(saveFile, new Buffer(new Uint8Array(engine.getUndoState().serialize())));
    
}
else {
    // if not, print the initial output
    if (result.channelData){
        console.info(JSON.stringify(result.channelData));  
    }
    // and save the game state
    fs.writeFileSync(saveFile, new Buffer(new Uint8Array(engine.saveGame().serialize())));
}
