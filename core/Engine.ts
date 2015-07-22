// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/// <reference path='Opcodes.ts' />
/// <reference path='Output.ts' />
/// <reference path='UlxImage.ts' />
/// <reference path='Quetzal.ts' />

module FyreVM {
	
	export const enum Versions {
		terp = 1,
		glulx = 0x00030102
	}
	
	/**
	 * Describes the type of Glk support offered by the interpreter.
	 */
	export const enum GlkMode {
		// No Glk support.
		None,
		// A minimal Glk implementation, with I/O functions mapped to the channel system.
        Wrapper
	}
	
	
	/**
	 * A delegate that handles the LineWanted event
	 */
	 export interface LineWantedEventHandler {
		 (callback: LineReadyCallback) : void
	 }
	
	 export interface LineReadyCallback {
		 (line: string) : void
	 }
	 
	 /**
	 * A delegate that handles the KeyWanted event
	 *
	 * Also uses LineReadyCallback. Only the first character
	 * will be used.
	 */
	 export interface KeyWantedEventHandler {
		 (callback: LineReadyCallback) : void
	 }
	
	
	/**
	 * A delegate that handles the OutputReady event
	 */
	
	export interface OutputReadyEventHandler{
		(package: ChannelData) : void
	}
		
	// A delegate that receives a Quetzal when the user
	// requests to save the game
	export interface SaveGameEventHandler {
		(quetzal: Quetzal, callback: SavedGameCallback) : void
	}
	export interface SavedGameCallback {
		(success: boolean);
	}
	
