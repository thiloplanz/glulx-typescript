// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='node-0.11.d.ts' />
/// <reference path='../core/MemoryAccess.ts' />
module FyreVM{
	
	export class BufferMemoryAccess implements MemoryAccess {
		
		private buffer: Buffer;
		
		private maxSize: number;
		
		constructor(size: number, maxSize=size){
			this.buffer = new Buffer(size);
			this.maxSize = maxSize;
		}
		
		readByte(offset: number){
			return this.buffer.readUInt8(offset);
		}
		
		writeByte(offset: number, value:number){
			this.buffer.writeUInt8(value, offset);
		}
		
		readInt16(offset: number){
			return this.buffer.readUInt16BE(offset);
		}
		
		writeInt16(offset: number, value: number){
			this.buffer.writeUInt16BE(value, offset || 0);
		}
		
		readInt32(offset: number){
			return this.buffer.readUInt32BE(offset);
		}
		
		writeInt32(offset: number, value: number){
			this.buffer.writeUInt32BE(value >>> 0, offset || 0);
		}
		
		readASCII(offset: number, length: number): string{
			return this.buffer.toString('ascii', offset, offset+length);
		}
		
		readCString(offset:number): string{
			let len = 0, {buffer} = this;
			while(true){
				if (buffer.readUInt8(offset+len) === 0)
					break;
				len++;
			}
			return buffer.toString('ASCII', offset, offset+len);
		}
		
		
		writeASCII(offset: number, value: string){
			this.buffer.write(value, offset, value.length, 'ascii');
		}
		 		 
		setEndMem(newEndMem: number) : boolean {
			if (newEndMem > this.maxSize)
				return false;
			return true;
		}
		
		copy(offset: number, length: number) : BufferMemoryAccess {
			// TODO: range check
			if (length > this.maxSize)
				throw new Error(`Memory request for ${length} bytes exceeds limit of ${this.maxSize}`);
			let result = new BufferMemoryAccess(length);
			this.buffer.copy(result.buffer, 0, offset, offset+length);
			result.maxSize = this.maxSize;
			return result;
		}
		
		size(){
			return this.buffer.length;
		}
		
		static loadFile(name) : MemoryAccess{
			var fs = require('fs');

			let buffer = fs.readFileSync(name);
			let result = new BufferMemoryAccess(0);
			result.buffer = buffer;
			result.maxSize = buffer.length * 2;
			return result;
		}
	}
	
}