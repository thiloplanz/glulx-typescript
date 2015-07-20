// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/	

/// <reference path="typings/angular2/angular2.d.ts" />

/// <reference path="../webworker.d.ts" />


/**
 * "Client-side" code to communicate with an EngineWrapper WebWorker.
 */
 
import {Component, View, bootstrap, coreDirectives, ElementRef, NgZone} from 'angular2/angular2';


class WebWorkerClient{
		
		private worker: Worker;
		
		// TODO: Do we really need to keep a reference to the "Zone" around?
		// http://stackoverflow.com/q/31175374/14955
		private zone;
		
		// the most recent state that was sent by the Engine
		private state: FyreVM.EngineWrapperState;
		
		// the most recent channelData that was sent by the Engine
		private channelData: FyreVM.ChannelData;
		
		constructor(){
			this.zone = window['zone'];
			this.worker = new Worker('../webworker.js');
			this.worker.onmessage = this.onmessage.bind(this);
			this.worker.onerror = this.onerror.bind(this);
		}
		
		loadImage(url){
			// "transfer" the buffer, not copy 
			// https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage#Transfer_Example
			if (url instanceof ArrayBuffer){
				this.worker.postMessage({loadImage: url}, [url]);
			}else{
				this.worker.postMessage({loadImage: url});
			}
		}
		
		startGame(){
			this.worker.postMessage({start: true});
			this.worker.postMessage({enableSaveGame: true});
		}
		
		sendLineInput(line:string){
			this.worker.postMessage({lineInput: line});
		}
		
		sendKeyInput(key:string){
			this.worker.postMessage({keyInput: key});
		}
		
		private onmessage(ev: MessageEvent){
			let d : FyreVM.EngineWrapperState = ev.data;
			if (d){
				console.info(d);
				if (d.state === FyreVM.EngineState.waitingForGameSavedConfirmation){
					this.saveGameToLocalStorage(d);
				}
				if (d.state === FyreVM.EngineState.waitingForLoadSaveGame){
					this.getSaveGameFromLocalStorage(d);
				}
		
				let me = this;
				this.zone.run(function(){
					me.state = d;
					if (d.channelData){
						me.channelData = d.channelData;
					}
				});
			}
		}
		
		private onerror(e: ErrorEvent){
			console.error(e);
		}
		
		get engineState(){
			return this.state? this.state.state : -1;
		}
		
		getChannel(name: string){
			let c = this.channelData;
			if (!c) return null;
			return c[name];
		}
		
		saveGameToLocalStorage(data){
			// use IFhd to differentiate between multiple game images
			var key = 'fyrevm_saved_game_' + base64(data['quetzal.IFhd']);
			var q = base64(data.quetzal);
			localStorage[key] = q;
			delete data.quetzal;
			this.worker.postMessage({saveSuccessful: true});
			
		}
		
		getSaveGameFromLocalStorage(data: FyreVM.EngineWrapperState){
				var key = 'fyrevm_saved_game_' + base64(data['quetzal.IFhd']);
				var q = localStorage[key];
				if (!q){
					this.worker.postMessage({restore: false});
					return;
				}
				// send as data: URL to get native Base64 decoding
				this.worker.postMessage({restore: 'data:application/octet-stream;base64,'+q});
		}
		
	}




/**
 * 
 * UI components
 * 
 */



// Annotation section
@Component({
  selector: 'body',
  appInjector: [WebWorkerClient]
})
@View({
  directives: [ coreDirectives],
  templateUrl: 'app.html'
})
// Component controller
class MyAppComponent {
  
  userInput = "";
  
  constructor(public worker: WebWorkerClient) {
	  // TODO: find out how one is supposed to do this in Angular2
	  window['handleKey'] = window['zone'].bind(this.handleKey.bind(this));
  }
  
  loadAndStart(){
	  let file = document.getElementById('gameImage')['files'][0];
	  let reader = new FileReader();
	  let w = this.worker;
	  reader.onload = function(ev){
			w.loadImage(ev.target['result']);
			w.startGame();
		}
	  reader.readAsArrayBuffer(file);
  }
  
  handleKey($event:KeyboardEvent){
		$event.preventDefault();
		$event.stopPropagation();
		if ($event.type === 'keyup'){
			let state = this.worker.engineState;
			if (state === FyreVM.EngineState.waitingForLineInput){
				let key = getKey($event);
				if (key === null)
					return;
				if (key.length === 1){
					this.userInput += key;
					return;
				}
				switch(key){
					case 'Backspace': 
						let l = this.userInput.length;
						if (l){
							this.userInput = this.userInput.substr(0, l-1);
						}
						return;
					case 'Enter':
						this.worker.sendLineInput(this.userInput);
						this.userInput = '';
						return;
				}
			}
			if (state === FyreVM.EngineState.waitingForKeyInput){
				let key = getKey($event);
				if (key === null)
					return;
				if (key.length === 1){
					this.worker.sendKeyInput(key);
					return;
				}
				if (key === 'Enter'){
					this.worker.sendKeyInput('\n');
					return;
				}
			}
		}
  }
  
  get prompt(){
	let state = this.worker.engineState;
	if (state === FyreVM.EngineState.waitingForLineInput)
		return ( this.worker.getChannel('PRPT') || '>' ) + this.userInput;
    if (state === FyreVM.EngineState.waitingForKeyInput)
		return '...';
	return '';
  }
 
  get time(){
	  let x = parseInt(this.worker.getChannel('TIME'));
	  let hours = printf02d(Math.floor(x / 100));
	  let mins = printf02d(x % 100);
	  return `${hours}:${mins}`;
  }
  
}

function getKey($event:KeyboardEvent): string{
	// this is the standard way, but not implemented on all browsers
	let key = $event.key;
	if (key) return key;
	// use the deprecated "keyCode" as a fallback	
	let code = $event.keyCode;
	if (code >= 31 && code < 127){
		key = String.fromCharCode(code);
		if ($event.shiftKey) return key.toUpperCase();
		return key.toLowerCase();
	}
	if (code === 8) return 'Backspace';
	if (code === 13) return 'Enter';
	return null;
}


function printf02d(x:number) : string{
	if (x < 10)
	  return `0${x}`;
	return "" + x;
}

// http://jsperf.com/tobase64-implementations/10
// http://stackoverflow.com/a/9458996/14955
function base64(data){
	if (!data) return null;
	var bytes = new Uint8Array(data);
	var len = bytes.byteLength;
	var chArray = new Array(len);
	for (var i = 0; i < len; i++) {
		chArray[i] = String.fromCharCode(bytes[i]);
 	}
	return btoa(chArray.join(""));
}		


export function init(){
  bootstrap(MyAppComponent);
}
