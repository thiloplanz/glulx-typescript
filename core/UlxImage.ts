// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='MemoryAccess.ts' />
/// <reference path='Engine.ts' />


/**
 * Represents the ROM and RAM of a Glulx game image.
 */

module FyreVM {

	export class UlxImage{
		
		private memory: MemoryAccess;
		private ramstart: number;
		private original: MemoryAccess;
		
		constructor(original: MemoryAccess){
			this.original = original;
			this.loadFromOriginal();
		}
		
		private loadFromOriginal(){
			let stream = this.original;
			// read the header, to find out how much memory we need
			let header = stream.copy(0, GLULX_HDR.SIZE);
			let magic = header.readASCII(0, 4);
			if (magic !== 'Glul'){
				throw ".ulx file has wrong magic number "+magic;
			}
			
			let endmem = header.readInt32(GLULX_HDR.ENDMEM_OFFSET);
			// now read the whole thing
			this.memory = stream.copy(0, endmem);
			// TODO: verify checksum
			this.ramstart = header.readInt32(GLULX_HDR.RAMSTART_OFFSET);			
		}
		
		
		public static writeImageHeader(m: MemoryAccess, fields: any = {},  offset = 0){
			m.writeASCII(offset, 'Glul');
			m.writeInt32(offset + GLULX_HDR.ENDMEM_OFFSET, fields.endMem || 0);
			m.writeInt32(offset + GLULX_HDR.RAMSTART_OFFSET, fields.ramStart || 0);
			
		}
	}
	
}