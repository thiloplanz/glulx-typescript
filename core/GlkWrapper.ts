// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/**
 * A wrapper to emulate minimal Glk functionality.
 */

/// <reference path='Engine.ts' />

module FyreVM {
	
	const enum GlkConst {
		 wintype_TextBuffer = 3,

         evtype_None = 0,
         evtype_CharInput = 2,
         evtype_LineInput = 3,

         gestalt_CharInput = 1,
         gestalt_CharOutput = 3,
         gestalt_CharOutput_ApproxPrint = 1,
         gestalt_CharOutput_CannotPrint = 0,
         gestalt_CharOutput_ExactPrint = 2,
         gestalt_LineInput = 2,
         gestalt_Version = 0
       
	}
	
	interface StreamCloseResult {
		ok: boolean;
		read: number;
		written: number;
	}
	
	interface GlkStream {
		getId(): number;
		put(s: string): void;
		close(): StreamCloseResult;
	}
	
	class GlkWindowStream implements GlkStream {
		id : number;
		engine: Engine;
		
		constructor(id:number, engine: Engine){
			this.id = id;
			this.engine = engine;
		}
		
		getId(){
			return this.id;
		}
		
		put(s: string){
			this.engine['outputBuffer'].write(s);
		}
		
		close(){
			return { ok: false, written: 0, read: 0};
		}
		
	}
	
	export function GlkWrapperCall(code: number, argc: number){
		
		if (!this.glkHandlers){
			this.glkHandlers = initGlkHandlers();
			this.glkStreams = [];
		}
		
		if (argc > 8){
			throw `Too many stack arguments for glk call ${code}: ${argc}`;
		}
		let glkArgs = [];
		while(argc--){
			glkArgs.push(this.pop());
		}
		let handler = this.glkHandlers[code];
		if (handler){
			return handler.apply(this, glkArgs);
		}else{
			console.error(`unimplemented glk call ${code}`);
			return 0;
		}
	}
	
	export function GlkWrapperWrite(s: string){
		if (this.glkCurrentStream){
			this.glkCurrentStream.put(s);
		}
	}
	
	function stub() { return 0};
	
	function initGlkHandlers(){
		let handlers = [];
		
		// glk_stream_iterate
		handlers[0x40] = stub;
		
		// glk_window_iterate
		handlers[0x20] = function(win_id){
			if (this.glkWindowOpen && win_id === 0)
				return 1;
			return 0;
		}
		
		// glk_fileref_iterate 
		handlers[0x64] = stub;
		
		// glk_window_open
		handlers[0x23] = function(){
			if (this.glkWindowOpen)
				return 0;
			this.glkWindowOpen = true;
			this.glkStreams[1] = new GlkWindowStream(1, this);
			return 1;
		}
		
		// glk_set_window
		handlers[0x2F] = function(){
			if (this.glkWindowOpen){
				this.glkCurrentStream = this.glkStreams[1];
			}
			return 0;
		}
		
		// glk_set_style
		handlers[0x86] = stub;
		
		//glk_stylehint_set 
		handlers[0xB0] = stub;
		
		return handlers;
	}
	
}