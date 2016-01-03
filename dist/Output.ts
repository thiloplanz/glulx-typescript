// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='GlkWrapper.ts' />


module FyreVM {
	
	 /// Identifies an output system for use with @setiosys.
	export const enum IOSystem {
		/// Output is discarded.
		Null,
		/// Output is filtered through a Glulx function.
		Filter,
		/// Output is sent through FyreVM's channel system.
		Channels,
		/// Output is sent through Glk.
		Glk
	}
	
	export function SendCharToOutput(x: number){
		switch(this.outputSystem){
			case IOSystem.Null: return;
			case IOSystem.Channels:
				// TODO? need to handle Unicode characters larger than 16 bits
				this.outputBuffer.write(String.fromCharCode(x));
				return;
			case IOSystem.Glk:
				if (this.glkMode === GlkMode.Wrapper)
					GlkWrapperWrite.call(this, String.fromCharCode(x));
				return;
							
		}
		throw new Error(`unsupported output system ${this.outputSystem}`);
	}
	
	export function SendStringToOutput(x: string){
		switch(this.outputSystem){
			case IOSystem.Null: return;
			case IOSystem.Channels:
				this.outputBuffer.write(x);
				return;
			case IOSystem.Glk:
				if (this.glkMode === GlkMode.Wrapper)
					GlkWrapperWrite.call(this, x);
				return;
		}
		throw new Error(`unsupported output system ${this.outputSystem}`);
	}
	
	
	export const enum GLULX_HUFF {
		// String decoding table: header field offsets
        TABLESIZE_OFFSET = 0,
        NODECOUNT_OFFSET = 4,
        ROOTNODE_OFFSET = 8,

        // String decoding table: node types
        NODE_BRANCH = 0,
        NODE_END = 1,
        NODE_CHAR = 2,
        NODE_CSTR = 3,
        NODE_UNICHAR = 4,
        NODE_UNISTR = 5,
        NODE_INDIRECT = 8,
       	NODE_DBLINDIRECT = 9,
        NODE_INDIRECT_ARGS = 10,
        NODE_DBLINDIRECT_ARGS = 11
	}
	
	/**
	 * Prints the next character of a compressed string, consuming one or more bits.
     *
	 */
	export function NextCompressedChar(){
		let engine: Engine = this;
		let {image} = engine;
		let node = image.readInt32(this.decodingTable + GLULX_HUFF.ROOTNODE_OFFSET);
		
		while (true){
			let nodeType = image.readByte(node++);
			switch(nodeType){
				case GLULX_HUFF.NODE_BRANCH:
					if (nextCompressedStringBit(engine)){
						node = image.readInt32(node+4); // go right
					}else{
						node = image.readInt32(node); // go left
					}
					break;
				case GLULX_HUFF.NODE_END:
					this.resumeFromCallStub(0);
					return;
				case GLULX_HUFF.NODE_CHAR:
				case GLULX_HUFF.NODE_UNICHAR:
					let c = (nodeType === GLULX_HUFF.NODE_UNICHAR) ? image.readInt32(node) : image.readByte(node);
					if (this.outputSystem === IOSystem.Filter){
						this.performCall(this.filterAddress, [ c ], GLULX_STUB.RESUME_HUFFSTR, this.printingDigit, this.PC);
					}else{
						SendCharToOutput.call(this, c);
					}
					return;
				case GLULX_HUFF.NODE_CSTR:
					if (this.outputSystem === IOSystem.Filter){
						this.pushCallStub(GLULX_STUB.RESUME_HUFFSTR, this.printingDigit, this.PC, this.FP);
						this.PC = node;
						this.execMode = ExecutionMode.CString;
					}else{
						SendStringToOutput.call(this, this.image.readCString(node));
					}
					return;
				// TODO: the other node types
				default:
					throw new Error(`Unrecognized compressed string node type ${nodeType}`);
			}
		}
	}
	
	
	function nextCompressedStringBit(engine): boolean{
		let result = ((engine.image.readByte(engine.PC) & ( 1 << engine.printingDigit)) !== 0)
		engine.printingDigit++;
		if (engine.printingDigit === 8){
			engine.printingDigit = 0;
			engine.PC++;
		}
		return result;
	}
	
	export function NextCStringChar(){
		let ch = this.image.readByte(this.PC++);
		if (ch === 0){
			this.resumeFromCallStub(0);
			return;
		}
		if (this.outputSystem === IOSystem.Filter){
			this.performCall(this.filterAddress, [ch],  GLULX_STUB.RESUME_CSTR, 0, this.PC);
		}else{
			SendCharToOutput(ch);
		}
	}
	
	export function NextUniStringChar(){
		let ch = this.image.readInt32(this.PC);
		this.PC += 4;
		if (ch === 0){
			this.resumeFromCallStub(0);
			return;
		}
		if (this.outputSystem === IOSystem.Filter){
			this.performCall(this.filterAddress, [ch],  GLULX_STUB.RESUME_UNISTR, 0, this.PC);
		}else{
			SendCharToOutput(ch);
		}
	}
	
	export function NextDigit(){
		let s:string = this.PC.toString();
		if (this.printingDigit < s.length){
			let ch = s.charAt(this.printingDigit);
			if (this.outputSystem === IOSystem.Filter){
				this.performCall(this.filterAddress, [ch.charCodeAt(0)],  GLULX_STUB.RESUME_NUMBER, this.printingDigit+1, this.PC);
			}else{
				SendStringToOutput(ch);
				this.printingDigit++;
			}
		}else{
			this.resumeFromCallStub(0);
		}
	}
	
	export interface ChannelData {
		[channel: string] : string; 
		MAIN?: string;
		PRPT?: string;	// prompt
		LOCN?: string;  // location
		SCOR?: string;  // score
		TIME?: string;  // time (hhmm)
		TURN?: string;  // turn count
		PLOG?: string;  // prologue,
		DEAD?: string;  // Death text (shown when player dies)
		ENDG?: string;  // End game text
		INFO?: string;  // Story info text (comes out as JSON)
		SNOT?: string;  //  Notify if score changes
	}
	
	
	export class OutputBuffer {
		
		// No special "StringBuilder"
		// simple String concatenation is said to be fast on modern browsers
		// http://stackoverflow.com/a/27126355/14955
		
		private channel = 'MAIN';
		
		private channelData: ChannelData  = {
				MAIN: ''
		}
		
		getChannel(): string{
			return this.channel;
		}
		
		/**  If the output channel is changed to any channel other than
        * "MAIN", the channel's contents will be
        * cleared first.
		*/
		setChannel(c: string){
			if (c === this.channel) return;
			this.channel = c;
			if (c !== 'MAIN'){
				this.channelData[c] = '';	
			}
		}
		
		/** 
		 * Writes a string to the buffer for the currently
		 * selected output channel.
		 */
		write(s: string){
			this.channelData[this.channel] += s;
		}
		
		/**
		 *  Packages all the output that has been stored so far, returns it,
         *  and empties the buffer.
		 */
		flush() : ChannelData{
			let {channelData} = this;
			let r : ChannelData= {};
			for (let c in channelData) {
				let s = channelData[c];
				if (s){
					r[c] = s;
					channelData[c] = '';		
				}
			}
			return r;
		}
		
		
	}
	
}