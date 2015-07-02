// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/	

/// <reference path="typings/angular2/angular2.d.ts" />

/// <reference path="../webworker.d.ts" />


/**
 * "Client-side" code to communicate with an EngineWrapper WebWorker.
 */
 
 import {Component, View, bootstrap} from 'angular2/angular2';


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
  selector: 'my-app',
  appInjector: [WebWorkerClient]
})
@View({
  template: `
<button (click)="loadAndStart()" >START</button>
<b id='channel-LOCN' class='header'>{{worker.getChannel('LOCN')}}</b>
<b id='channel-SCOR' class='header'>{{worker.getChannel('SCOR')}}</b>
<b id='channel-TURN' class='header'>{{worker.getChannel('TURN')}}</b>
<b id='channel-TIME' class='header'>{{worker.getChannel('TIME')}}</b>
<div id='channel-MAIN'>{{worker.getChannel('MAIN')}}</div>
<div id='PRPT'>
<form (submit)="sendCommand($event)"><input size=80></input></form>
</div>
  `
})
// Component controller
class MyAppComponent {
  worker: WebWorkerClient;
 
  
  constructor(worker: WebWorkerClient) {
     this.worker = worker;
  }
  
  loadAndStart(){
	  // TODO: make this configurable
	  this.worker.loadImage('game.ulx');
	  this.worker.startGame();
  }
  
  sendCommand($event){
	  let input = $event.target[0];
	  let command = input.value;
	  this.worker.sendLineInput(command);
	  input.value = '';
	  return false;
  }
}



export function init(){
  bootstrap(MyAppComponent);
}