	export interface LoadGameEventHandler {
		(callback: QuetzalReadyCallback) : void
	}
	export interface QuetzalReadyCallback {
		(quetzal: Quetzal);
	}
    /** 
	 *  Describes the task that the interpreter is currently performing.
    */
    export const enum ExecutionMode
    {
        /// We are running function code. PC points to the next instruction.
        Code,
        /// We are printing a null-terminated string (E0). PC points to the
        /// next character.
        CString,
        /// We are printing a compressed string (E1). PC points to the next
        /// compressed byte, and printingDigit is the bit position (0-7).
        CompressedString,
        /// We are printing a Unicode string (E2). PC points to the next
        /// character.
        UnicodeString,
        /// We are printing a decimal number. PC contains the number, and
        /// printingDigit is the next digit, starting at 0 (for the first
        /// digit or minus sign).
        Number,
        /// We are returning control to <see cref="Engine.NestedCall"/>
        /// after engine code has called a Glulx function.
        Return,
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
	
	export const enum CallType {
		stack = 0xC0,
		localStorage = 0xC1
	}
	
	// Call stub
	export const enum GLULX_STUB {
		// DestType values for function calls
		STORE_NULL = 0,
		STORE_MEM = 1,
		STORE_LOCAL = 2,
		STORE_STACK = 3,
		// DestType values for string printing
		RESUME_HUFFSTR = 10,
		RESUME_FUNC = 11,
		RESUME_NUMBER = 12,
		RESUME_CSTR = 13,
		RESUME_UNISTR = 14
	}
	
	export const enum OpcodeRule {
		// No special treatment
		None,
		// Indirect operands work with single bytes
		Indirect8Bit,
		// Indirect operands work with 16-bit words
		Indirect16Bit,
		// Has an additional operand that resembles a store, but which
        // is not actually passed out by the opcode handler. Instead, the
        // handler receives two values, DestType and DestAddr, which may
        // be written into a call stub so the result can be stored later.
		DelayedStore,
		// Special case for op_catch. This opcode has a load operand 
        // (the branch offset) and a delayed store, but the store comes first.
        // args[0] and [1] are the delayed store, and args[2] is the load.
		Catch
	}
		
	class CallStub {
		    /// The type of storage location (for function calls) or the
            /// previous task (for string printing).
            destType : number
            /// The storage address (for function calls) or the digit
            /// being examined (for string printing).
            destAddr : number
            /// The address of the opcode or character at which to resume.
            PC : number
            /// The stack frame in which the function call or string printing
            /// was performed.
            framePtr : number
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
	function uint8(x: number) :number{
		if (x < 0){
			x = 255 + x + 1;
		}
		return x % 256;
	}
	function toASCII(x:number){
		return String.fromCharCode(
			x >> 24,
			(x >> 16) & 0xFF,
			(x >> 8) & 0xFF,
			x & 0xFF);
	}


					
	export class Engine{
		
		private image: UlxImage;
		private stack: MemoryAccess;
		private decodingTable: number;
		private SP: number;
		private FP: number;
		private PC: number;
		private frameLen: number;
		private localsPos: number;
		private execMode: ExecutionMode;
		private opcodes: Opcode[];
		private running: boolean;
		private outputSystem: IOSystem;
		private filterAddress: number;
		private outputBuffer = new OutputBuffer();
		private heap: HeapAllocator;
		private cycle = 0;
		private printingDigit = 0; // bit number for compressed strings, digit for numbers
        private protectionStart = 0;
		private protectionLength = 0;
		
		
		// if turned off, no FyreVM functions are made available, just standard Glulx stuff
		enableFyreVM = true;
		
		glkMode : GlkMode = GlkMode.None;
		
		outputReady: OutputReadyEventHandler;
		lineWanted: LineWantedEventHandler;
		keyWanted: KeyWantedEventHandler;
		saveRequested: SaveGameEventHandler;
		loadRequested: LoadGameEventHandler;
		
		
		constructor(gameFile: UlxImage){
			let major = gameFile.getMajorVersion();
			if (major < 2 || major > 3)
				throw new Error("Game version is out of the supported range");
			let minor = gameFile.getMinorVersion();
			if (major == 2 && minor < 0)
				throw new Error("Game version is out of the supported range");
			if (major == 3 && minor > 1)
				throw new Error("Game version is out of the supported range");
			this.image = gameFile;
			this.stack = new MemoryAccess(gameFile.getStackSize() * 4);
		}
		
		/**
		 * clears the stack and initializes VM registers
		 * from values found in RAM
		 */
		 bootstrap(){
			 this.opcodes = Opcodes.initOpcodes();
			 let mainfunc = this.image.getStartFunc();
			 this.decodingTable = this.image.getDecodingTable();
			 this.SP = this.FP = this.frameLen = this.localsPos = 0;
			 this.outputSystem = IOSystem.Null;
			 this.enterFunction(mainfunc);
			 
		 }
		 
		 /**
		  *  Pushes a frame for a function call, updating FP, SP, and PC.
       	  *  (A call stub should have already been pushed.)
		  */
		 private enterFunction(address: number, ...args: number[]){
			 let {image, stack} = this;
			 this.execMode = ExecutionMode.Code;
			 // push a call frame
			 this.FP = this.SP;
			 this.push(0); // temporary FrameLen
			 this.push(0); // temporary LocalsPos
			 
			 // copy locals info into the frame
			 let localSize = 0;
			 for(let i= address+1; true; i+=2){
				 let type = image.readByte(i);
				 let count = image.readByte(i+1);
				 this.pushByte(type);
				 this.pushByte(count);
				 if (type === 0 || count === 0){
					 this.PC = i + 2;
					 break;
				 }
				 if (localSize % type > 0){
					 localSize += (type - (localSize % type));
				 }
				 localSize += type * count;
			 }
			 // padding
			 while(this.SP %4 > 0){
				 this.pushByte(0);
			 }
			
			 let sp = this.SP;
			 let fp = this.FP;
			 this.localsPos = sp - fp;
			 // fill in localsPos
			 stack.writeInt32(fp + 4, this.localsPos);
			 
			 let lastOffset = 0;
				
			 if (args && args.length){
				 // copy initial values as appropriate
				 let offset = 0;
				 let size = 0;
				 let count = 0;
				 address++;
				 for(let argnum=0; argnum<args.length; argnum++){
					 if (count === 0){
						 size = image.readByte(address++);
						 count = image.readByte(address++);
						 if (size === 0 || count === 0) break;
						 if (offset % size > 0){
							 offset += (size - (offset % size));
						 }
					 }
					 // zero any padding space between locals
					 for (let i=lastOffset; i<offset; i++){
						 stack.writeByte(sp+i, 0);
					 }
					 
					 switch(size){
						 case 1:
						 	stack.writeByte(sp+offset, args[argnum]);
							break;
						 case 2:
						 	stack.writeInt16(sp+offset, args[argnum]);
							break;
						 case 4:
						    stack.writeInt32(sp+offset, args[argnum]);
							break;
						 default:
						    throw new Error(`Illegal call param size ${size} at position ${argnum}`);
					 }
					 offset += size;
					 lastOffset = offset;
					 count--;
				 }
				 
				 
			 }
		     // zero any remaining local space
			 for(let i=lastOffset; i<localSize; i++){
					stack.writeByte(sp+i, 0);
			 }
			 
			 sp += localSize;
			 // padding
			 while(sp%4 > 0){
				 stack.writeByte(sp++, 0);
			 }
			 this.frameLen = sp - fp;
			 stack.writeInt32(fp, sp - fp);
			 this.SP = sp;
		 }
		 
		 private push(value: number){
			 this.stack.writeInt32(this.SP, value);
			 this.SP += 4;
		 }
		 
		 private pop(): number {
			 this.SP -= 4;
			 return this.stack.readInt32(this.SP);
		 }
		 
		 private pushByte(value: number){
			 this.stack.writeByte(this.SP++, value);
		 }
		 
		 private pushCallStub(destType: number, destAddr: number, PC: number, framePtr: number){
			 this.push(destType);
			 this.push(destAddr);
			 this.push(PC);
			 this.push(framePtr);
		 }
		 
		 private popCallStub(): CallStub{
			 let stub = new CallStub();
			 stub.framePtr = this.pop();
			 stub.PC = this.pop();
			 stub.destAddr = this.pop();
			 stub.destType = this.pop();
			 return stub;
		 }
		 
		 
		 /**
		  * executes a single cycle
		  */
		  step(){
			  let {image} = this;
			  switch(this.execMode){
				  case ExecutionMode.Code:
				  	// decode opcode number
					let opnum = image.readByte(this.PC);
					if (opnum >= 0xC0){
						opnum = image.readInt32(this.PC) - 0xC0000000;
						this.PC += 4;
					} else if (opnum >= 0x80){
						opnum = image.readInt16(this.PC) - 0x8000;
						this.PC += 2;
					} else{
						this.PC++;
					} 
					// look up opcode info
					let opcode = this.opcodes[opnum];
					if (!opcode){
						throw new Error(`Unrecognized opcode ${opnum}`);
					}
					
					// decode load-operands
					let opcount = opcode.loadArgs + opcode.storeArgs;
					let operands = [];
					if (opcode.rule === OpcodeRule.DelayedStore)
						opcount++;
					else if (opcode.rule === OpcodeRule.Catch)
						opcount+= 2;
					
					let operandPos = Math.floor( this.PC + (opcount+1) / 2);
					for (let i=0; i<opcode.loadArgs; i++){
						let type;
						if (i%2 === 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
						operandPos += this.decodeLoadOperand(opcode, type, operands, operandPos);
					}
					
					// decode store-operands
					let storePos = this.PC;
					let resultTypes = [];
					let resultAddrs = [];
					for(let i=0; i<opcode.storeArgs; i++){
						let type = i + opcode.loadArgs;
						if (type%2 === 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
						resultTypes[i] = type;
						operandPos += this.decodeStoreOperand(opcode, type, resultAddrs, operandPos);
					}
				

					if(opcode.rule === OpcodeRule.DelayedStore || opcode.rule === OpcodeRule.Catch){
						let type = opcode.loadArgs + opcode.storeArgs;
						if (type%2 === 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
						operandPos += this.decodeDelayedStoreOperand(opcode, type, operands, operandPos);							
					}

					if (opcode.rule === OpcodeRule.Catch){
						// decode final load operand for @catch
						let type = opcode.loadArgs + opcode.storeArgs + 1;
						if (type%2 === 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
						operandPos += this.decodeLoadOperand(opcode, type, operands, operandPos);
					}


//					console.info(opcode.name, operands, this.PC, operandPos);

	
					// call opcode implementation
					this.PC = operandPos; // after the last operanc				
					let result = opcode.handler.apply(this, operands);
					if (resultTypes.length === 1 || result === 'wait'){
						result = [ result ];
					}
					
					// store results
					if (result){
						// for asynchronous input, we need to stop right now
						// until we are asked to resume
						if ('wait' === result[0]){
							this.resumeAfterWait_resultTypes = resultTypes;
							this.resumeAfterWait_resultAddrs = resultAddrs;
							
							return 'wait';
						}
						
						
						this.storeResults(opcode.rule, resultTypes, resultAddrs, result );
					}
					
				  	break;
				  case ExecutionMode.CompressedString:
				  	// TODO: native decoding table
					NextCompressedChar.call(this);
					break; 
					
				  case ExecutionMode.CString:
				  	NextCStringChar.call(this);
					break;
					
				  case ExecutionMode.UnicodeString:
				  	NextUniStringChar.call(this);
					break;
					
				  case ExecutionMode.Number:
				  	NextDigit.call(this);
					break;
					
					  
				  default:
				  	throw new Error(`unsupported execution mode ${this.execMode}`);
			  }
		  }
		  
		  /**
		   * Starts the interpreter.
		   * This method does not return until the game finishes, either by
           * returning from the main function or with the quit opcode
		   * (unless it is placed into "waiting" mode for asynchronous
		   * user input. In this case, there will be a callback that resumes
		   * execution)
		   */
		  run(){
			  this.running = true;
				
			  this.bootstrap();
			  this.resumeAfterWait();
		  }
		  
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeLoadOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  let {image, stack, FP, localsPos, frameLen} = this;
			  function loadLocal(address: number){
					address += FP + localsPos;
					let maxAddress = FP + frameLen;
					
					 switch(opcode.rule){
						case OpcodeRule.Indirect8Bit: 
							if (address > maxAddress)
							    throw new Error("Reading outside local storage bounds");
							return stack.readByte(address);
						case OpcodeRule.Indirect16Bit: 
							if (address+1 > maxAddress)
							    throw new Error("Reading outside local storage bounds");
						    return stack.readInt16(address);
						default: 
							if (address+3 > maxAddress)
							    throw new Error("Reading outside local storage bounds");
							return stack.readInt32(address);
					} 
			  }
			  
			  function loadIndirect(address: number){
				  
					switch(opcode.rule){
						case OpcodeRule.Indirect8Bit: return image.readByte(address);
						case OpcodeRule.Indirect16Bit: return image.readInt16(address);
						default: return image.readInt32(address);
					}		  
			  }

			  switch(type){
				  // immediates
				  case LoadOperandType.zero: operands.push(0); return 0;
				  case LoadOperandType.byte: operands.push(int8(image.readByte(operandPos))); return 1;
				  case LoadOperandType.int16: operands.push(int16(image.readInt16(operandPos))); return 2;
				  case LoadOperandType.int32: operands.push(int32(image.readInt32(operandPos))); return 4;
				  // indirect
				  case LoadOperandType.ptr_8: operands.push(loadIndirect(image.readByte(operandPos))); return 1;
				  case LoadOperandType.ptr_16: operands.push(loadIndirect(image.readInt16(operandPos))); return 2;
				  case LoadOperandType.ptr_32: operands.push(loadIndirect(image.readInt32(operandPos))); return 4;
				  // stack
				  case LoadOperandType.stack: 
				  	 if (this.SP <= this.FP + this.frameLen)
			 				throw new Error("Stack underflow");
				  	operands.push(this.pop()); 
					return 0;
				  // indirect from RAM
				  case LoadOperandType.ram_8: operands.push(loadIndirect(image.getRamAddress(image.readByte(operandPos)))); return 1;
				  case LoadOperandType.ram_16: operands.push(loadIndirect(image.getRamAddress(image.readInt16(operandPos)))); return 2;
				  case LoadOperandType.ram_32: operands.push(loadIndirect(image.getRamAddress(image.readInt32(operandPos)))); return 4;
				  // local storage
				  case LoadOperandType.local_8: operands.push(loadLocal(image.readByte(operandPos))); return 1;
				  case LoadOperandType.local_16: operands.push(loadLocal(image.readInt16(operandPos))); return 2;
				  case LoadOperandType.local_32: operands.push(loadLocal(image.readInt32(operandPos))); return 4;

				  default: throw new Error(`unsupported load operand type ${type}`);
			  }
			  
		  }
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeStoreOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  switch(type){
				  case StoreOperandType.discard: 
				  case StoreOperandType.stack:
				  		return 0; 
				  case StoreOperandType.ptr_8: 
				  case StoreOperandType.local_8:
				  		operands.push(this.image.readByte(operandPos)); 
						return 1;
				  case StoreOperandType.ptr_16:
				  case StoreOperandType.local_16: 
				  		operands.push(this.image.readInt16(operandPos)); 
						return 2;
				  case StoreOperandType.ptr_32: 
				  case StoreOperandType.local_32:
				  		operands.push(this.image.readInt32(operandPos)); 
					 	return 4;
				  case StoreOperandType.ram_8:
				  		operands.push(this.image.getRamAddress(this.image.readByte(operandPos)));
						return 1;  
				  case StoreOperandType.ram_16:
				  		operands.push(this.image.getRamAddress(this.image.readInt16(operandPos)));
						return 2;  
				  case StoreOperandType.ram_32:
				  		operands.push(this.image.getRamAddress(this.image.readInt32(operandPos)));
						return 4;  
				  default: throw new Error(`unsupported store operand type ${type}`);
			  }
			  return operandPos;
		  }
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeDelayedStoreOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  switch(type){
				  case StoreOperandType.discard: 
				  	operands.push(GLULX_STUB.STORE_NULL);
					operands.push(0);
				  	return 0;
				  case StoreOperandType.ptr_8: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.ptr_16: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.ptr_32: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.readInt32(operandPos)); 
					return 4;
				  case StoreOperandType.stack:
				  	operands.push(GLULX_STUB.STORE_STACK);
					operands.push(0);
					return 0;  
				  case StoreOperandType.local_8:
				    operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(this.image.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.local_16: 
				  	operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(this.image.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.local_32: 
				  	operands.push(GLULX_STUB.STORE_LOCAL);
					operands.push(this.image.readInt32(operandPos)); 
					return 4;
				  case StoreOperandType.ram_8:
				    operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.getRamAddress(this.image.readByte(operandPos)));
				  	return 1;
				  case StoreOperandType.ram_16: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.getRamAddress(this.image.readInt16(operandPos)));
				  	return 2;
				  case StoreOperandType.ram_32: 
				  	operands.push(GLULX_STUB.STORE_MEM);
					operands.push(this.image.getRamAddress(this.image.readInt32(operandPos))); 
					return 4;	
					
				  default: throw new Error(`unsupported delayed store operand type ${type}`);
			  }
			  return operandPos;
		  }
		  
		  
		  private performDelayedStore(type:number, address: number, value: number){
			  switch(type){
				  case GLULX_STUB.STORE_NULL: return;
				  case GLULX_STUB.STORE_MEM: this.image.writeInt32(address, value); return;
				  case GLULX_STUB.STORE_LOCAL: this.stack.writeInt32(this.FP + this.localsPos + address, value); return;
				  case GLULX_STUB.STORE_STACK: this.push(value); return;
				  default: throw new Error(`unsupported delayed store mode ${type}`);
			  }
		  }
		  
		  
		  private storeResults(rule: OpcodeRule, resultTypes: number[], resultAddrs: number[], results: number[]){
		  	    for (let i=0; i<results.length; i++){
				  let value = results[i];
				  let type = resultTypes[i];
				  switch(type){
					  case StoreOperandType.discard: return;
					  case 5: case 6: case 7: case 13: case 14: case 15:
					  	// write to memory
						this.image.write(rule, resultAddrs[i], value);
						break;
					  case StoreOperandType.stack:
					  	// push onto stack
						this.push(value);
						return;
					  case StoreOperandType.local_8:
					  case StoreOperandType.local_16:
					  case StoreOperandType.local_32:
						// write to local storage
						let address = resultAddrs[i] + this.FP + this.localsPos;
						let limit = this.FP + this.frameLen;
						switch(rule){
							case OpcodeRule.Indirect8Bit:
								if(address >= limit)
									throw new Error("writing outside local storage bounds");
								this.stack.writeByte(address, value);
								return;
							case OpcodeRule.Indirect16Bit:
								if(address+1 >= limit)
									throw new Error("writing outside local storage bounds");
								this.stack.writeInt16(address, value);
								return;
							default:
								if(address+3 >= limit)
									throw new Error("writing outside local storage bounds");
								this.stack.writeInt32(address, value);
								return;
						}					  
					  default: throw new Error(`unsupported store result mode ${type} for result ${i} of ${results}`);
				  }	
			  }
		  }
		  
		  private leaveFunction(retVal: number){
				if (this.FP === 0){
					// top-level function
					this.running = false;
					return;
				}
				this.SP = this.FP;
				this.resumeFromCallStub(retVal);
		  }
		  
		  private resumeFromCallStub(result: number){
			  let stub = this.popCallStub();
			  
			  this.PC = stub.PC;
			  this.execMode = ExecutionMode.Code;
			  
			  let newFP = stub.framePtr;
			  let newFrameLen = this.stack.readInt32(newFP);
			  let newLocalsPos = this.stack.readInt32(newFP+4);
			  
			  switch(stub.destType){
				  case GLULX_STUB.STORE_NULL: break;
				  case GLULX_STUB.STORE_MEM:
				  		this.image.writeInt32(stub.destAddr, result);
						break;
				  case GLULX_STUB.STORE_LOCAL:
				  		this.stack.writeInt32(newFP + newLocalsPos+ stub.destAddr, result);
						break;
				  case GLULX_STUB.STORE_STACK:
				  		this.push(result);
						break;
				  case GLULX_STUB.RESUME_FUNC:
				  		// resume executing in the same call frame
                    	// return to avoid changing FP
                    	return;
				  case GLULX_STUB.RESUME_CSTR:
                    	// resume printing a C-string
                    	this.execMode = ExecutionMode.CString;
                    	break;
                  case GLULX_STUB.RESUME_UNISTR:
                   	    // resume printing a Unicode string
                    	this.execMode = ExecutionMode.UnicodeString;
                        break;
                  case GLULX_STUB.RESUME_NUMBER:
                    	// resume printing a decimal number
                    	this.execMode = ExecutionMode.Number;
                    	this.printingDigit = stub.destAddr;
                    break;
                  case GLULX_STUB.RESUME_HUFFSTR:
                    	// resume printing a compressed string
                    	this.execMode = ExecutionMode.CompressedString;
                    	this.printingDigit = stub.destAddr;
                    break;		
				  // TODO: the other return modes
				  default:
				  		throw new Error(`unsupported return mode ${stub.destType}`);
			  }
			  
			  this.FP = newFP;
			  this.frameLen = newFrameLen;
			  this.localsPos = newLocalsPos;
		  }		  
		  
		  takeBranch(jumpVector: number){
				if (jumpVector === 0 || jumpVector === 1){
					this.leaveFunction(jumpVector);
				}else{
					this.PC += jumpVector - 2;
				}
		  }
		  
		  performCall(address: number, args: number[], destType:number, destAddr: number, stubPC: number, tailCall = false){
			  	// TODO: veneer.InterceptCall
				
				if (tailCall){
					// pop the current frame and use the call stub below it
					this.SP = this.FP;
				}else{
					// use a new call stub
					this.pushCallStub(destType, destAddr, stubPC, this.FP);
				}
			
				let type = this.image.readByte(address);
				if (type === CallType.stack){
					this.enterFunction(address);
					if (!args){
						this.push(0);
					}else{
						for(let i=args.length-1; i>=0; i--)
							this.push(args[i]);
						this.push(args.length);
					}
				} else if (type === CallType.localStorage){
					this.enterFunction(address, ...args);
				} else {
					throw new Error(`Invalid function call type ${type}`);
				}
				
		  }
		  
		  streamCharCore(x: number){
			   this.streamUniCharCore(x & 0xFF);
		  }
		  
		  streamUniCharCore(x: number){
			    if (this.outputSystem === IOSystem.Filter){
					this.performCall(this.filterAddress, [ x ], GLULX_STUB.STORE_NULL, 0, this.PC, false);
				}else{
					SendCharToOutput.call(this, x);
				}
		  }

 		  streamNumCore(x: number){
			    x = x | 0;
			    if (this.outputSystem === IOSystem.Filter){
					this.pushCallStub(GLULX_STUB.RESUME_FUNC, 0, this.PC, this.FP);
					let num = x.toString();
					this.performCall(this.filterAddress, [ num.charCodeAt(0) ], GLULX_STUB.RESUME_NUMBER, 1, x, false);
				}else{
					SendStringToOutput.call(this, x.toString());
				}
		  }

		  streamStrCore(address: number){
			  if (this.outputSystem == IOSystem.Null) return;
			  let type = this.image.readByte(address);
			  
			  if (type === 0xE1 && !this.decodingTable)
			  		throw new Error("No string decoding table is set");
			  	
			  // TODO: native decoding table
			  // for now, just fall back to using ExecutionMode.CompressedString	  
			  let fallbackEncoding = (type === 0xE1);
			  
			  if (this.outputSystem == IOSystem.Filter || fallbackEncoding){
				  this.pushCallStub(GLULX_STUB.RESUME_FUNC, 0, this.PC, this.FP);
				  switch(type){
					  case 0xE0:
					  	this.execMode = ExecutionMode.CString;
						this.PC = address+1;
						return;
				      case 0xE1:
					  	this.execMode = ExecutionMode.CompressedString;
						this.PC = address+1;
						this.printingDigit = 0;
						return;
					  case 0xE2:
					  	this.execMode = ExecutionMode.UnicodeString;
						this.PC = address+4;
						return;
					  default:
					  	throw new Error(`Invalid string type ${type} at ${address}`);
				  }
			  }
			  
			  switch(type){
				  case 0xE0:
				  	SendStringToOutput.call(this, this.image.readCString(address+1));
					return;
				  default:
					  throw new Error(`Invalid string type ${type} at ${address}`);
			  }
		  }


		  //  Sends the queued output to the OutputReady event handler.
      	  private deliverOutput(){
			 if (this.outputReady){
			 	let pack = this.outputBuffer.flush();
			 	this.outputReady(pack);
			 }
		  }
		  
		  
		  saveToQuetzal(destType, destAddr) : Quetzal{
			  
			  let quetzal = this.image.saveToQuetzal();
			  
			  // 'Stks' is the contents of the stack, with a stub on top
              // identifying the destination of the save opcode.
         	  this.pushCallStub(destType, destAddr, this.PC, this.FP);
			  let trimmed = this.stack.copy(0, this.SP);
			  quetzal.setChunk('Stks', trimmed.buffer);
		      this.popCallStub();
			  
			  // 'MAll' is the list of heap blocks
			  if (this.heap){
				  quetzal.setChunk('MAll', this.heap.save());
			  }
			  
			  return quetzal;
			  
		  }
		  
		  loadFromQuetzal(quetzal: Quetzal){
			  // make sure the save file matches the game file
           	  let ifhd1 = new Uint8Array(quetzal.getChunk('IFhd'));
			  if (ifhd1.byteLength !== 128){
			  	throw new Error('Missing or invalid IFhd block');
			  }
			  let {image} = this;
			  for (let i=0; i<128; i++){
				  if (ifhd1[i] !== image.readByte(i))
				  	throw new Error("Saved game doesn't match this story file");
			  }
			  // load the stack
			  let newStack = quetzal.getChunk("Stks");
			  if (!newStack){
				  throw new Error("Missing Stks block");
			  }
			  this.stack.buffer.set(new Uint8Array(newStack));
			  this.SP = newStack.byteLength;
			  // restore RAM
			  image.restoreFromQuetzal(quetzal);
			 
			  // pop a call stub to restore registers
			  let stub = this.popCallStub();
			  this.PC = stub.PC;
			  this.FP = stub.framePtr;
			  this.frameLen = this.stack.readInt32(this.FP);
			  this.localsPos = this.stack.readInt32(this.FP + 4);
			  this.execMode = ExecutionMode.Code;
			  
			  // restore the heap if available
			  let heapChunk = quetzal.getChunk("MAll");
			  if (heapChunk){
				  this.heap = HeapAllocator.restore(heapChunk, image['memory']);
			  }
			  // give the original save opcode a result of -1
			  // to show that it's been restored
			  this.performDelayedStore(stub.destType, stub.destAddr, 0xFFFFFFFF);
		  }
		  
		  

         /**  Reloads the initial contents of memory (except the protected area)
         * and starts the game over from the top of the main function.
		 */
		  restart(){
			  this.image.revert(this.protectionStart, this.protectionLength);
			  this.bootstrap();
		  }
		  
		  fyreCall(call, x, y) : any{
			  if (!this.enableFyreVM)
			  	throw new Error(`FyreVM functionality has been disabled`);
			  switch(call){
				  case FyreCall.ReadLine:
				  	this.deliverOutput();
					return this.inputLine(x, y);
				  case FyreCall.ReadKey:
				  	this.deliverOutput();
					return this.inputChar();
				  case FyreCall.ToLower:
				  	return String.fromCharCode(uint8(x)).toLowerCase().charCodeAt(0);
				  case FyreCall.ToUpper:
				  	return String.fromCharCode(uint8(x)).toUpperCase().charCodeAt(0);
				  case FyreCall.Channel:
				    x = toASCII(x);
				    this.outputBuffer.setChannel(x);
				  	return;
				  case FyreCall.SetVeneer:
				  	console.warn(`ignoring veneer ${x} ${y}`);
					return 1;
				  case FyreCall.SetStyle:
				  	// ignore
					return 1;
				  case FyreCall.XMLFilter:
				  	// ignore
					return 1;
				  default:
				  	throw new Error(`Unrecognized FyreVM system call ${call}(${x},${y})`);	  
			  }
		  }

		  private inputLine(address: number, bufSize: number) : string{
				// we need at least 4 bytes to do anything useful
				if (bufSize < 4){
					console.warn("buffer size ${bufSize} to small to input line");
					return;
				}
				let {image} = this;
				let resume = this.resumeAfterWait.bind(this);
				// can't do anything without this event handler
           		if (!this.lineWanted){
					this.image.writeInt32(address, 0);	   
					return;
				}
				// ask the application to read a line
				let callback = function(line:string){
					if (line && line.length){
						// TODO? handle Unicode
						// write the length first
						image.writeInt32(address, line.length);
						// followed by the character data, truncated to fit the buffer
             		   	image.writeASCII(address + 4, line, bufSize - 4);  
					}else{
						image.writeInt32(address, 0);
					}
					resume();
				}
				this.lineWanted(callback);
				return 'wait';   
		  }
		  
		  private inputChar():any{
			  // can't do anything without this event handler
           	  if (!this.keyWanted){
				 return 0;
			  }
			  let resume = this.resumeAfterWait.bind(this);
			  
			  // ask the application to read a character
			  let callback = function(line:string){
					if (line && line.length){
						resume([line.charCodeAt(0)]);
					}else{
						resume([0]);
					}
				}
			  this.keyWanted(callback);
			  return 'wait';   	
		  }
		  
		  private resumeAfterWait_resultTypes : number[];
		  private resumeAfterWait_resultAddrs : number[];
		  
		  private resumeAfterWait(result?: number[]){
			  if (result){
				  this.storeResults(null, this.resumeAfterWait_resultTypes, this.resumeAfterWait_resultAddrs, result );
				  this.resumeAfterWait_resultAddrs = this.resumeAfterWait_resultTypes = null;
			  }
			  
			  while (this.running){
				  if( this.step() === 'wait')
				  	  return;
			  }
			  
			  // send any output that may be left
			  this.deliverOutput();
		  }

	}
		
}