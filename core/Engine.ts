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
		int32 = 3
	}
	
	export const enum StoreOperandType {
		discard = 0,
		ptr_8 = 5,
		ptr_16 = 6,
		ptr_32 = 7
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
					 // seo any padding space between locals
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
		 
		 private pushByte(value: number){
			 this.stack.writeByte(this.SP++, value);
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
					// TODO: implement DelayedStore and Catch
					let operandPos = Math.floor( this.PC + (opcount+1) / 2);
					for (let i=0; i<opcode.loadArgs; i++){
						let type;
						if (i%2 == 0){
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
						if (type%2 == 0){
							type = image.readByte(this.PC) & 0xF;
						}else{
							type = (image.readByte(this.PC++) >> 4) & 0xF;
						}
						resultTypes[i] = type;
						operandPos += this.decodeStoreOperand(opcode, type, resultAddrs, operandPos);
					}
				
//					console.info(opcode.name, operands, this.PC, operandPos);
	
					// TODO: implement DelayedStore and Catch
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
			  switch(type){
				  // immediates
				  case LoadOperandType.zero: operands.push(0); return 0;
				  case LoadOperandType.byte: operands.push(this.image.readByte(operandPos)); return 1;
				  case LoadOperandType.int16: operands.push(this.image.readInt16(operandPos)); return 2;
				  case LoadOperandType.int32: operands.push(this.image.readInt32(operandPos)); return 4;
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
		  
		  private storeResults(resultTypes: number[], resultAddrs: number[], results: number[]){
		  	  for (let i=0; i<results.length; i++){
				  let value = results[i];
				  let type = resultTypes[i];
				  switch(type){
					  case 5: case 6: case 7: case 13: case 14: case 15:
					  	// write to memory
						// TODO: OpcodeRule.IndirectXXBit
						this.image.writeInt32(resultAddrs[i], value);
						break;
					  case 8:
					  	// push onto stack
						this.push(value);
						break;
					  default: throw `unsupported store result mode ${type}`
				  }	
			  }
		  }
		  
		  private leaveFunction(x){
				// TODO
				throw "LeaveFunction not yet implemented";
		  }
		  
		  takeBranch(jumpVector: number){
				if (jumpVector === 0 || jumpVector === 1){
					this.leaveFunction(jumpVector);
				}else{
					this.PC += jumpVector - 2;
				}
		  }
	}
		
}