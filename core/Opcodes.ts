// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../mersenne-twister.ts' />
/// <reference path='GlkWrapper.ts' />

module FyreVM {
	
	/**
	 * an OpcodeHandler takes any number of arguments (all numbers)
	 * and returns nothing, or a number, or multiple numbers
	 */
	export interface OpcodeHandler{
		(...any:number[]) : void | number | number[]
	}
	
	export class Opcode {
		code: number;
		name: string;
		loadArgs: number;
		storeArgs: number;
		handler:OpcodeHandler;
		rule:OpcodeRule;
		constructor(code: number, name: string, loadArgs: number, storeArgs: number, handler:OpcodeHandler, rule?:OpcodeRule){
			this.code = code;
			this.name = name;
			this.loadArgs = loadArgs;
			this.storeArgs = storeArgs;
			this.handler = handler;
			this.rule = rule;
		}
	}
	
	export const enum Gestalt  {
            GlulxVersion = 0,
            TerpVersion = 1,
            ResizeMem = 2,
            Undo = 3,
            IOSystem = 4,
            Unicode = 5,
            MemCopy = 6,
            MAlloc = 7,
            MAllocHeap = 8,
            Acceleration = 9,
            AccelFunc = 10,
            Float = 11,
			
			/**  
			 * ExtUndo (12): 
			 * Returns 1 if the interpreter supports the hasundo and discardundo opcodes. 
			 * (This must true for any terp supporting Glulx 3.1.3. On a terp which does not support undo functionality, 
			 * these opcodes will be callable but will fail.)
			 */
			ExtUndo = 12 
        }
		
		/// <summary>
        /// Selects a function for the FyreVM system call opcode.
        /// </summary>
        export const enum FyreCall
        {
            /// <summary>
            /// Reads a line from the user: args[1] = buffer, args[2] = buffer size.
            /// </summary>
            ReadLine = 1,
			  /// <summary>
            /// Reads a character from the user: result = the 16-bit Unicode value.
            /// </summary>
            ReadKey = 2,
            /// <summary>
            /// Converts a character to lowercase: args[1] = the character,
            /// result = the lowercased character.
            /// </summary>
            ToLower = 3,
            /// <summary>
            /// Converts a character to uppercase: args[1] = the character,
            /// result = the uppercased character.
            /// </summary>
            ToUpper = 4,
            /// <summary>
            /// Selects an output channel: args[1] = an OutputChannel value (see Output.cs).
            /// </summary>
            Channel = 5, 
            /// <summary>
            /// Registers a veneer function address or constant value: args[1] = a
            /// VeneerSlot value (see Veneer.cs), args[2] = the function address or
            /// constant value, result = nonzero if the value was accepted.
            /// </summary>
            SetVeneer = 6,
			/// XML Filtering will turn things into XAML tags for Silverlight or WPF.
			XMLFilter = 7,
			/// styles: { Roman = 1, Bold = 2, Italic = 3, Fixed = 4, Variable = 5,}
			SetStyle = 8
        }

	
	// coerce Javascript number into uint32 range
	function uint32(x:number) : number{
		return x >>> 0;
	}
	
	// coerce uint32 number into  (signed!) int32 range
	
