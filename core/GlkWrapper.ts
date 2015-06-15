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
			throw new Error(`Too many stack arguments for glk call ${code}: ${argc}`);
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
		
		// glk_style_distinguish
		handlers[0xB2] = stub;
		
		// glk_style_measure
		handlers[0xB3] = stub;
		
		// glk_char_to_lower
		handlers[0xA0] = function(ch){
			return String.fromCharCode(ch).toLowerCase().charCodeAt(0);
		}
		
		// glk_char_to_upper
		handlers[0xA1] = function(ch){
			return String.fromCharCode(ch).toUpperCase().charCodeAt(0);
		}
		
		// glk_request_line_event
		handlers[0xD0] = function(winId, buffer, bufferSize){
			this.glkWantLineInput = true;
			this.glkLineInputBufSize = bufferSize;
			this.glkLineInputBuffer = buffer;
		}
		
		// glk_request_char_event
		handlers[0xD2] = function(){
			this.glkWantCharInput = true;
		}
		
		// glk_put_char
		handlers[0x80] = function(c){
			GlkWrapperWrite.call(this, String.fromCharCode(c));
		}
		
		// glk_select 
		handlers[0xC0] = function(reference) : any{
			this.deliverOutput();
			
					
			if (this.glkWantLineInput){
				this.glkWantLineInput = false;
				if (!this.lineWanted){
					GlkWriteReference.call(this, reference, GlkConst.evtype_LineInput, 1, 1, 0);
					return 0;
				}
				let callback = function(line = ''){
					let max = this.image.writeASCII(this.glkLineInputBuffer, line, this.glkLineInputBufSize);
					GlkWriteReference.call(this, reference, GlkConst.evtype_LineInput, 1, max, 0);
					this.resumeAfterWait([0]);
				}
				
				this.lineWanted(callback.bind(this));
				return 'wait';
			}else if (this.glkWantCharInput){
				this.glkWantCharInput = false;
				if (!this.keyWanted){
					GlkWriteReference.call(this, reference, GlkConst.evtype_CharInput, 1, 0, 0);
					return 0;
				}
				let callback = function(line){
					GlkWriteReference.call(this, reference, GlkConst.evtype_CharInput, 1, line.charCodeAt(0), 0);
					this.resumeAfterWait([0]);
				}
				
				this.lineWanted(callback.bind(this));
				return 'wait';
				
			}else{
				// no event
				GlkWriteReference.call(this, reference, GlkConst.evtype_None, 0, 0, 0);
			}
			return 0;
		}
		
		return handlers;
	}
	
	
	function GlkWriteReference(reference: number, ...values: number[])
        {
			if (reference == 0xffffffff){
             	for (let i=0; i<values.length; i++)
			    	this.push(values[i]);
			}
            else{
				for (let i=0; i<values.length; i++){
                	this.image.writeInt32(reference, values[i]);
					reference += 4;
				}
			}
        }
}