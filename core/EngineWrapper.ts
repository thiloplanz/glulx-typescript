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
		loaded = 1,
		running = 2,
		completed = 100,
		error = -100,
	
		waitingForLineInput = 51,
		waitingForKeyInput = 52,
		waitingForGameSavedConfirmation = 53,
		waitingForLoadSaveGame = 54	
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
		
		gameBeingSaved: Quetzal;
	
		canSaveGames = false;
	
		constructor(del: EngineWrapperListener){
			this.delegate = del;
		}
	
		load(gameImage: MemoryAccess){
			let image = new UlxImage(gameImage);
			let engine = this.engine = new Engine(image);
			engine.outputReady = this.fire.bind(this);
			engine.keyWanted = this.keyWanted.bind(this);
			engine.lineWanted = this.lineWanted.bind(this);
			engine.saveRequested = this.saveRequested.bind(this);
			engine.loadRequested = this.loadRequested.bind(this);
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
		
		private saveRequested(quetzal: Quetzal, callback: SavedGameCallback){
			if (this.canSaveGames){
				this.gameBeingSaved = quetzal;
				this.engineState = EngineState.waitingForGameSavedConfirmation;
				this.resumeCallback = callback;
				this.fire();
			}else{
				callback(false);
			}
		}
		
		
		private loadRequested(callback: QuetzalReadyCallback){
			if (this.canSaveGames){
				this.engineState = EngineState.waitingForLoadSaveGame;
				this.resumeCallback = callback;
				this.fire();
			}else{
				callback(null);
			}	
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
		
		receiveSavedGame(quetzal: Quetzal){
			if (this.engineState !== EngineState.waitingForLoadSaveGame)
				return;
				
			this.engineState = EngineState.running;
			this.fire();
			this.resumeCallback(quetzal);
		}
		
		saveGameDone(success: boolean){
			if (this.engineState !== EngineState.waitingForGameSavedConfirmation)
				return;
				
			this.gameBeingSaved = null;
			this.engineState = EngineState.running;
			this.fire();
			this.resumeCallback(success);
		}

		getIFhd(): Uint8Array{
			if (this.engine){
				return this.engine['image']['memory'].copy(0, 128).buffer;
			}
			return null;
		}
	}
}