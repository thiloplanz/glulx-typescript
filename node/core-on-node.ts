// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='node-0.11.d.ts' />
/// <reference path='../core/MemoryAccess.ts' />
module FyreVM{
	
	export class BufferMemoryAccess implements MemoryAccess {
		
		private buffer: Buffer;
		
		constructor(size: number){
			this.buffer = new Buffer(size);
			this.buffer.fill(0);
		}
		
		readInt16(offset: number){
			return this.buffer.readUInt16BE(offset);
		}
		
		writeInt16(offset: number, value: number){
			this.buffer.writeUInt16BE(value, offset);
		}
		
		setEndMem(newEndMem: number) : boolean {
			if (newEndMem > this.buffer.length)
				return false;
			return true;
		}
		
	}
	
}