// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='MemoryAccess.ts' />

/**
 * Represents the ROM and RAM of a Glulx game image.
 */

module FyreVM {

	// Header size and field offsets
	const enum GLULX_HDR {
		SIZE = 36,
        MAGIC_OFFSET = 0,
		VERSION_OFFSET = 4,
        RAMSTART_OFFSET = 8,
        EXTSTART_OFFSET = 12,
        ENDMEM_OFFSET = 16,
        STACKSIZE_OFFSET = 20,
        STARTFUNC_OFFSET = 24,
        DECODINGTBL_OFFSET = 28,
        CHECKSUM_OFFSET = 32
	};

	export interface GlulxHeader {
		magic?: string;
		version?: number;
		ramStart?: number;
		extStart?: number;
		endMem? : number;
		stackSize?: number;
		startFunc?: number;
		decodingTbl?: number;
		checksum?: number;
	}
	


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
				throw `.ulx file has wrong magic number ${magic}`;
			}
			
			let endmem = header.readInt32(GLULX_HDR.ENDMEM_OFFSET);
			if (endmem < GLULX_HDR.SIZE){
				throw `invalid endMem ${endmem} in .ulx file. Too small to even fit the header.`
			}
			// now read the whole thing
			this.memory = stream.copy(0, endmem);
			// TODO: verify checksum
			this.ramstart = header.readInt32(GLULX_HDR.RAMSTART_OFFSET);
			if (this.ramstart > endmem){
				throw `invalid ramStart ${this.ramstart} beyond endMem ${endmem}.`
			}			
		}
	
		getMajorVersion(): number{
			return this.memory.readInt16(GLULX_HDR.VERSION_OFFSET);
		}
	
		getMinorVersion(): number{
			return this.memory.readInt16(GLULX_HDR.VERSION_OFFSET+2) >> 8;
		}
		
		getStackSize(): number {
			return this.memory.readInt32(GLULX_HDR.STACKSIZE_OFFSET);
		}
		
		getEndMem(): number {
			return this.memory.size();
		}
		
		getRamAddress(relativeAddress: number): number{
			return this.ramstart + relativeAddress;
		}
		
		/**
		 * sets the address at which memory ends.
		 * This can be changed by the game with setmemsize,
		 * or managed automatically be the heap allocator.
		 */
		setEndMem(value: number){
			// round up to the next multiple of 256
			if (value % 256 != 0){
				value = (value + 255) & 0xFFFFFF00;
			}
			if (this.memory.size() != value){
				this.memory = this.memory.copy(0, value);
			}
		}
		
		getStartFunc(): number {
			return this.memory.readInt32(GLULX_HDR.STARTFUNC_OFFSET);
		}
		
		getDecodingTable(): number {
			return this.memory.readInt32(GLULX_HDR.DECODINGTBL_OFFSET);
		}
		
		// a bit weird to have this method here,
		// but it is a convenient place, because
		// the image has access to the MemoryAccess object
		// (which the Engine does not)
		allocateStack(): MemoryAccess {
			// TODO: using copy is ugly, we just need a new buffer
			return this.memory.copy(0, this.getStackSize());
		}
	
		readByte(address: number) : number {
			return this.memory.readByte(address);
		}
	
		readInt16(address: number) : number {
			return this.memory.readInt16(address);
		}
		
		readInt32(address: number) : number {
			return this.memory.readInt32(address);
		}
		
		readCString(address: number): string {
			return this.memory.readCString(address);
		}
		
		writeInt32(address: number, value: number) {
			if (address < this.ramstart)
				throw `Writing into ROM! offset: ${address}`;
			this.memory.writeInt32(address, value);
		}
		
		writeBytes(address: number, ...bytes: number[]){
			if (address < this.ramstart)
				throw `Writing into ROM! offset: ${address}`;
			for (let i=0; i<bytes.length; i++){
				this.memory.writeByte(address+i, bytes[i]);
			}
		}
	
		write(rule:OpcodeRule, address:number, value:number){
			switch(rule){
				case OpcodeRule.Indirect8Bit:
					this.writeBytes(address, value);
					return;
				case OpcodeRule.Indirect16Bit:
					this.writeBytes(address, value >>8, value & 0xFF);
					return;
				default:
					this.writeInt32(address, value);
			}
		}
	
		static writeHeader(fields: GlulxHeader, m: MemoryAccess, offset=0){
			m.writeASCII(offset, fields.magic || 'Glul');
			m.writeInt32(offset + GLULX_HDR.VERSION_OFFSET, fields.version);
			m.writeInt32(offset + GLULX_HDR.RAMSTART_OFFSET, fields.ramStart);
			m.writeInt32(offset + GLULX_HDR.EXTSTART_OFFSET, fields.extStart);
			m.writeInt32(offset + GLULX_HDR.ENDMEM_OFFSET, fields.endMem);
			m.writeInt32(offset + GLULX_HDR.STACKSIZE_OFFSET, fields.stackSize);
			m.writeInt32(offset + GLULX_HDR.STARTFUNC_OFFSET, fields.startFunc);
			m.writeInt32(offset + GLULX_HDR.DECODINGTBL_OFFSET, fields.decodingTbl);
			m.writeInt32(offset + GLULX_HDR.CHECKSUM_OFFSET, fields.checksum);
		}
	
	
	    /** Reloads the game file, discarding all changes that have been made
        * to RAM and restoring the memory map to its original size.
		*/
		revert(){
			this.loadFromOriginal();	
		}
		
	}
	
}