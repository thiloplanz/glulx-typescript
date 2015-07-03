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
			this.worker.postMessage({loadImage: url});
		}
		
		startGame(){
			this.worker.postMessage({start: true});
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
	  // TODO: make this configurable
	  this.worker.loadImage('shadow-2.1.ulx');
	  this.worker.startGame();
  }
  
  handleKey($event:KeyboardEvent){
		$event.preventDefault();
		$event.stopPropagation();
		if ($event.type === 'keyup'){
			let state = this.worker.engineState;
			if (state === FyreVM.EngineState.waitingForLineInput){
				let key = $event.key;
				if (key && key.length === 1){
					this.userInput += key;
					return;
				}
				
				let code = $event.keyCode;
				switch(code){
					case 8: // backspace
						let l = this.userInput.length;
						if (l){
							this.userInput = this.userInput.substr(0, l-1);
						}
						return;
					case 13: // enter
						this.worker.sendLineInput(this.userInput);
						this.userInput = '';
						return;
				}
				
			}
			if (state === FyreVM.EngineState.waitingForKeyInput){
				let key = $event.key;
				if (key && key.length === 1){
					this.worker.sendKeyInput(key);
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

function printf02d(x:number) : string{
	if (x < 10)
	  return `0${x}`;
	return "" + x;
}



export function init(){
  bootstrap(MyAppComponent);
}
