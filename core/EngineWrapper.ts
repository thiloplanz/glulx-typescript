// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * A wrapper around Engine that can be communicates
 * via simple JSON-serializable messages.
 * 
 * All method calls designed to be used asynchronously,
 * with the EngineWrapperListener delegate receiving results.
 *
 */

/// <reference path='Engine.ts' />
module FyreVM{
	
	export interface EngineWrapperListener {
		(state: EngineWrapperState) : void
	}
	
	export const enum EngineState {
		loaded,
		running,
		waitingForLineInput,
		waitingForKeyInput,
		completed,
		error
	}
	
	export interface EngineWrapperState {
		state: EngineState,
		channelData?: ChannelData,
		errorMessage?: string
	}
	
	export class EngineWrapper{

		private engine: Engine;
	
		private delegate : EngineWrapperListener;
		
		private engineState: EngineState;
		
		private resumeCallback;
	
		constructor(del: EngineWrapperListener){
			this.delegate = del;
		}
	
		load(gameImage: MemoryAccess){
			let image = new UlxImage(gameImage);
			let engine = this.engine = new Engine(image);
			engine.outputReady = this.fire.bind(this);
			engine.keyWanted = this.keyWanted.bind(this);
			engine.lineWanted = this.lineWanted.bind(this);
			this.engineState = EngineState.loaded;
			this.fire();
		}
		
		run(){
			this.engineState=EngineState.running;
			this.fire();
			this.engine.run();
		}
		
		private fire(channelData?:ChannelData){
			this.delegate({state: this.engineState, channelData: channelData});
		}
		
		private lineWanted(callback){
			this.engineState = EngineState.waitingForLineInput;
			this.resumeCallback = callback;
			this.fire();
		}
		
		private keyWanted(callback){
			this.engineState = EngineState.waitingForKeyInput;
			this.resumeCallback = callback;
			this.fire();
		}
		
		receiveLine(line: string){
			if (this.engineState !== EngineState.waitingForLineInput)
				return;
			this.engineState = EngineState.running;
			this.fire();
			this.resumeCallback(line);
		}

		receiveKey(line: string){
			if (this.engineState !== EngineState.waitingForKeyInput)
				return;

			this.engineState = EngineState.running;
			this.fire();
			this.resumeCallback(line);
		}

		
	}
}