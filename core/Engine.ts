// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/// <reference path='Opcodes.ts' />

module FyreVM {
	
	
    /** 
	 *  Describes the task that the interpreter is currently performing.
    */
    const enum ExecutionMode
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
		local_32 = 11
	}
	
	export const enum StoreOperandType {
		discard = 0,
		ptr_8 = 5,
		ptr_16 = 6,
		ptr_32 = 7
	}
	
	export const enum CallType {
		stack = 0xC0,
		localStorage = 0xC1
	}
	
	// Call stub
	const enum GLUXLX_STUB {
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
		
		constructor(gameFile: UlxImage){
			let major = gameFile.getMajorVersion();
			if (major < 2 || major > 3)
				throw "Game version is out of the supported range";
			let minor = gameFile.getMinorVersion();
			if (major == 2 && minor < 0)
				throw "Game version is out of the supported range";
			if (major == 3 && minor > 1)
				throw "Game version is out of the supported range";
			this.image = gameFile;
			this.stack = gameFile.allocateStack();
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
			 // TODO: outputSystem
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
						    throw `Illegal call param size ${size} at position ${argnum}`;
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
						throw `Unrecognized opcode ${opnum}`;
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
					if (resultTypes.length == 1){
						result = [ result ];
					}
					
					// store results
					if (result){
						this.storeResults(resultTypes, resultAddrs, result );
					}
					
				  	break;
				  default:
				  	throw `unsupported execution mode ${this.execMode}`;
			  }
		  }
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeLoadOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  let {image} = this;
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
				  case LoadOperandType.byte: operands.push(image.readByte(operandPos)); return 1;
				  case LoadOperandType.int16: operands.push(image.readInt16(operandPos)); return 2;
				  case LoadOperandType.int32: operands.push(image.readInt32(operandPos)); return 4;
				  // indirect
				  case LoadOperandType.ptr_8: operands.push(loadIndirect(image.readByte(operandPos))); return 1;
				  case LoadOperandType.ptr_16: operands.push(loadIndirect(image.readInt16(operandPos))); return 2;
				  case LoadOperandType.ptr_32: operands.push(loadIndirect(image.readInt32(operandPos))); return 4;
				  // stack
				  case LoadOperandType.stack: 
				  	 if (this.SP <= this.FP + this.frameLen)
			 				throw "Stack underflow";
				  	operands.push(this.pop()); 
					return 0;
				  default: throw `unsupported load operand type ${type}`;
			  }
			  
		  }
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeStoreOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  switch(type){
				  case StoreOperandType.discard: return 0; // discard
				  case StoreOperandType.ptr_8: operands.push(this.image.readByte(operandPos)); return 1;
				  case StoreOperandType.ptr_16: operands.push(this.image.readInt16(operandPos)); return 2;
				  case StoreOperandType.ptr_32: operands.push(this.image.readInt32(operandPos)); return 4;
				  default: throw `unsupported store operand type ${type}`;
			  }
			  return operandPos;
		  }
		  
		  /**
		   * @return how many extra bytes were read (so that operandPos can be advanced)
		   */
		  private decodeDelayedStoreOperand(opcode: Opcode, type:number, operands: number[], operandPos: number){
			  switch(type){
				  case StoreOperandType.discard: 
				  	operands.push(GLUXLX_STUB.STORE_NULL);
					operands.push(0);
				  	return 0;
				  case StoreOperandType.ptr_8: 
				  	operands.push(GLUXLX_STUB.STORE_MEM);
					operands.push(this.image.readByte(operandPos));
				  	return 1;
				  case StoreOperandType.ptr_16: 
				  	operands.push(GLUXLX_STUB.STORE_MEM);
					operands.push(this.image.readInt16(operandPos));
				  	return 2;
				  case StoreOperandType.ptr_32: 
				  	operands.push(GLUXLX_STUB.STORE_MEM);
					operands.push(this.image.readInt32(operandPos)); 
					return 4;
				  default: throw `unsupported delayed store operand type ${type}`;
			  }
			  return operandPos;
		  }
		  
		  
		  private performDelayedStore(type:number, address: number, value: number){
			  switch(type){
				  case GLUXLX_STUB.STORE_NULL: return;
				  case GLUXLX_STUB.STORE_MEM: this.image.writeInt32(address, value); return;
				  case GLUXLX_STUB.STORE_LOCAL: this.stack.writeInt32(this.FP + this.localsPos + address, value); return;
				  case GLUXLX_STUB.STORE_STACK: this.push(value); return;
				  default: throw `unsupported delayed store mode ${type}`;
			  }
		  }
		  
		  
		  private storeResults(resultTypes: number[], resultAddrs: number[], results: number[]){
		  	  for (let i=0; i<results.length; i++){
				  let value = results[i];
				  let type = resultTypes[i];
				  switch(type){
					  case StoreOperandType.discard: return;
					  case 5: case 6: case 7: case 13: case 14: case 15:
					  	// write to memory
						// TODO: OpcodeRule.IndirectXXBit
						this.image.writeInt32(resultAddrs[i], value);
						break;
					  case 8:
					  	// push onto stack
						this.push(value);
						return;
					  default: throw `unsupported store result mode ${type}`
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
				  case GLUXLX_STUB.STORE_NULL: break;
				  case GLUXLX_STUB.STORE_MEM:
				  		this.image.writeInt32(stub.destAddr, result);
						break;
				// TODO: the other return modes
				  default:
				  		throw `unsupported return mode ${stub.destType}`
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
					throw `Invalid function call type ${type}`;
				}
				
		  }
	}
		
}