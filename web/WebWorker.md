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
    

Also see the [example code](../example/web/webworker.html).

------

### Message Format

The Web Worker that runs the game engine communicates with the outside world using messages that you send to it with `w.postMessage(payload)` and receive from it using the `w.onmessage` callback.

#### messages from the engine

When the engine wants to tell you (or needs to do) something,
it will send you a message, which mostly conforms to the [EngineWrapperState interface](../core/EngineWrapper.ts).

    w.onmessage = function(ev : MessageEvent){
		  let d : EngineWrapperState = ev.data;
		  let state: EngineState = d.state;
		  	
	}

###### EngineState

It contains an `EngineState` that you need to inspect
to figure out what kind of message this is, and what you need to do about it.

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
	
###### engine output	
	
The game output is sent via Channels. You should display them to the user as appropriate.

     console.info(d.channelData.MAIN)
     
     	
###### user input

When the game needs input from the user (such as the next command), it sends a message with the state `waitingForLineInput` or `waitingForKeyInput`. When you have that input, you need to send it back via a `lineInput` or `keyInput` command.

	

#### commands to the engine

    export interface WebWorkerCommand {
		// actions
		loadImage? : ArrayBuffer|string,
		start?: boolean,
		lineInput?: string,
		keyInput?: string,
		saveSuccessful?: boolean
		restore?: ArrayBuffer|string|boolean,
		// configuration
		enableSaveGame? : boolean,
	}


##### loadImage

`w.postMessage({loadImage: file})`, where `file` can be an `ArrayBuffer` object or a URL (a string).
       
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


