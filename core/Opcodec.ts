// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/// <reference path='Opcodes.ts' />


module FyreVM {
	
		
	export const enum LoadOperandType {
		zero = 0,
		byte = 1,
		int16 = 2,
		int32 = 3,
		ptr_8 = 5,
		ptr_16 = 6,
		ptr_32 = 7,
		stack = 8,
		local_8 = 9,
		local_16 = 10,
		local_32 = 11,
		ram_8 = 13,
		ram_16 = 14,
		ram_32 = 15
	}
	
	export const enum StoreOperandType {
		discard = 0,
		ptr_8 = 5,
		ptr_16 = 6,
		ptr_32 = 7,
		stack = 8,
		local_8 = 9,
		local_16 = 10,
		local_32 = 11,
		ram_8 = 13,
		ram_16 = 14,
		ram_32 = 15
	}

	
	export interface DecodedOpcode{
		opnum: number,
		opcode: string,
		loadOperands: number[],
		loadOperandTypes: LoadOperandType[],
		storeOperand? : number
		storeOperandType? : StoreOperandType,
		/** the byte position in memory where this opcode was found */
		start: number,
		/** number of bytes that were used to encode this operation */
		length: number
	}
	
	// build a map of all opcodes by name
	// TODO: remove ugly cyclic dependency on Engine implementation
	// for now, lazy load	
	let opcodes_array : Opcode[]= null;
	let opcodes = null;
	
	function initOpcodes(){
		if (opcodes_array) return;
		opcodes_array = Opcodes.initOpcodes();
		opcodes = {};
		for (let c in opcodes_array){
			let op = opcodes_array[c];
			opcodes[op.name] = op;
		}	
	}
	
	export function decodeOpcode(code: MemoryAccess, offset: number) : DecodedOpcode{
		initOpcodes();
		// decode opcode number
		let pos = offset;
		let opnum = code.readByte(pos);
		if (opnum >= 0xC0){
			opnum = code.readInt32(pos) - 0xC0000000;
			pos += 4;
		} else if (opnum >= 0x80){
			opnum = code.readInt16(pos) - 0x8000;
			pos += 2;
		} else{
			pos++;
		}
		// look up opcode info
		let opcode = opcodes_array[opnum];
		if (!opcode){
			throw new Error(`Unrecognized opcode ${opnum}`);
		}
		// decode load-operand types
		let opcount = opcode.loadArgs + opcode.storeArgs;
		if (opcode.rule === OpcodeRule.DelayedStore)
			opcount++;
		else if (opcode.rule === OpcodeRule.Catch)
			opcount+= 2;
		
		let loadOperandTypes = [];
		let loadOperands = [];
		
		let operandPos = Math.floor( pos + (opcount+1) / 2);
		for (let i=0; i<opcode.loadArgs; i++){
			let type;
			if (i%2 === 0){
				type = code.readByte(pos) & 0xF;
			}else{
				type = (code.readByte(pos++) >> 4) & 0xF;
			}
			operandPos += decodeLoadOperand(opcode, type, loadOperandTypes, loadOperands, code, operandPos);
		} 
		
		let r :DecodedOpcode = {
			opnum: opnum,
			opcode: opcode.name,
			loadOperands: loadOperands,
			loadOperandTypes: loadOperandTypes,
			start: offset,
			length: operandPos - offset
		}
		
		
		// decode store-operands
		let resultAddrs = [];
		if (opcode.storeArgs > 1){
			throw new Error(`cannot handle more than one store operand for ${JSON.stringify(r)}`)
		}
		for(let i=0; i<opcode.storeArgs; i++){
			let type = i + opcode.loadArgs;
			if (type%2 === 0){
				type = code.readByte(pos) & 0xF;
			}else{
				type = (code.readByte(pos++) >> 4) & 0xF;
			}
			operandPos += decodeStoreOperand(opcode, type, resultAddrs,code, operandPos);
			r.storeOperand = resultAddrs[0];
			r.storeOperandType = type;
			r.length = operandPos - offset;
		}
				
		//  TODO: handle this nicer somehow		
		// handle extra store operand for delayed store opcodes and "catch"
		if(opcode.rule === OpcodeRule.DelayedStore || opcode.rule === OpcodeRule.Catch){
			let type = opcode.loadArgs + opcode.storeArgs;
			if (type%2 === 0){
				type = code.readByte(pos) & 0xF;
			}else{
				type = (code.readByte(pos++) >> 4) & 0xF;
			}
		
			operandPos += decodeDelayedStoreOperand(opcode, type, loadOperands, code, operandPos);							
			r.length = operandPos - offset;
			r.loadOperandTypes.push(LoadOperandType.int32, LoadOperandType.int32);	
		}

/*					if (opcode.rule === OpcodeRule.Catch){
						// decode final load operand for @catch
						let type = opcode.loadArgs + opcode.storeArgs + 1;
						if (type%2 === 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
					//	operandPos += this.decodeLoadOperand(opcode, type, operands, operandPos);
					}
		*/
		return r;
		 
	}
	
