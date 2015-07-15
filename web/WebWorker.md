## Using a Web Worker to run the game engine

The game engine is not the fastest thing in the world.

You do not want to run it on the main UI thread of your web browser.

Our solution is to wrap it into Web Worker and run it on a background thread. Communication between the UI and the engine is then done via asynchronous message passing. 

As a side-effect of this arrangement, the engine is pretty easy to embed into a web application (the Web Worker is a piece of self-contained Javascript).

------

### Usage

    <script>
       var w = new Worker("webworker.js");
       
       // set up message handler (receives data from engine)
       
       w.onmessage = function(ev){
				var d = ev.data;
				// ... see message format below
		}
		
       // load the game image		       
       
       w.postMessage({loadImage: file});
       
       // start it up
       
       w.postMessage({start: true});
       
       
    </script>
    

------

### Message Format

#### messages from the engine

TODO. Mostly (from [EngineWrapper.ts](../core/EngineWrapper.ts)):

	export interface EngineWrapperState {
		state: EngineState,
		channelData?: ChannelData,
		errorMessage?: string,
	}


    export const enum EngineState {
		loaded = 1,
		running = 2,
		completed = 100,
		error = -100,
	
		waitingForLineInput = 51,
		waitingForKeyInput = 52,
		waitingForGameSavedConfirmation = 53,
		waitingForLoadSaveGame = 54	
	}
	

#### commands to the engine

##### loadImage

`w.postMessage({loadImage: file})`, where `file` can be a `File` object or a URL (a string).
       
##### start

`w.postMessage({start: true})`

##### lineInput

`w.postMessage({lineInput: 'look around'})`

Send this when the engine is asking for a line input from the user.

##### keyInput

Send this when the engine is asking for a keypress.

##### enableSaveGame

By default, saving games is disabled. You can send `{enableSaveGame: true}`, which will give you an opportunity to receive Quetzal files that you can store somewhere (such as in `localStorage`).

##### saveSuccessful

Send `{saveSuccessful: true}` (or `false`} to signal that you have finished storing the save game file.

##### restore

Send `{restore: quetzal}` when the engine asks for a save game to be restored (or `false` when you don't have one).

`quetzal` here can be either an `ArrayBuffer` or a URL (string).