	function int32(x: number) :number{
		return x | 0;
	}
	
	
	export module Opcodes{
		export function initOpcodes(){
			let opcodes: Opcode[] = [];
			
			function opcode(code: number, name: string, loadArgs: number, storeArgs: number, handler:OpcodeHandler, rule?:OpcodeRule){
				opcodes[code] = new Opcode(code, name, loadArgs, storeArgs, handler, rule);
			}
			
			opcode(0x00, 'nop', 0, 0, 
				function(){ });
			
			opcode(0x10, 'add', 2, 1,
				function add(a,b){ return uint32(a+b)});
				
			opcode(0x11, 'sub', 2, 1,
				function sub(a,b){ return uint32(a-b)});				
		
			opcode(0x12, 'mul', 2, 1,
				function mul(a,b){ return uint32((<any>Math).imul(int32(a),int32(b)))});
		
			opcode(0x13, 'div', 2, 1,
				function div(a,b){ return uint32(int32(a) / int32(b))});
		
			opcode(0x14, 'mod', 2, 1,
				function mod(a,b){ return uint32(int32(a) % int32(b))});
	
			// TODO: check the specs
			opcode(0x15, 'neg', 1, 1,
				function neg(x){ 
				return uint32(0xFFFFFFFF - x + 1)});
	
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x18, 'bitand', 2, 1,
				function bitand(a,b){ return uint32(uint32(a) & uint32(b))});
		
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x19, 'bitor', 2, 1,
				function bitor(a,b){ return uint32(uint32(a) | uint32(b))});
		
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x1A, 'bitxor', 2, 1,
				function bitxor(a,b){ return uint32(uint32(a) ^ uint32(b))});
			
			// TODO: check if it works, JS has signed ints, we want uint	
			opcode(0x1B, 'bitnot', 1, 1,
				function bitnot(x){ x = ~uint32(x); if (x<0) return 1 + x + 0xFFFFFFFF; return x; });
	
			opcode(0x1C, 'shiftl', 2, 1,
				function shiftl(a,b){ 
					if (uint32(b) >= 32) return 0;
					return uint32(a << b)});

			opcode(0x1D, 'sshiftr', 2, 1,
				function sshiftr(a,b){ 
					if (uint32(b) >= 32) return (a & 0x80000000) ? 0xFFFFFFFF : 0;
					return uint32(int32(a) >> b)});
			
			opcode(0x1E, 'ushiftr', 2, 1,
				function ushiftr(a,b){ 
					if (uint32(b) >= 32) return 0;
					return uint32(uint32(a) >>> b)});
					
					
			opcode(0x20, 'jump', 1, 0, 
				function jump(jumpVector){
					this.takeBranch(jumpVector);
				}
			);
			
			opcode(0x022, 'jz', 2, 0, 
				function jz(condition, jumpVector){
					if (condition === 0)
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x023, 'jnz', 2, 0, 
				function jnz(condition, jumpVector){
					if (condition !== 0)
						this.takeBranch(jumpVector);
				}
			);


			opcode(0x024, 'jeq', 3, 0, 
				function jeq(a, b, jumpVector){
					if (a === b || uint32(a) === uint32(b))
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x025, 'jne', 3, 0, 
				function jne(a, b, jumpVector){
					if (uint32(a) !== uint32(b))
						this.takeBranch(jumpVector);
				}
			);
			
			opcode(0x026, 'jlt', 3, 0, 
				function jlt(a, b, jumpVector){
					if (int32(a) < int32(b))
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x027, 'jge', 3, 0, 
				function jge(a, b, jumpVector){
					if (int32(a) >= int32(b))
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x028, 'jgt', 3, 0, 
				function jgt(a, b, jumpVector){
					if (int32(a) > int32(b))
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x029, 'jle', 3, 0, 
				function jle(a, b, jumpVector){
					if (int32(a) <= int32(b))
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02A, 'jltu', 3, 0, 
				function jltu(a, b, jumpVector){
					if (a < b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02B, 'jgeu', 3, 0, 
				function jgeu(a, b, jumpVector){
					if (a >= b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02C, 'jgtu', 3, 0, 
				function jgtu(a, b, jumpVector){
					if (a > b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02D, 'jleu', 3, 0, 
				function jleu(a, b, jumpVector){
					if (a <= b)
						this.takeBranch(jumpVector);
				}
			);

			
			opcode(0x0104, 'jumpabs', 1, 0, 
				function jumpabs(address){
					this.PC = address;
				}
			);
			
			opcode(0x30, 'call', 2, 0,
				function call(address:number, argc:number, destType:number, destAddr:number){
					let args = [];
					while(argc--){
						args.push(this.pop())
					}
					this.performCall(address, args, destType, destAddr, this.PC);
				},
				OpcodeRule.DelayedStore
			)

			opcode(0x160, 'callf', 1, 0,
				function callf(address:number, destType:number, destAddr:number){
					this.performCall(address, null, destType, destAddr, this.PC);
				},
				OpcodeRule.DelayedStore
			)

			opcode(0x161, 'callfi', 2, 0,
				function callfi(address:number, arg: number, destType:number, destAddr:number){
					this.performCall(address, [uint32(arg)], destType, destAddr, this.PC);
				},
				OpcodeRule.DelayedStore
			)

			opcode(0x162, 'callfii', 3, 0,
				function callfii(address:number, arg1: number, arg2: number, destType:number, destAddr:number){
					this.performCall(address, [uint32(arg1), uint32(arg2)], destType, destAddr, this.PC);
				},
				OpcodeRule.DelayedStore
			)
		
			opcode(0x163, 'callfiii', 4, 0,
				function callfiii(address:number, arg1: number, arg2: number, arg3: number, destType:number, destAddr:number){
					this.performCall(address, [uint32(arg1), uint32(arg2), uint32(arg3)], destType, destAddr, this.PC);
				},
				OpcodeRule.DelayedStore
			)

			opcode(0x31, 'return', 1, 0,
				function _return(retVal:number){
					this.leaveFunction(uint32(retVal));
				})
				
			opcode(0x32, "catch", 0, 0,
				function _catch(destType:number, destAddr:number, address:number){
					this.pushCallStub(destType, destAddr, this.PC, this.FP);
					 // the catch token is the value of sp after pushing that stub
           			this.performDelayedStore(destType, destAddr, this.SP);
					this.takeBranch(address)		
				},
				OpcodeRule.Catch
			)
			
			opcode(0x33, "throw", 2, 0,
				function _throw(ex, catchToken){
					if (catchToken > this.SP)
						throw new Error("invalid catch token ${catchToken}");
					// pop the stack back down to the stub pushed by catch
					this.SP = catchToken;
					
					// restore from the stub
					let stub = this.popCallStub();
					this.PC = stub.PC;
					this.FP = stub.framePtr;
					this.frameLen = this.stack.readInt32(this.FP);
					this.localsPos = this.stack.readInt32(this.FP + 4);
					
					// store the thrown value and resume after the catch opcode
					this.performDelayedStore(stub.destType, stub.destAddr, ex);
					
				}
			)
			
			opcode(0x34, "tailcall", 2, 0,
				function tailcall(address: number, argc: number){
					let argv = [];
					while(argc--){
						argv.push(this.pop());
					}
					this.performCall(address, argv, 0, 0, 0, true);
				});
			
			opcode(0x40, "copy", 1, 1, 
				function copy(x:number){
					return uint32(x);
				});
			
			opcode(0x41, "copys", 1, 1, 
				function copys(x:number){
					return x & 0xFFFF;
				}, OpcodeRule.Indirect16Bit);

			opcode(0x42, "copyb", 1, 1, 
				function copyb(x:number){
					return x & 0xFF;
				}, OpcodeRule.Indirect8Bit);
			
			opcode(0x44, "sexs", 1, 1, 
				function sexs(x:number){
					return x & 0x8000 ? uint32(x | 0xFFFF0000) : x & 0x0000FFFF;
				});

			opcode(0x45, "sexb", 1, 1, 
				function sexb(x:number){
					return x & 0x80 ? uint32(x | 0xFFFFFF00) : x & 0x000000FF;
				});
			
			opcode(0x48, "aload", 2, 1,
				function aload(array: number, index: number){
					return this.image.readInt32(uint32(array+4*index));
				});
			
			opcode(0x49, "aloads", 2, 1,
				function aloads(array: number, index: number){
					return this.image.readInt16(uint32(array+2*index));
				});

			opcode(0x4A, "aloadb", 2, 1,
				function aloadb(array: number, index: number){
					return this.image.readByte(uint32(array+index));
				});

			opcode(0x4B, "aloadbit", 2, 1,
				function aloadbit(array: number, index: number){
					index = int32(index);
					let bitx = index & 7;
					let address = array;
					if (index >= 0){
						address += (index>>3);
					}else{
						address -= (1+((-1-index)>>3));
					}
					let byte =  this.image.readByte(uint32(address));
					return byte & (1 << bitx) ? 1 : 0;
				});

			opcode(0x4C, "astore", 3, 0,
				function astore(array: number, index: number, value: number){
					this.image.writeInt32(array+4*index, uint32(value));
				}
			);
			
			opcode(0x4D, "astores", 3, 0,
				function astores(array: number, index: number, value: number){
					value = value & 0xFFFF;
					this.image.writeBytes(array+2*index, value >> 8, value & 0xFF );
				}
			);
			
			opcode(0x4E, "astoreb", 3, 0,
				function astoreb(array: number, index: number, value: number){
					this.image.writeBytes(array+index, value & 0xFF );
				}
			);

			opcode(0x4F, "astorebit", 3, 0,
				function astorebit(array: number, index: number, value: number){
					index = int32(index);
					let bitx = index & 7;
					let address = array;
					if (index >= 0){
						address += (index>>3);
					}else{
						address -= (1+((-1-index)>>3));
					}
					let byte =  this.image.readByte(address);
					if (value === 0){
						byte &= ~(1 << bitx);
					}else{
						byte |= (1 << bitx);
					}
					this.image.writeBytes(address, byte);
				}
			);
			
			opcode(0x70, 'streamchar', 1, 0, Engine.prototype.streamCharCore);
			
			opcode(0x73, 'streamunichar', 1, 0, Engine.prototype.streamUniCharCore);

			opcode(0x71, 'streamnum', 1, 0, Engine.prototype.streamNumCore);

			opcode(0x72, 'streamstr', 1, 0, Engine.prototype.streamStrCore);

			opcode(0x130, 'glk', 2, 1,
				function glk(code:number, argc: number){
					switch(this.glkMode){
						case GlkMode.None:
							// not really supported, just clear the stack
							while(argc--){
								this.pop();
							}
							return 0;
						case GlkMode.Wrapper:
						  	return GlkWrapperCall.call(this, code, argc);
						default:
							throw new Error(`unsupported glkMode ${this.glkMode}`);	
					}
				}
			);

			opcode(0x148, 'getiosys', 0, 2,
				function getiosys(){
					switch(this.outputSystem){
						case IOSystem.Null:	return [0,0];
						case IOSystem.Filter: return [1, this.filterAddress];
						case IOSystem.Channels: return [20, 0];
						case IOSystem.Glk: return [2, 0];	
					}
				}
			);

			opcode(0x149, 'setiosys', 2, 0,
				function setiosys(system, rock){
					switch(system){
						case 0:
							this.outputSystem = IOSystem.Null;
							return;
						case 1:
							this.outputSystem = IOSystem.Filter;
							this.filterAddress = rock;
							return;
						case 2:
							if (this.glkMode !== GlkMode.Wrapper)
								throw new Error("Glk wrapper support has not been enabled");
							this.outputSystem = IOSystem.Glk;
							return;
						case 20:
							if (!this.enableFyreVM)
								throw new Error("FyreVM support has been disabled");
							this.outputSystem = IOSystem.Channels;
							return;
						default:
							throw new Error(`Unrecognized output system ${system}`);
					}
				}
			);

			opcode(0x102, 'getmemsize', 0, 1, 
				function getmemsize(){
					return this.image.getEndMem();
				}
			);
	
			opcode(0x103, 'setmemsize', 1, 1,
				function setmemsize(size){
					if (this.heap)
						throw new Error("setmemsize is not allowed while the heap is active");
					try{
						this.image.setEndMem(size);
						return 0;
					}
					catch (e){
						console.error(e);
						return 1;
					}
					
				}
			);

			opcode(0x170, 'mzero', 2, 0, 
				function mzero(count, address){
					let zeros = [];
					count = uint32(count);
					while(count--){
						zeros.push(0);
					}
					this.image.writeBytes(address, ...zeros);
				}
			);


			opcode(0x171, 'mcopy', 3, 0, 
				function mcopy(count, from, to){
					let data = [];
					count = uint32(count);
					for (let i = from; i<from+count; i++){
						data.push(this.image.readByte(i));
					}
					this.image.writeBytes(to, ...data);
				}
			);
			
			opcode(0x178, 'malloc', 1, 1,
				function malloc(size){
					if (size <= 0)
						return 0;
					if (this.heap){
						return this.heap.alloc(size);
					}
					let oldEndMem = this.image.getEndMem();
					this.heap = new HeapAllocator(oldEndMem, this.image.memory);
					this.heap.maxHeapExtent = this.maxHeapSize;
					let a = this.heap.alloc(size);
					if (a === 0){
						this.heap = null;
						this.image.setEndMem(oldEndMem);
					}
					return a;
				}
			);

			opcode(0x179, 'mfree', 1, 0,
				function mfree(address){
					if (this.heap){
						this.heap.free(address);
						if (this.heap.blockCount() === 0){
							this.image.endMem = this.heap.heapAddress;
							this.heap = null;
						}
					}
				
			});

			opcode(0x150, 'linearsearch', 7, 1, PerformLinearSearch);

			opcode(0x151, 'binarysearch', 7, 1, PerformBinarySearch);

			opcode(0x152, 'linkedsearch', 6, 1, PerformLinkedSearch);

			opcode(0x50, 'stkcount', 0, 1,
				function stkcount(){
					return (this.SP - (this.FP + this.frameLen)) / 4;
				}
			);

			opcode(0x51, 'stkpeek', 1, 1,
				function stkpeek(pos){
					let address = this.SP - 4 * (1 + pos)
					if (address < this.FP + this.frameLen)
						throw new Error("Stack underflow");
					return this.stack.readInt32(address);
				}
			);

			opcode(0x52, 'stkswap', 0, 0,
				function stkswap(pos){
					if (this.SP - (this.FP + this.frameLen) < 8)
						throw new Error("Stack underflow");
					let a = this.pop();
					let b = this.pop();
					this.push(a);
					this.push(b);
				}
			);
			
			opcode(0x53, 'stkroll', 2, 0,
				function stkroll(items, distance){
					// TODO: treat distance as signed value
					if (items === 0)
						return;
					distance %= items;
					if (distance === 0)
						return;
					// rolling X items down Y slots == rolling X items up X-Y slots
             		if (distance < 0)
					 	distance += items;
					if (this.SP - (this.FP + this.frameLen) < 4* items)
						throw new Error("Stack underflow");
					let temp1 = [];
					let temp2 = [];
					for (let i=0; i<distance; i++){
						temp1.push(this.pop());
					}
					for (let i=distance; i<items; i++){
						temp2.push(this.pop());
					}
					while(temp1.length){
						this.push(temp1.pop());
					}
					while(temp2.length){
						this.push(temp2.pop());
					}
				}
			);

			opcode(0x54, 'stkcopy',1, 0,
				function stkcopy(count){
					let bytes = count * 4;
					if (bytes > this.SP - (this.FP + this.frameLen))
						throw new Error("Stack underflow");
					let start = this.SP - bytes;
					while(count--){
						this.push(this.stack.readInt32(start))
						start+= 4;
					}
				});

			opcode(0x100, "gestalt", 2, 1,
				function gestalt(selector, arg){
					switch(selector){
						case Gestalt.GlulxVersion: return Versions.glulx;
						case Gestalt.TerpVersion: return Versions.terp;
						case Gestalt.ResizeMem:
						case Gestalt.Unicode:
						case Gestalt.MemCopy:
						case Gestalt.MAlloc:
				 		case Gestalt.Undo:
						case Gestalt.ExtUndo:
						 	return 1;
						case Gestalt.Acceleration:
						case Gestalt.Float:
							return 0;
						case Gestalt.IOSystem:
							if (arg === 0) return 1;  // Null-IO
							if (arg === 1) return 1;  // Filter
							if (arg === 20 && this.enableFyreVM) return 1; // Channel IO
							if (arg == 2 && this.glkMode === GlkMode.Wrapper) return 1; // Glk
							return 0;
						case Gestalt.MAllocHeap:
							if (this.heap) return this.heap.heapAddress;
							return 0;
						case Gestalt.AccelFunc:
							return 0;
						default:
							return 0; 
					}		
				}
			);


			opcode(0x120, 'quit', 0, 0,
				function quit(){ this.running = false; });
				
			opcode(0x122, 'restart', 0, 0, Engine.prototype.restart);

			opcode(0x123, 'save', 1, 0,
				function save(X, destType:number, destAddr:number){
					// TODO: find out what that one argument X does ...
					let engine: Engine = this;
					if (engine.saveRequested){
						let q = engine.saveToQuetzal(destType, destAddr);
						let resume = this.resumeAfterWait.bind(this);
						
						let callback = function(success:boolean){
							if (success){
								engine['performDelayedStore'](destType, destAddr, 0);
							}else{
								engine['performDelayedStore'](destType, destAddr, 1);
							}
							resume();
						}
						engine.saveRequested(q, callback);
						let wait: any = 'wait';
						return wait;
					}
					engine['performDelayedStore'](destType, destAddr, 1);	
				},
				OpcodeRule.DelayedStore
			)
			
			opcode(0x124, "restore", 1, 0,
				function restore(X, destType:number, destAddr:number){
					// TODO: find out what that one argument X does ...
					let engine: Engine = this;
					if (engine.loadRequested){
						let resume = this.resumeAfterWait.bind(this);
						let callback = function(quetzal:Quetzal){
							if (quetzal){
								engine.loadFromQuetzal(quetzal);
								resume();
								return;
							}
							engine['performDelayedStore'](destType, destAddr, 1);
						}
						engine.loadRequested(callback);
						let wait: any = 'wait';
						return wait;
					}
					engine['performDelayedStore'](destType, destAddr, 1);
				},
				OpcodeRule.DelayedStore
			)

			opcode(0x125, 'saveundo', 0, 0, 
				function saveundo(destType:number, destAddr:number){
					let q = this.saveToQuetzal(destType, destAddr);
					
					if (this.undoBuffers){
						// TODO make MAX_UNDO_LEVEL configurable
						if (this.undoBuffers.length >= 3){
							this.undoBuffers.unshift();
						}
						this.undoBuffers.push(q);
					}else{
						this.undoBuffers = [ q ];
					}
					this.performDelayedStore(destType, destAddr, 0);
			}, OpcodeRule.DelayedStore);

			opcode(0x126, 'restoreundo', 0, 0,
				function restoreundo(destType:number, destAddr:number){
					if (this.undoBuffers && this.undoBuffers.length){
						let q = this.undoBuffers.pop();
						this.loadFromQuetzal(q);
					}else{
						this.performDelayedStore(destType, destAddr, 1);
					}
					
				}, OpcodeRule.DelayedStore);


			opcode(0x127, 'protect', 2, 0,
				function protect(start, length){
					if (start < this.image.getEndMem()){
						this.protectionStart = start;
						this.protectionLength = length;
					}
				}
			)
			
			opcode(0x128, 'hasundo', 0, 1,
				// Test whether a VM state is available in temporary storage. 
				// return 0 if a state is available, 1 if not. 
				// If this returns 0, then restoreundo is expected to succeed.
				function hasundo(){
					if (this.undoBuffers && this.undoBuffers.length) return 0;
					return 1;
				}
			)

			opcode(0x129, 'discardundo', 0, 0,
				// Discard a VM state (the most recently saved) from temporary storage. If none is available, this does nothing.
				function discardundo(){
					if (this.undoBuffers){
						this.undoBuffers.pop();
					}
				}
			)


			opcode(0x110, 'random', 1, 1,
				function random(max){
					if (max === 1 || max === 0xFFFFFFFF)
						return 0;
					
					let random: MersenneTwister = this.random;
					if (!random){
						random = this.random = new MersenneTwister();
					}
					if (max === 0){
						return random.genrand_int32();
					}
					
					max = int32(max);
					if (max < 0){
						return  uint32( - (random.genrand_int31() % -max));
					}
					return random.genrand_int31() % max;
				}
			);
			
			opcode(0x111, 'setrandom',1, 0,
				function setrandom(seed){
					if (!seed) seed = undefined;
					this.random = new MersenneTwister(seed);
				}
			);

			opcode(0x1000, 'fyrecall', 3, 1, Engine.prototype.fyreCall);

			return opcodes;
		}
	}
	
	const enum SearchOptions {
		KeyIndirect = 1,
        ZeroKeyTerminates = 2,
        ReturnIndex = 4
	}
	
	function PerformBinarySearch(key, keySize, start, structSize, numStructs, keyOffset, options){
		if (options & SearchOptions.ZeroKeyTerminates)
			throw new Error("ZeroKeyTerminated option may not be used with binary search");
		if (keySize > 4 && !(options & SearchOptions.KeyIndirect) )
			throw new Error("KeyIndirect option must be used when searching for a >4 byte key");
		let returnIndex = options & SearchOptions.ReturnIndex;
		let low =0, high = numStructs;
		while (low < high){
			let index = Math.floor((low+high) / 2);
			let cmp = compareKeys.call(this, key, start + index*structSize + keyOffset, keySize, options);
			if (cmp === 0){
				// found it
				if (returnIndex) return index;
				return start+index*structSize;
			}
			if (cmp < 0){
				high = index;
			}else{
				low = index + 1;	
			}
		}
		// did not find
		return returnIndex ? 0xFFFFFFFF : 0;
	}
	
	
	function PerformLinearSearch(key, keySize, start, structSize, numStructs, keyOffset, options){
		if (keySize > 4 && !(options & SearchOptions.KeyIndirect) )
			throw new Error("KeyIndirect option must be used when searching for a >4 byte key");
		let returnIndex = options & SearchOptions.ReturnIndex;
		for (let i = 0; i<numStructs; i++){
			let cmp = compareKeys.call(this, key, start + i*structSize + keyOffset, keySize, options);
			if (cmp === 0){
				// found it
				if (returnIndex) return i;
				return start+i*structSize;
			}
			if (options & SearchOptions.ZeroKeyTerminates){
				if (keyIsZero.call(this, start + i*structSize + keyOffset, keySize)){
					break;
				}
			}
		}
		// did not find
		return returnIndex ? 0xFFFFFFFF : 0;
	}
	
	function PerformLinkedSearch(key, keySize, start, keyOffset, nextOffset, options){
		if (options & SearchOptions.ReturnIndex)
			throw new Error("ReturnIndex option may not be used with linked search");
		let node = start;
		while (start){
			let cmp = compareKeys.call(this, key, node + keyOffset, keySize, options);
			if (cmp === 0){
				// found it
				return node;
			}
			if (options & SearchOptions.ZeroKeyTerminates){
				if (keyIsZero.call(this, node + keyOffset, keySize)){
					return 0;
				}
			}
			// advance the next item
			node = this.image.readInt32(node+nextOffset);
		}
	}
	
	function keyIsZero(address, size){
		while(size--){
			if (this.image.readByte(address+size) !== 0)
				return false;
		}
		return true;
	}
	
	function compareKeys(query:number, candidateAddr: number, keySize: number, options: number){
		let { image } = this;
		if (options & SearchOptions.KeyIndirect){
			// KeyIndirect *is* set
            // compare the bytes stored at query vs. candidateAddr
 			for (let i=0; i<keySize; i++){
				let b1 = image.readByte(query++);
				let b2 = image.readByte(candidateAddr++);
				if (b1 < b2)
					return -1;
				if (b1 > b2)
					return 1; 
			}
			return 0;
		}	
		
		// KeyIndirect is *not* set
        // mask query to the appropriate size and compare it against the value stored at candidateAddr
		let ckey;
		switch(keySize){
			case 1:
				ckey = image.readByte(candidateAddr);
				query &= 0xFF;
				return query - ckey;
			case 2:
				ckey = image.readInt16(candidateAddr);
				query &= 0xFFFF;
				return query - ckey;
			case 3:
				ckey = image.readInt32(candidateAddr) & 0xFFFFFF;
				query &= 0xFFFFFF;
				return query - ckey;
			case 4:
				ckey = image.readInt32(candidateAddr);
				return query - ckey;
		}
		
	}
}