	 /**
	   * @return how many extra bytes were read (so that operandPos can be advanced)
	   */
  	  function decodeLoadOperand(opcode: Opcode, type:number, operandTypes: number[], operands: number[], code: MemoryAccess, operandPos: number){
		  operandTypes.push(type);
		  switch(type){
			  // immediates
			  case LoadOperandType.zero: operands.push(0); return 0;
			  case LoadOperandType.byte: operands.push(int8(code.readByte(operandPos))); return 1;
			  case LoadOperandType.int16: operands.push(int16(code.readInt16(operandPos))); return 2;
			  case LoadOperandType.int32: operands.push(int32(code.readInt32(operandPos))); return 4;
			  //  8 bit addresses
			  case LoadOperandType.ptr_8: 
			  case LoadOperandType.ram_8:
			  case LoadOperandType.local_8:
			  		operands.push(code.readByte(operandPos)); return 1;
			  // 16 bit addresses		  
			  case LoadOperandType.ptr_16:
			  case LoadOperandType.ram_16:
			  case LoadOperandType.local_16:
			   		operands.push(code.readInt16(operandPos)); return 2;
			  // 32 bit addresses
			  case LoadOperandType.ptr_32:
			  case LoadOperandType.ram_32:
			  case LoadOperandType.local_32:
			   		operands.push(code.readInt32(operandPos)); return 4;
			  // stack
			  case LoadOperandType.stack: 
			  		operands.push(0); 
					return 0;
			 
			  default: throw new Error(`unsupported load operand type ${type}`);
		  }
		  
	  }
	  
	   /**
		* @return how many extra bytes were read (so that operandPos can be advanced)
		*/
  	  function decodeStoreOperand(opcode: Opcode, type:number, operands: number[], code: MemoryAccess, operandPos: number){
		  switch(type){
			  case StoreOperandType.discard: 
			  case StoreOperandType.stack:
			        operands.push(0);
			  		return 0;
			   //  8 bit addresses 
			  case StoreOperandType.ptr_8: 
			  case StoreOperandType.local_8:
			  case StoreOperandType.ram_8:
			  		operands.push(code.readByte(operandPos)); 
					return 1;
			  // 16 bit addresses	
			  case StoreOperandType.ptr_16:
			  case StoreOperandType.local_16:
			  case StoreOperandType.ram_16: 
			  		operands.push(code.readInt16(operandPos)); 
					return 2;
			  // 32 bit addresses	
			  case StoreOperandType.ptr_32: 
			  case StoreOperandType.local_32:
			  case StoreOperandType.ram_32:
			  		operands.push(code.readInt32(operandPos)); 
				 	return 4;
			 
			  default: throw new Error(`unsupported store operand type ${type}`);
		  }
		  return operandPos;
	  }


