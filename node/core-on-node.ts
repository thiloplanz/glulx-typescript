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
		}
		
		readInt16(offset: number){
			return this.buffer.readUInt16BE(offset);
		}
		
		writeInt16(offset: number, value: number){
			this.buffer.writeUInt16BE(value, offset);
		}
		
		readInt32(offset: number){
			return this.buffer.readUInt32BE(offset);
		}
		
		writeInt32(offset: number, value: number){
			this.buffer.writeUInt32BE(value, offset);
		}
		
		readASCII(offset: number, length: number): string{
			return this.buffer.toString('ascii', offset, offset+length);
		}
		
		writeASCII(offset: number, value: string){
			this.buffer.write(value, offset, value.length, 'ascii');
		}
		 		 
		setEndMem(newEndMem: number) : boolean {
			if (newEndMem > this.buffer.length)
				return false;
			return true;
		}
		
		copy(offset: number, length: number) : BufferMemoryAccess {
			// TODO: range check
			let result = new BufferMemoryAccess(length);
			this.buffer.copy(result.buffer, 0, offset, offset+length);
			return result;
		}
		
	}
	
}