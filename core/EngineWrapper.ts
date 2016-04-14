// Written in 2015 and 2016 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * A wrapper around Engine that can be communicates
 * via simple JSON-serializable messages.
 * 
 */

/// <reference path='Engine.ts' />
module FyreVM{
    
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
		errorMessage?: string,
        gameBeingSaved?: Quetzal
	}
	
	export class EngineWrapper{

		private engine: Engine
        
        private canSaveGames : boolean
        
        constructor(gameImage: MemoryAccess, canSaveGames: boolean = false){
            this.canSaveGames = canSaveGames
            let engine = this.engine = new Engine(new UlxImage(gameImage))
            
            // set up the callbacks
            engine.outputReady = 
                (channelData) => { 
                    this.channelData = channelData 
                }
        
            engine.keyWanted =
                (cb) => this.waitState(cb, EngineState.waitingForKeyInput)
            engine.lineWanted =
                (cb) => this.waitState(cb, EngineState.waitingForLineInput)
            engine.saveRequested =
                (quetzal, cb) => {
                    if (!this.canSaveGames) { return cb(false); }
                    this.waitState(cb, EngineState.waitingForGameSavedConfirmation)
                    this.gameBeingSaved = quetzal        
                }
             engine.loadRequested =
                (cb) => {
                     if (!this.canSaveGames) { return cb(null); } 
                     this.waitState(cb, EngineState.waitingForLoadSaveGame);
                }
        }
        
        // when the engine returns from processing
        // (because it is waiting for more input)
        // it will have invoked one of several callbacks
        // we use these to calculate the EngineState
        // and store the callback used to resume processing
        
    	private resumeCallback;
    
		private engineState: EngineState;
	    
        private channelData: ChannelData;
        
        private gameBeingSaved: Quetzal;
        
        private waitState(resumeCallback, state: EngineState){
            this.resumeCallback = resumeCallback
            this.engineState = state
        }
		
		
		run() : EngineWrapperState{
			this.engineState=EngineState.running;
            this.engine.run();
			return this.currentState();
		}
        
        private currentState() : EngineWrapperState {
            switch(this.engineState){
                case EngineState.waitingForKeyInput:
                case EngineState.waitingForLineInput:
                    return {
                        state: this.engineState,
                        channelData: this.channelData,
                    }
                case EngineState.waitingForGameSavedConfirmation:
                    return {
                        state: this.engineState,
                        gameBeingSaved: this.gameBeingSaved
                    }
                case EngineState.waitingForLoadSaveGame:
                    return {
                        state: this.engineState
                    }
                default:
                    console.error(`Unexpected engine state: ${this.engineState}`)
                    return {
                        state: this.engineState
                    }
            }
        }
		
		receiveLine(line: string) : EngineWrapperState{
			if (this.engineState !== EngineState.waitingForLineInput)
				throw new Error("Illegal state, engine is not waiting for line input");
			this.engineState = EngineState.running;
			this.resumeCallback(line);
            return this.currentState();
		}

		receiveKey(line: string) : EngineWrapperState{
			if (this.engineState !== EngineState.waitingForKeyInput)
			    throw new Error("Illegal state, engine is not waiting for key input");

			this.engineState = EngineState.running;
			this.resumeCallback(line);
            return this.currentState();
		}
		
		receiveSavedGame(quetzal: Quetzal): EngineWrapperState{
			if (this.engineState !== EngineState.waitingForLoadSaveGame)
			    throw new Error("Illegal state, engine is not waiting for a saved game to be loaded");
				
			this.engineState = EngineState.running;
			this.resumeCallback(quetzal);
            return this.currentState();
		}
		
		saveGameDone(success: boolean) : EngineWrapperState{
			if (this.engineState !== EngineState.waitingForGameSavedConfirmation)
			    throw new Error("Illegal state, engine is not waiting for a game to be saved");
				
			this.gameBeingSaved = null;
			this.engineState = EngineState.running;
			this.resumeCallback(success);
            return this.currentState();
		}

		getIFhd(): Uint8Array{
		    return this.engine['image']['memory'].copy(0, 128).buffer;
		}
        
        /**
         * convenience method to run "restore" and then
         * feed it the given savegame
         */
        restoreSaveGame(quetzal: Quetzal) : EngineWrapperState{
            let state = this.receiveLine("restore")
            if (state.state !== EngineState.waitingForLoadSaveGame)
                throw new Error("Illegal state, engine did not respond to RESTORE command");
            return this.receiveSavedGame(quetzal)
        }
        
        /**
         * convenience method to run "save"
         */
        saveGame() : Quetzal {
            let state = this.receiveLine("save")
            if (state.state !== EngineState.waitingForGameSavedConfirmation)
                throw new Error("Illegal state, engine did not respond to SAVE command");
            let game = state.gameBeingSaved
            this.saveGameDone(true)
            return game
        }
	}
}