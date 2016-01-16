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
				throw new Error(`.ulx file has wrong magic number ${magic}`);
			}
			
			let endmem = header.readInt32(GLULX_HDR.ENDMEM_OFFSET);
			if (endmem < GLULX_HDR.SIZE){
				throw new Error(`invalid endMem ${endmem} in .ulx file. Too small to even fit the header.`);
			}
			// now read the whole thing
			this.memory = stream.copy(0, endmem);
			// TODO: verify checksum
			this.ramstart = header.readInt32(GLULX_HDR.RAMSTART_OFFSET);
			if (this.ramstart > endmem){
				throw new Error(`invalid ramStart ${this.ramstart} beyond endMem ${endmem}.`);
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
		
		saveToQuetzal(): Quetzal {
			let quetzal = new Quetzal();
			// 'IFhd' identifies the first 128 bytes of the game file
			quetzal.setChunk('IFhd', this.original.copy(0, 128).buffer);
			// 'CMem' or 'UMem' are the compressed/uncompressed contents of RAM
           	// TODO: implement compression
			let ramSize = this.getEndMem() - this.ramstart;
			let umem = new MemoryAccess(ramSize+4);
			umem.writeInt32(0, ramSize);
			umem.buffer.set(new Uint8Array(this.memory.buffer).subarray(this.ramstart, this.ramstart+ramSize), 4);
			quetzal.setChunk("UMem", umem.buffer);
			return quetzal;
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
				throw new Error(`Writing into ROM! offset: ${address}`);
			this.memory.writeInt32(address, value);
		}
		
		writeBytes(address: number, ...bytes: number[]){
			if (address < this.ramstart)
				throw new Error(`Writing into ROM! offset: ${address}`);
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
		
		/**
		 * @param limit: the maximum number of bytes to write
		 * returns the number of bytes written
		 */
		writeASCII(address: number, text: string, limit: number): number{
			let bytes = [];
			for (let i=0; i<text.length && i< limit; i++){
				let c = text.charCodeAt(i);
				if (c > 255){
					c = 63; // '?'
				}
				bytes.push(c);
			}
			this.writeBytes(address, ...bytes);
			return bytes.length;
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
		* 
		* Use the optional "protection" parameters to preserve a RAM region
		*/
		revert(protectionStart=0, protectionLength=0){
			let prot = this.copyProtectedRam(protectionStart, protectionLength);
			this.loadFromOriginal();	
			if (prot){
				let d = [];
				for(let i=0; i<protectionLength; i++){
					d.push(prot.readByte(i));
				}
				this.writeBytes(protectionStart, ...d);
			}
		}
		
		private copyProtectedRam(protectionStart, protectionLength) : MemoryAccess {
			let prot : MemoryAccess= null;
			if (protectionLength > 0){
				if (protectionStart + protectionLength > this.getEndMem()){
					protectionLength = this.getEndMem() - protectionStart;
				}
				// can only protect RAM
				let start = protectionStart - this.ramstart;
				if (start < 0){
					protectionLength += start;
					start = 0;
				}
				prot = this.memory.copy(start + this.ramstart, protectionLength);
			}
			return prot;
		}
		
		restoreFromQuetzal(quetzal: Quetzal, protectionStart=0, protectionLength=0){
			// TODO: support compressed RAM
			let newRam = quetzal.getChunk('UMem');
			if (newRam){
				let prot = this.copyProtectedRam(protectionStart, protectionLength);
			
				let r = new MemoryAccess(0);
				r.buffer= new Uint8Array(newRam);
				let length = r.readInt32(0);
				this.setEndMem(length + this.ramstart);
				let i=4;
				let j=this.ramstart;
				while(i<newRam.byteLength){
					this.memory.writeByte(j++, r.readByte(i++));
				}
				
				if (prot){
					let d = [];
					for(let i=0; i<protectionLength; i++){
						d.push(prot.readByte(i));
					}
					this.writeBytes(protectionStart, ...d);
				}
				
			}else{
				throw new Error("Missing CMem/UMem blocks");
			}
		}
		
	}
	
}