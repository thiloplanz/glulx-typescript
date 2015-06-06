// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

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
			case IOSystem.Channels:
				// TODO? need to handle Unicode characters larger than 16 bits
				this.outputBuffer.write(String.fromCharCode(x));
				return;
		}
		// TODO implement Glk
		throw `unsupported output system ${this.outputSystem}`;
	}
	
	
	export class OutputBuffer {
		
		// No special "StringBuilder"
		// simple String concatenation is said to be fast on modern browsers
		// http://stackoverflow.com/a/27126355/14955
		
		private channel = 'MAIN';
		
		private channelData: { [channel: string] : string; }  = {
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
		flush() {
			let {channelData} = this;
			let r = {};
			for (let c in channelData) {
				let s = channelData[c];
				if (s.length){
					r[c] = s;
					channelData[c] = '';		
				}
			}
			return r;
		}
		
		
	}
	
}