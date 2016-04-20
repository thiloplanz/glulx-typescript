// Written in 2016 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * A simple demo of embedding EngineWrapper directly
 * (without going through a web worker) in a web browser
 */


/// <reference path='../../../core/EngineWrapper.ts' />
/// <reference path='../../../b64.ts' />

module Example {

export function loadGameImage(){
    var file = document.getElementById('gameImage')['files'][0];
    setText("status", "loading game image");
    setText('selectFile', '');
    var reader = new FileReader();
    reader.onload = function(ev){
        w = FyreVM.EngineWrapper.loadFromFileReaderEvent(ev, true)
        process(w.run())
       
    }
    reader.readAsArrayBuffer(file);
        
}


function process(result: FyreVM.EngineWrapperState){
     let c = result.channelData
     if (c) {
         if (c.MAIN){
            setText('MAIN',c.MAIN);
        }
        if (c.LOCN){
            setText('LOCN', c.LOCN);
        }
        if (c.SCOR || +c.SCOR === 0){
            setText('SCOR', "Score: "+c.SCOR);
        }
        if (c.TURN){
            setText('TURN', "Turn: "+c.TURN);
        }
        if (c.TIME){
            setText('TIME', Math.floor(+c.TIME / 100) +":"+ (+c.TIME % 100));
        }
        if (c.PRPT){
            promptLine = c.PRPT;
        }
     }
    
    
     switch(result.state){
         case FyreVM.EngineState.waitingForKeyInput:
         case FyreVM.EngineState.waitingForLineInput:
            setText('status', 'waiting for your input...');
			getInput();
			break;
         case FyreVM.EngineState.completed:
            setText('status', 'game over');
			break;
         case FyreVM.EngineState.waitingForLoadSaveGame: {
            let key = `fyrevm_saved_game_${Base64.fromByteArray(w.getIFhd())}`
            let q = localStorage[key]
            if (q) {
                q = FyreVM.Quetzal.base64Decode(q)
            }
            setTimeout( 
                () => process(w.receiveSavedGame(q))
                , 0)
            break;
         }
         case FyreVM.EngineState.waitingForGameSavedConfirmation: {
            let key = `fyrevm_saved_game_${Base64.fromByteArray(result.gameBeingSaved.getIFhdChunk())}`
            let q = result.gameBeingSaved.base64Encode()
            localStorage[key] = q
            setTimeout( 
                () => process(w.saveGameDone(true))
                , 0)
            break;
         }
         default:
            setText('status', "ERROR: unexpected Engine state "+result.state)
            console.error(result);
            break;
         
     }
}




function setText(id, text){
    document.getElementById(id).textContent = text
}


let promptLine;

function getInput(){
    var div = document.getElementById('PRPT');
    div.innerHTML = '<form onsubmit="Example.sendCommand(); return false;">'+promptLine+' <input size=80></input><form>';
    var input : any = div.getElementsByTagName('INPUT')[0];
    input.focus();
    input.scrollIntoView();	
}

 // the EngineWrapper, instance created when game image is loaded
let w : FyreVM.EngineWrapper;

export function sendCommand(){
    var div = document.getElementById('PRPT');
    var input : any = div.getElementsByTagName('INPUT')[0];
    var command = input.value;
    div.innerHTML = '';
    setText('status', 'processing ...');
    setText('MAIN', '\n\n\n... '+command);
    // kick off the engine wrapped in setTimeout
    // a) to return from the submit handler quickly
    // b) to limit recursion depth
    setTimeout( () => process(w.receiveLine(command)), 0)
 }

}