// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/// <reference path='Opcodes.ts' />


module FyreVM {
	
		
	export const enum CallType {
		stack = 0xC0,
		localStorage = 0xC1
	}
		
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
		storeOperands? : number[],
		storeOperandTypes? : StoreOperandType[],
		delayedStore?: number,
		delayedStoreType? : StoreOperandType,
		/** the byte position in memory where this opcode was found */
		start: number,
		/** number of bytes that were used to encode this operation */
		length: number
	}
	
	export interface DecodedBlock extends Array<DecodedOpcode>{
		usesStack?: boolean,
		writesToMemory?: boolean
	}
	
	export interface DecodedFunction{
		start: number,
		opcodes: DecodedBlock,
		callType: CallType,
		locals_32: number,
		locals_16: number,
		locals_8: number
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
	
	/**
	 * decode a single opcode found at position "offset" in the "code"
	 */
	
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
			throw new Error(`Unrecognized opcode ${opnum} at ${offset}`);
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
		let resultTypes = [];
		for(let i=0; i<opcode.storeArgs; i++){
			let type = i + opcode.loadArgs;
			if (type%2 === 0){
				type = code.readByte(pos) & 0xF;
			}else{
				type = (code.readByte(pos++) >> 4) & 0xF;
			}
			operandPos += decodeStoreOperand(opcode, type, resultAddrs,code, operandPos);
			r.storeOperands = resultAddrs;
			resultTypes.push(type);
			r.storeOperandTypes = resultTypes;
			r.length = operandPos - offset;
		}
				
		// handle extra store operand for delayed store opcodes and "catch"
		if(opcode.rule === OpcodeRule.DelayedStore || opcode.rule === OpcodeRule.Catch){
			let type = opcode.loadArgs + opcode.storeArgs;
			if (type%2 === 0){
				type = code.readByte(pos) & 0xF;
			}else{
				type = (code.readByte(pos++) >> 4) & 0xF;
			}
		
			operandPos += decodeDelayedStoreOperand(opcode, type, r, code, operandPos);							
			r.length = operandPos - offset;
		}


		if (opcode.rule === OpcodeRule.Catch){
			throw new Error('decoding catch not implemented');
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
	 * decodes a "code-path" (see https://github.com/thiloplanz/glulx-typescript/issues/8) starting at the given offset. 
	 */
	 // TODO: we should also stop when we reach an existing jump target
	 // (to avoid redundant compilation)
	export function decodeCodePath(code: MemoryAccess, offset: number) : DecodedBlock {
				let op = decodeOpcode(code, offset); 
		let r : DecodedBlock = [ op ];
		let writesToMemory = false;
		let usesStack = false;
		while (true){
			writesToMemory = _writesToMemory(op, writesToMemory);
			usesStack = _usesStack(op, usesStack);
			
			offset += op.length;
		
			switch(op.opcode){
				case 'return':
				case 'jump':
				case 'jumpabs':
				case 'call':
				case 'callf':
				case 'callfi':
				case 'callfii':
				case 'callfiii':
				case 'tailcall' :
					r.usesStack = usesStack;
					r.writesToMemory = writesToMemory;
		 		    return r;
				
			}
			op =  decodeOpcode(code, offset);
			r.push(op);
		}
	}

	
	
	/**
	 * decodes a function starting at "offset".
	 * 
	 */
	export function decodeFunction(code: MemoryAccess, offset: number) : DecodedFunction {
		
		let pos = offset;
		let callType = code.readByte(pos++);
		if (callType !== CallType.localStorage && callType !== CallType.stack)
			throw new Error(`not a function at ${offset}, got ${callType} instead of a CallType`);
		
		let locals_32 = 0;
		let locals_16 = 0;
		let locals_8 = 0;
		
		while(true){
			let type = code.readByte(pos++);
			let count = code.readByte(pos++);
			if (type === 0 || count === 0) break;
			switch(type){
				case 1:	locals_8 += count; break;
				case 2: locals_16 += count; break;
				case 4: locals_32 += count; break;
				default: throw new Error(`unsupported locals type ${type}`);
			}
		}
		
		let opcodes = decodeCodeBlock(code, pos);
		
		return {
			start: offset,
			callType: callType,
			locals_32: locals_32,
			locals_16: locals_16,
			locals_8: locals_8,
			opcodes: opcodes
		}
	}
	
	
	/**
	 * decodes a complete "code block" sequence of opcodes, usually a function body.
	 * 
	 * - follows every path of execution
	 * - at start, there is only one path
	 * - branching instructions (conditional jumps) create extra paths
	 * - a path ends with "return" or a jump into code already processed
	 * 
	 */
	
	export function decodeCodeBlock(code: MemoryAccess, offset: number) : DecodedBlock{
		// TODO? order by opcode start offset (can get out-of-order because of jumps)
		return _decodeCodeBlock(code, offset, 2, []);
	}
	
	
	function _decodeCodeBlock(code: MemoryAccess, offset: number, jumpVector, stopList: DecodedOpcode[]) : DecodedBlock {
		// return 0 / return 1
		if (jumpVector === 0 || jumpVector === 1)
			return [];
		offset = offset + jumpVector - 2;
		let l = stopList.length;
		for(let i=0; i<l; i++){
			if (stopList[i].start === offset)
				return [];
		}
		let op = decodeOpcode(code, offset); 
		let r : DecodedBlock = [ op ];
		let writesToMemory = false;
		let usesStack = false;
		while (true){
			writesToMemory = _writesToMemory(op, writesToMemory);
			usesStack = _usesStack(op, usesStack);
			
			stopList.push(op);
			offset += op.length;
		
			switch(op.opcode){
				case 'return':
					r.usesStack = usesStack;
					r.writesToMemory = writesToMemory;
		 		    return r;
				
				case 'jz':
				case 'jnz':
				case 'jeq':
				case 'jne':
				case 'jlt':
				case 'jge':
				case 'jgt':
				case 'jle':
				case 'jltu':
				case 'jgeu':
				case 'jgtu':
				case 'jleu':
			    case 'jump':
				case 'jumpabs':
				 {
				    let jumpVector = getJumpVector(op);
								
					let branch = _decodeCodeBlock(code, offset, jumpVector, stopList)
					r.push.apply(r, branch);
					usesStack = usesStack || branch.usesStack;
					writesToMemory = writesToMemory || branch.writesToMemory;
					
						if (op.opcode === 'jump' || op.opcode === 'jumpabs'){
							r.usesStack = usesStack ;
							r.writesToMemory = writesToMemory;
							return r;
						}
						stopList.push.apply(stopList, branch);
						// continue with the "else"
						branch = _decodeCodeBlock(code, offset, 2, stopList)
						r.push.apply(r, branch);
						r.usesStack = usesStack || branch.usesStack;
						r.writesToMemory = writesToMemory || branch.writesToMemory;
						return r;
				 }
				
			}
			op =  decodeOpcode(code, offset);
			r.push(op);
		}
	}
	
	function _writesToMemory(op: DecodedOpcode, writesToMemory) : boolean{
		if (writesToMemory) return true;
		let s = op.storeOperandTypes;
		if (!s) return false;
		
		for(let i=0; i<op.storeOperandTypes.length; i++){
			switch( op.storeOperandTypes[i]){
				case StoreOperandType.ptr_8:
				case StoreOperandType.ptr_16:
				case StoreOperandType.ptr_32:
				case StoreOperandType.ram_8:
				case StoreOperandType.ram_16:
				case StoreOperandType.ram_32:
					return true;
			}
		}
		return false;
	}
	
	
	function _usesStack(op: DecodedOpcode, usesStack) : boolean{
		if (usesStack) return true;
		let s = op.storeOperandTypes;
		if (s && s[0] === StoreOperandType.stack) return  true;
		if (s && s[1] === StoreOperandType.stack) return  true;
		
		for(let i=0; i<op.loadOperandTypes.length; i++){
			if (op.loadOperandTypes[i]===LoadOperandType.stack){
				return true;
			}
		}
		return false;
	}
	
	function getJumpVector(jump: DecodedOpcode){
		// jump target is last argument
		let j = jump.loadOperandTypes.length - 1;
		let type = jump.loadOperandTypes[j];
		if (type === LoadOperandType.zero || type === LoadOperandType.byte || type === LoadOperandType.int16 || type === LoadOperandType.int32){
			let jumpVector = jump.loadOperands[j];
			if (jump.opcode === 'jumpabs'){
				jumpVector = jumpVector - jump.start - jump.length + 2;
			}
			return jumpVector;
		}
		else{
			throw new Error("dynamic jump targets not supported!");
		}
	}
	
	/**
	 * returns the index of the "next" opcode.
	 * 
	 * Note that this function deals in indexes (position in the DecodedBlock), not in byte offsets
	 * 
	 * @return For "normal" operands, a number (index into DecodedBlock), for a return "null", for a conditional jump
	 * an array with two numbers (index for not taking the branch, index for taking the branch -- the latter may be null
	 * for a conditional return) 
	 */
	 
	 export function findNextOpcodeInBlock(block: DecodedBlock, index: number) : number | number[]{
		 let oc = block[index];
		 if (!oc) return null;
		 let {opcode, start, length } = oc;
		 if (opcode === 'return') return null;
		 let target = start + length;
		 if (opcode === 'jump' || opcode === 'jumpabs'){
			 target = target + getJumpVector(oc) - 2;
		 }
		 // first try the next instruction, without jumps they are in sequence
		 let result = index+1;
		 let next = block[result];
		
		 if (!next || next.start !== target){
			 for (let i=0; i<block.length; i++){
				 next = block[i];
				 if (next.start === target){
				    result = i;
				 	break;
				 }	 
			 }
		 }
		 if (!next || next.start !== target){
			 throw new Error(`failed to find next instruction in block, should be at ${target}`);
		 }
		 if (opcode === 'jump' || opcode === 'jumpabs') return result; 
		  
		 if (opcode.indexOf('j') === 0){
			 let jumpVector = getJumpVector(oc);
			 // return "jumps""
			 if (jumpVector === 1 || jumpVector === 0)  return [result, null];
			 let jumpTarget = jumpVector + target - 2;
			 for (let i=0; i<block.length; i++){
				 next = block[i];
				 if (next.start === jumpTarget){
					 return [result, i];
				 }
			 }
			 
			 throw new Error(`failed to find jump target instruction in block, should be at ${target}`);
		 }
		 
		 return result;
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
	  function decodeDelayedStoreOperand(opcode: Opcode, type:StoreOperandType, r: DecodedOpcode, code: MemoryAccess, operandPos: number){
		  r.delayedStoreType = type
		  switch(type){
			  case StoreOperandType.discard: 
			  	r.delayedStore = 0;
			  	return 0;
			  case StoreOperandType.ptr_8: 
			  	r.delayedStore = code.readByte(operandPos);
			  	return 1;
			  case StoreOperandType.ptr_16: 
				r.delayedStore = code.readInt16(operandPos);
			  	return 2;
			  case StoreOperandType.ptr_32: 
			  	r.delayedStore = code.readInt32(operandPos); 
				return 4;
			  case StoreOperandType.stack:
			  	r.delayedStore = 0;
				return 0;  
			  case StoreOperandType.local_8:
			    r.delayedStore = code.readByte(operandPos);
			  	return 1;
			  case StoreOperandType.local_16: 
			  	r.delayedStore = code.readInt16(operandPos);
			  	return 2;
			  case StoreOperandType.local_32: 
			  	r.delayedStore = code.readInt32(operandPos); 
				return 4;
			  case StoreOperandType.ram_8:
			    r.delayedStore = code.readByte(operandPos);
			  	return 1;
			  case StoreOperandType.ram_16: 
			  	r.delayedStore = code.readInt16(operandPos);
			  	return 2;
			  case StoreOperandType.ram_32: 
			  	r.delayedStore = code.readInt32(operandPos); 
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
		let extraArgs = 0;
		if (opcode.rule === OpcodeRule.DelayedStore){
			extraArgs++;
		}
		if (params.length != loadArgs + storeArgs + extraArgs){
			throw new Error(`opcode '${name}' requires ${loadArgs+storeArgs+extraArgs} arguments, but you gave me ${params.length}: ${JSON.stringify(params)}`);
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
		if (storeArgs || extraArgs){
			for (; i<loadArgs+storeArgs+extraArgs; i++){
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