		/**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  function decodeDelayedStoreOperand(opcode: Opcode, type:number, operands: number[], code: MemoryAccess, operandPos: number){
			  switch(type){
				  case StoreOperandType.discard: 
				  	operands.push(GLULX_STUB.STORE_NULL);
					operands.push(0);
				  	return 0;
				  case StoreOperandType.ptr_8: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(code.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.ptr_16: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(code.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.ptr_32: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(code.readInt32(operandPos)); 
					return 4;
				  case StoreOperandType.stack:
				  	operands.push(GLULX_STUB.STORE_STACK);
					operands.push(0);
					return 0;  
				  case StoreOperandType.local_8:
				    operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(code.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.local_16: 
				  	operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(code.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.local_32: 
				  	operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(code.readInt32(operandPos)); 
					return 4;
				  case StoreOperandType.ram_8:
				    operands.push(GLULX_STUB.STORE_RAM);
					operands.push(code.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.ram_16: 
				  	operands.push(GLULX_STUB.STORE_RAM);
					operands.push(code.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.ram_32: 
				  	operands.push(GLULX_STUB.STORE_RAM);
					operands.push(code.readInt32(operandPos)); 
					return 4;	
					
				  default: throw new Error(`unsupported delayed store operand type ${type}`);
			  }
			  return operandPos;
		  }
	
			
	
	// coerce Javascript number into uint32 range
	function uint32(x:number) : number{
		return x >>> 0;
	}
	function uint16(x: number) :number{
		if (x < 0){
			x = 0xFFFF + x + 1;
		}
		return x % 0x10000;
	}
	function uint8(x: number) :number{
		if (x < 0){
			x = 255 + x + 1;
		}
		return x % 256;
	}
	// coerce uint32 number into  (signed!) int32 range
	function int32(x: number) :number{
		if (x >= 0x80000000){
			x = - (0xFFFFFFFF - x + 1);
		}
		return x;
	}
	function int16(x: number) :number{
		if (x >= 0x8000){
			x = - (0xFFFF - x + 1);
		}
		return x;
	}
	function int8(x: number) :number{
		if (x >= 0x80){
			x = - (0xFF - x + 1);
		}
		return x;
	}
	
	function parseHex(x: string): number {
		let n= new Number(`0x${x}`).valueOf();
		if (isNaN(n)){
			throw new Error(`invalid hex number ${x}`);
		}
		return n;
	}
	function parsePtr(x: string, params: any[], i: number, sig: number[]){
		if (x.indexOf("R:") === 1){
			// *R:00
			if (x.length == 5){
				sig.push(LoadOperandType.ram_8);
				params[i] = parseHex(x.substring(3));
				return;
			}
			// *R:1234
			if (x.length == 7){
				sig.push(LoadOperandType.ram_16);
				params[i] = parseHex(x.substring(3));
				return;
			}
			// *R:12345678
			if (x.length == 11){
				sig.push(LoadOperandType.ram_32);
				params[i] = parseHex(x.substring(3));
				return;
			}
		}
		
		// *1234
		if (x.length == 5){
			sig.push(LoadOperandType.ptr_16);
			params[i] = parseHex(x.substring(1));
			return;
		}
		// *00112233
		if (x.length == 9){
			sig.push(LoadOperandType.ptr_32);
			params[i] = parseHex(x.substring(1));
			return;
		}
		throw new Error(`unsupported address specification ${x}`);
	}
	function parseLocal(x: string, params: any[], i: number, sig: number[]){
		// Fr:00
		if (x.length == 5){
			sig.push(LoadOperandType.local_8);
			params[i] = parseHex(x.substring(3));
			return;
		}	
		throw new Error(`unsupported local frame address specification ${x}`);
	}
		
	/**
	 * encode an opcode and its parameters 
	 */
	export function encodeOpcode(name: string, ... params: any[]) : number[]{
		initOpcodes();
		let opcode : Opcode = opcodes[name];
		if (!opcode){
			throw new Error(`unknown opcode ${name}`);
		}		
		
		let {loadArgs, storeArgs, code} = opcode;
		if (params.length != loadArgs + storeArgs){
			throw new Error(`opcode '${name}' requires ${loadArgs+storeArgs} arguments, but you gave me ${params.length}: ${JSON.stringify(params)}`);
		}
		
		// opcode
		let result;
		if (code >= 0x1000){
			result = [ 0xC0, 0x00, code >> 8, code & 0xFF];
		}
		else if (code >= 0x80){
			code = code + 0x8000;
			result = [ code >> 8, code & 0xFF];
		}
		else {
			result = [ code ];
		}
			
		// loadArgs signature
		let sig = [];
		let i = 0;
		for(;i<loadArgs; i++){
			let x = params[i];
			if (typeof(x) === 'number'){
				if (x === 0){
					sig.push(LoadOperandType.zero);
					continue;
				}
				if (-128 <= x  && x <= 127){
					sig.push(LoadOperandType.byte);
					continue;
				}
				if (- 0x10000 <= x  && x <= 0xFFFF){
					sig.push(LoadOperandType.int16);
					continue;
				}
				if (x > 0xFFFFFFFF || x < - 0x100000000){
					throw new Error(`immediate load operand ${x} out of signed 32 bit integer range.`);
				}
				sig.push(LoadOperandType.int32);
				continue;
			}
			if (typeof(x) === 'string'){
				if (x === 'pop'){
					sig.push(LoadOperandType.stack);
					continue;
				}
				if (x.indexOf("*") === 0){
					parsePtr(x, params, i, sig);
					continue;
				}
				if (x.indexOf("Fr:") === 0){
					parseLocal(x, params, i, sig);
					continue;
				}
			}
			throw new Error(`unsupported load argument ${x} for ${name}(${JSON.stringify(params)})`);
		}
		// storeArg signature
		if (storeArgs){
			for (; i<loadArgs+storeArgs; i++){
				let x = params[i];
				if (x === null || x === StoreOperandType.discard){
					sig.push(StoreOperandType.discard);
					continue;
				}
				if (typeof(x) === 'number'){
					if (x <= 0xFFFF){
						sig.push(StoreOperandType.ptr_16);
						continue;
					}
				}
				if (typeof(x) === 'string'){
					if (x === 'push'){
						sig.push(StoreOperandType.stack);
						continue;
					}
					if (x.indexOf("*") === 0){
						parsePtr(x, params, i, sig);
						continue;
					}
					if (x.indexOf("Fr:") === 0){
						parseLocal(x, params, i, sig);
						continue;
					}
					
				}
				throw new Error(`unsupported store argument ${x} for ${name}(${JSON.stringify(params)})`)
			}
		}
		// signature padding
		if (i%2){
			sig.push(0);
		}
		
		for (let j=0; j<sig.length; j+=2){
			result.push(sig[j] + (sig[j+1] << 4));
		}
		
		for (let j=0; j<i; j++){
			let s = sig[j];
			if (s === LoadOperandType.zero) continue;
			if (s === LoadOperandType.stack) continue;
			let x = params[j];
			if (s === LoadOperandType.byte){
				result.push(uint8(x));
				continue;
			}
			if (s === LoadOperandType.int16){
				x = uint16(x);
				result.push(x >> 8);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.int32){
				x = uint32(x);
				result.push(x >> 24);
				result.push((x >> 16) & 0xFF);
				result.push((x >> 8) & 0xFF);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.ptr_8 || s === LoadOperandType.ram_8 || s === LoadOperandType.local_8){
				result.push(x);
				continue;
			}
			if (s === LoadOperandType.ptr_16 || s === LoadOperandType.ram_16){
				result.push(x >> 8);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.ptr_32 || s === LoadOperandType.ram_32){
				result.push(x >> 24);
				result.push((x >> 16) & 0xFF);
				result.push((x >> 8) & 0xFF);
				result.push(x & 0xFF);
				continue;
			}
			throw new Error(`unsupported argument ${x} of type ${s} for ${name}(${JSON.stringify(params)})`)
	
		}
		
		return result;
	}
	
}