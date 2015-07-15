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
			let {data} = ev;
			if (!data) return;
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
		
			this.onEngineError(`unknown command ${JSON.stringify(data)}`);
		}
		
		onEngineUpdate(ev: EngineWrapperState){
			let p: any = postMessage;
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
			
			if (loadImage instanceof File){
				this.loadImageFromBuffer(new FileReaderSync().readAsArrayBuffer(loadImage));
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
				let image = new Uint8ArrayMemoryAccess(0, 0);
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

