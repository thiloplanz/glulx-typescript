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

let imageFile = process.argv[2]
let sessionName = process.argv[3]

let command = process.argv[4]

let fs = require('fs')

let sessionData : FyreVM.Quetzal = null
let sessionFile = sessionName+".session"
if (fs.existsSync(sessionFile)){
    sessionData = FyreVM.Quetzal.load(new Uint8Array(fs.readFileSync(sessionFile)))
}


if (command === undefined){
    if (sessionData){
        console.error("Please specify a command or start a new session. This one is already in progress.")
        process.exit(1)
    }
}

let game = new FyreVM.MemoryAccess(0)
game.buffer = new Uint8Array(fs.readFileSync(imageFile))
game['maxSize'] = game.buffer.byteLength * 2

let engine = new FyreVM.EngineWrapper(game, true)

// load the image
engine.run();

// did we have an existing session? If so, load it
if (sessionData){
   engine.restoreSaveGame(sessionData)
}

// is there a command? If so, run it
if (command){
    let result = engine.receiveLine(command)
    console.info(JSON.stringify(result.channelData));   
}

// finally save the game
fs.writeFileSync(sessionFile, 
    new Buffer(new Uint8Array(engine.saveGame().serialize())))
