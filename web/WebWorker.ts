// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * Adapts an EngineWrapper in a way that can be used from
 * a WebWorker (browser background thread), controlled
 * from the main thread by simple command and result objects.
 * 
 */


/// <reference path='../core/EngineWrapper.ts' />

module FyreVM {

	interface FileReaderSync {
	    readAsArrayBuffer(blob: Blob): any;
	}
	declare var FileReaderSync: {
    	new(): FileReaderSync;
	}


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

	
	export class WebWorker{
		
		private engine = new EngineWrapper(this.onEngineUpdate.bind(this));
		
		private queue: MessageEvent[];
		
		private error: string;
		
		onMessage(ev: MessageEvent){
			// don't do anything when in error state
			if (this.error){
				return;
			}
			// just queue it if we are busy
			if (this.queue){
				this.queue.push(ev);
				return;
			}
			this.handleMessage(ev);
		}
		
		private handleMessage(ev: MessageEvent)	{
			let data : WebWorkerCommand = ev.data;
			if (!data) return;
			
			// configuration
			if (data.enableSaveGame){
				this.engine.canSaveGames = true;
				return;
			}
			if (data.enableSaveGame === false){
				this.engine.canSaveGames = false;
				return;
			}
			
			
			// commands
			if (data.loadImage){
				this.loadImage(data);
				return;
			}
			if (data.start){
				this.run();
				return;
			}
			if (data.lineInput || data.lineInput === ''){
				this.engine.receiveLine(data.lineInput);
				return;
			}
			if (data.keyInput || data.keyInput === ''){
				this.engine.receiveKey(data.keyInput);
				return;
			}
			if (data.saveSuccessful || data.saveSuccessful === false){
				this.engine.saveGameDone(data.saveSuccessful);
				return;
			}
			if (data.restore){
				// raw data
				if (data.restore instanceof ArrayBuffer){
					// TODO: how to cast properly ?
					let ab : any = data.restore;
					this.engine.receiveSavedGame(Quetzal.load(ab));
				}
				// URL
				let request = new XMLHttpRequest();
				let worker = this;
				let url : any = data.restore;
				request.open("GET", url);
				request.responseType = 'arraybuffer';
				request.onload = function(){
					if (request.status !== 200){
						worker.onEngineError(`${request.status} ${request.statusText}`);
						return;
					}
					worker.engine.receiveSavedGame(Quetzal.load(request.response));
				}
				request.send();
				return;
			}
			if (data.restore === false){
				this.engine.receiveSavedGame(null);
				return;
			}
			this.onEngineError(`unknown command ${JSON.stringify(data)}`);
		}
		
		onEngineUpdate(ev: EngineWrapperState){
			let p: any = postMessage;
			
			// some states get extra payload in the message
			if (ev.state === EngineState.waitingForGameSavedConfirmation){
				// we pass out the IFhd separately, 
				// so that client code does not have to parse the Quetzal file
				// it can be used to differentiate between multiple games
				ev['quetzal'] = this.engine.gameBeingSaved.serialize();
				ev['quetzal.IFhd'] = this.engine.gameBeingSaved.getChunk('IFhd');
			}
			if (ev.state === EngineState.waitingForLoadSaveGame){
				// tell the client what IFhd we want
				ev['quetzal.IFhd'] = this.engine.getIFhd();
			}
			
			p(ev);
			if (this.queue){
				let ev = this.queue.shift();
				if (this.queue.length === 0){
					delete this.queue;
				}
				if (ev){
					this.handleMessage(ev);
				}
			}
		}
		
		onEngineError(message: string){
			this.queue = null;
			this.error = message;
			this.onEngineUpdate({
				state: EngineState.error,
				errorMessage: message
				})
			
		}
		
		loadImage(data){
			let {loadImage} = data;
			
			if (loadImage instanceof ArrayBuffer){
				this.loadImageFromBuffer(loadImage);
				return;
			}
			
			
			let worker = this;
			let request = new XMLHttpRequest();
			request.open("GET", loadImage);
			request.responseType = 'arraybuffer';
			request.onload = function(){
				if (request.status !== 200){
					worker.onEngineError(`${request.status} ${request.statusText} ${loadImage}`);
					return;
				}
				worker.loadImageFromBuffer(request.response);
			}
			this.queue = this.queue || [];
			request.send();
		}
		
		private loadImageFromBuffer(arrayBuffer: ArrayBuffer){
			try{
				let image = new MemoryAccess(0, 0);
				image['buffer'] = new Uint8Array(arrayBuffer);
				image['maxSize'] = arrayBuffer.byteLength;
				this.engine.load(image);
			}
			catch (e){
				this.onEngineError(e.toString());
			}
		}
		
		run(){
			this.engine.run();
		}
		
	}	
	
}


let worker = new FyreVM.WebWorker();
onmessage = worker.onMessage.bind(worker);
console.info("started web worker");

