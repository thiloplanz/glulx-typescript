// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='MemoryAccess.ts' />

module FyreVM {
	
	
	
	/// Implements the Quetzal saved-game file specification by holding a list of
    /// typed data chunks which can be read from or written to streams.
    /// http://www.ifarchive.org/if-archive/infocom/interpreters/specification/savefile_14.txt
	export class Quetzal {
		
		private chunks : { [  name : string ] : ArrayBuffer } = {};
		
		setChunk(name: string, value: ArrayBuffer){
			if (name.length != 4){
				throw new Error(`invalid chunk id ${name}, must be four ASCII chars`);
			}
			this.chunks[name] = value; 
		}
		
		getChunk(name: string): ArrayBuffer {
			return this.chunks[name];
		}
		
		
		serialize() : ArrayBuffer{
			// determine the buffer size
			let size = 12;  // three int32 headers
			let { chunks } = this;
			for (let name in chunks) {
				size += 4;  // the key
				size += 4;  // the value length
				size += chunks[name].byteLength; 	
			}
			let fileLength = size - 8;
			if (size % 2){
				size ++;  // padding				
			}
			
			let m = new MemoryAccess(size);
			m.writeByte(size-1, 0);
			m.writeASCII(0, 'FORM'); // IFF tag
			m.writeInt32(4, fileLength); 
			m.writeASCII(8, 'IFZS'); // FORM sub-ID for Quetzal
			let pos = 12;
			for (let name in chunks) {
				m.writeASCII(pos, name);
				let value = chunks[name];
				let len =  value.byteLength;
				m.writeInt32(pos+4, len);
				m.buffer.set(new Uint8Array(value), pos+8);
				pos += 8 + len;
			}
			
			return m.buffer.buffer;
		}
		
		static load(buffer: ArrayBuffer): Quetzal {
			let q = new Quetzal();
			let m = new MemoryAccess(0);
			m.buffer = new Uint8Array(buffer);
			let type = m.readASCII(0, 4);
			if (type !== 'FORM' && type !== 'LIST' && type !== 'CAT_'){
				throw new Error(`invalid IFF type ${type}`);
			}
			let length = m.readInt32(4);
			if (buffer.byteLength < 8 + length){
				throw new Error("Quetzal file is too short for ${length} bytes");
			}
			type = m.readASCII(8, 4);
			if (type !== 'IFZS'){
				throw new Error(`invalid IFF sub-type ${type}. Not a Quetzal file`);
			}
			let pos = 12;
			let limit = 8 + length;
			while (pos < limit){
				let name = m.readASCII(pos, 4);
				length = m.readInt32(pos+4);
				let value = m.buffer.subarray(pos+8, pos+8+length);
				q.setChunk(name, value);
				pos += 8 + length;
			}
			return q;
		}
	
	}
	
}