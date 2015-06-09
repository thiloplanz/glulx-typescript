// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/MemoryAccess.ts' />
/// <reference path='../../core/UlxImage.ts' />
/// <reference path='EngineTest.ts' />


module FyreVM{
	
	export module NodeUnit {
		
		function makeOpcodeImage_byte_byte_store(m: MemoryAccess, opcode: string, a: number, b: number){
			return makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op(opcode), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ptr_16),
					a, b, 
					0x03, 0xA0
			);
		}

		function makeOpcodeImage_byte_int32_store(m: MemoryAccess, opcode: string, a: number, b3: number, b2: number, b1 : number, b0:number){
			return makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op(opcode), 
				    p_in(LoadOperandType.byte, LoadOperandType.int32), 
					p_out(StoreOperandType.ptr_16),
					a, 
					b3, b2, b1, b0, 
					0x03, 0xA0
			);
		}

		
		function makeOpcodeImage_byte_store(m: MemoryAccess, opcode: string, x: number){
			return makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op(opcode), 
				    LoadOperandType.byte + StoreOperandType.ptr_16 * 0x10,
					x, 
					0x03, 0xA0
			);
		}
		
		function makeOpcodeImage_int32_store(m: MemoryAccess, opcode: string, x3: number, x2: number, x1: number, x0:number){
			return makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op(opcode), 
				    LoadOperandType.int32 + StoreOperandType.ptr_16 * 0x10,
					x3, x2, x1, x0, 
					0x03, 0xA0
			);
		}
		
		
		function check_byte_byte_store(m: MemoryAccess, test: nodeunit.Test, opcode: string, a: number, b:number, expected: number){
		
			try{
				let gameImage = makeOpcodeImage_byte_byte_store(m,opcode, a, b);
				stepImage(gameImage);
				test.equals(gameImage.readInt32(0x03A0), expected, `${opcode}(${a}, ${b}) == ${expected}`);
		
			}
			catch(e){
				test.strictEqual(null, e, e);
			}
			
		}
		
		function check_byte_int32_store(m: MemoryAccess, test: nodeunit.Test, opcode: string, a: number, b3:number, b2:number, b1:number, b0:number, expected: number){
		
			try{
				let gameImage = makeOpcodeImage_byte_int32_store(m,opcode, a, b3, b2, b1, b0);
				stepImage(gameImage);
				test.equals(gameImage.readInt32(0x03A0), expected, `${opcode}(${a}, ${b3} ${b2} ${b1} ${b0}) == ${expected}`);
		
			}
			catch(e){
				test.strictEqual(null, e, e);
			}
			
		}
		
		function check_byte_store(m: MemoryAccess, test: nodeunit.Test, opcode: string, x: number, expected: number){
		
			try{
				let gameImage = makeOpcodeImage_byte_store(m,opcode, x);
				stepImage(gameImage);
				test.equals(gameImage.readInt32(0x03A0), expected, `${opcode}(${x}) == ${expected}`);
		
			}
			catch(e){
				if (typeof e === 'string')
					test.strictEqual(null, e, e);
				throw e;
			}
			
		}
		
		function check_int32_store(m: MemoryAccess, test: nodeunit.Test, opcode: string, x3: number, x2:number, x1:number, x0:number, expected: number){
		
			try{
				let gameImage = makeOpcodeImage_int32_store(m,opcode, x3, x2, x1, x0);
				gameImage.writeInt32(0x03A0, 0);
				stepImage(gameImage);
				test.equals(gameImage.readInt32(0x03A0), expected, `${opcode}(${x3} ${x2} ${x1} ${x0}) == ${expected}`);
		
			}
			catch(e){
				if (typeof e === 'string')
					test.strictEqual(null, e, e);
				throw e;
			}
			
		}
		
		function check_int16_int16_int16(m: MemoryAccess, test: nodeunit.Test, opcode: string, a:number, b:number, c:number, expected: number){
		
			try{
				
				let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						op(opcode), 
						    p_in(LoadOperandType.int16, LoadOperandType.int16), 
							p_in(LoadOperandType.int16),
							a >> 8, a &0xFF,
							b >> 8, b &0xFF,
							c >> 8, c &0xFF
					);
				gameImage.writeInt32(0x03A0, 0);
				stepImage(gameImage);
				test.equals(gameImage.readInt32(0x03A0), expected, `${opcode}(${a} ${b} ${c}) == ${expected}`);
		
			}
			catch(e){
				if (typeof e === 'string')
					test.strictEqual(null, e, e);
				throw e;
			}
			
		}
		
		export function addOpcodeTests(tests, m: MemoryAccess){
			tests.Opcodes = { 
				Arithmetics: {}, 
				Branching: {},
				Functions: {}, 
				Variables: {},
				Output: {},
				MemoryManagement: {},
				StackManipulation: {},
				GameState: {},
				Misc: {}
			 }
			
		
		tests.Opcodes.Arithmetics.testAdd = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'add', 40, 2, 42);
			check_byte_byte_store(m, test, 'add', 0, 0, 0);
			check_byte_int32_store(m, test, 'add', 40, 0xFF, 0xFF, 0xFF, 0xFE, 38);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testSub = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'sub', 47, 5, 42);
			check_byte_byte_store(m, test, 'sub', 0, 3,  0xFFFFFFFF -3 + 1);
			check_byte_int32_store(m, test, 'sub', 0, 0xFF, 0xFF, 0xFF, 0xFD,  3);
			
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testMul = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'mul', 6, 7, 42);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testDiv = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'div', 50, 7, 7);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testMod = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'mod', 47, 5, 2);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testNeg = 
		function(test: nodeunit.Test){
			check_byte_store(m, test, 'neg', 5, 0xFFFFFFFA);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testBitAnd = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'bitand', 0xFF, 0x11, 0x11);
			check_byte_byte_store(m, test, 'bitand', 0x00, 0x11, 0x00);
			check_byte_byte_store(m, test, 'bitand', 0xF0, 0xAA, 0xA0);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testBitOr = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'bitor', 0xFF, 0x11, 0xFF);
			check_byte_byte_store(m, test, 'bitor', 0x00, 0x11, 0x11);
			check_byte_byte_store(m, test, 'bitor', 0xF0, 0xAA, 0xFA);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testBitXor = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'bitxor', 0xFF, 0x11, 0xEE);
			check_byte_byte_store(m, test, 'bitxor', 0x00, 0x11, 0x11);
			check_byte_byte_store(m, test, 'bitxor', 0xF0, 0xAA, 0x5A);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testBitNot = 
		function(test: nodeunit.Test){
			check_byte_store(m, test, 'bitnot', 0xFF, 0xFFFFFF00);
			check_byte_store(m, test, 'bitnot', 0x00, 0xFFFFFFFF);
			check_byte_store(m, test, 'bitnot', 0xF0, 0xFFFFFF0F);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testShiftl = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'shiftl', 5, 1, 10);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testSShiftr = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'sshiftr', 5, 1, 2);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testUShiftr = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'ushiftr', 5, 1, 2);
			test.done();	
		}
		
		function writeAddFunction(image: UlxImage, address: number){
			image.writeBytes(address, 
				op('add'),
				p_in(LoadOperandType.byte, LoadOperandType.byte), 
				p_out(StoreOperandType.ptr_16),
				10, 20, 
				0x03, 0xA0,
				op('return'),
				p_in(LoadOperandType.byte),
				155);
		}
		
		tests.Opcodes.Branching.testJump =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 263 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jump'), 
				    p_in(LoadOperandType.int16, 0), 
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJumpAbs =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jumpabs'), 
				    p_in(LoadOperandType.int16, 0), 
					label >> 8, label & 0xFF
			);
			
			writeAddFunction(image, label);
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJz =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 263 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jz'), 
				    p_in(LoadOperandType.zero, LoadOperandType.int16), 
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJnz =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 264 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jnz'), 
				    p_in(LoadOperandType.byte, LoadOperandType.int16),
					12, 
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		

		tests.Opcodes.Branching.testJeq =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jeq'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 12,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 

		tests.Opcodes.Branching.testJne =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jne'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 10,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJlt =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jlt'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 15,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJlt_negative =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 269 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jlt'), 
				    p_in(LoadOperandType.int32, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					0xFF, 0, 0, 0,
					15,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 

		tests.Opcodes.Branching.testJge =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jge'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 10,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJgt =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jgt'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 10,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJle =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jle'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 12,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		
		tests.Opcodes.Branching.testJltu =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jltu'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 15,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 

		tests.Opcodes.Branching.testJgeu =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jgeu'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 10,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJgtu =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jgtu'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 10,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 
		
		tests.Opcodes.Branching.testJleu =
		function(test: nodeunit.Test){
			//          jump label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			let jumpTarget = label - 266 + 2;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('jleu'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					p_in(LoadOperandType.int16),
					12, 12,
					jumpTarget >> 8, jumpTarget & 0xFF
			);
			writeAddFunction(image, label);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		} 

		tests.Opcodes.Functions.testCall_no_args =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('call'), 
				    p_in(LoadOperandType.int16, LoadOperandType.zero),
					0, // void
					label >> 8, label & 0xFF
			);
			image.writeBytes(label, CallType.stack, 0, 0);  // type C0, no args
			writeAddFunction(image, label + 3);		
			let engine = stepImage(image, 2);
			test.equal(image.readInt32(label), 30);	
			test.equal(engine['SP'], 44);
			test.done();	
		}
		
		tests.Opcodes.Functions.testCall_stack_args =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('call'), 
				    p_in(LoadOperandType.int16, LoadOperandType.byte),
					0, // void
					label >> 8, label & 0xFF,
					2 // two args
			);
			image.writeBytes(label,
				CallType.stack, 0, 0,
				// pop the number of arguments
				op('add'), p_in(LoadOperandType.stack, LoadOperandType.zero),
				p_out(StoreOperandType.discard),
				// add the two arguments on the stack
				op('add'),
				p_in(LoadOperandType.stack, LoadOperandType.stack), 
				p_out(StoreOperandType.ptr_16),
				0x03, 0xA0);
			let engine = stepImage(image, 3, test, [ 39, 3 ]);
			test.equal(image.readInt32(label), 42);	
			test.done();	
		}


		tests.Opcodes.Functions.testCallf  =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('callf'),
				    p_in(LoadOperandType.int16, 0/* void*/),
					label >> 8, label & 0xFF
			);
			image.writeBytes(label, CallType.stack, 0, 0);  // type C0, no args
			writeAddFunction(image, label + 3);		
			let engine = stepImage(image, 2, test);
			test.equal(image.readInt32(label), 30);	
			test.done();	
		}
		
		tests.Opcodes.Functions.testCallfi  =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x61, // double-byte opcode 0x0161
				    p_in(LoadOperandType.int16, LoadOperandType.byte),
					0, // void
					label >> 8, label & 0xFF,
					12
			);
			image.writeBytes(label,
				CallType.stack, 0, 0,
				// pop the number of arguments
				op('add'), p_in(LoadOperandType.stack, LoadOperandType.zero),
				p_out(StoreOperandType.discard),
				// add 30 to the argument on the stack
				op('add'),
				p_in(LoadOperandType.byte, LoadOperandType.stack), 
				p_out(StoreOperandType.ptr_16),
				30,
				0x03, 0xA0);
			let engine = stepImage(image, 3, test);
			test.equal(image.readInt32(label), 42);	
			test.done();	
		}
		
		tests.Opcodes.Functions.testCallfii  =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x62, // double-byte opcode 0x0162
				    p_in(LoadOperandType.int16, LoadOperandType.byte),
					p_in(LoadOperandType.byte, 0 /* void */),
					label >> 8, label & 0xFF,
					12,
					30
			);
			image.writeBytes(label,
				CallType.stack, 0, 0,
				// pop the number of arguments
				op('add'), p_in(LoadOperandType.stack, LoadOperandType.zero),
				p_out(StoreOperandType.discard),
				// add the two arguments on the stack
				op('add'),
				p_in(LoadOperandType.stack, LoadOperandType.stack), 
				p_out(StoreOperandType.ptr_16),
				0x03, 0xA0);
			let engine = stepImage(image, 3);
			test.equal(image.readInt32(label), 42);	
			test.done();	
		}
		
		tests.Opcodes.Functions.testCallfiii  =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x63, // double-byte opcode 0x0163
				    p_in(LoadOperandType.int16, LoadOperandType.byte),
					p_in(LoadOperandType.byte, LoadOperandType.byte),
					0, // void
					label >> 8, label & 0xFF,
					55,
					12,
					30
			);
			image.writeBytes(label,
				CallType.stack, 0, 0,
				// pop the number of arguments
				op('add'), p_in(LoadOperandType.stack, LoadOperandType.zero),
				p_out(StoreOperandType.discard),
				// pop the first argument
				op('add'), p_in(LoadOperandType.stack, LoadOperandType.zero),
				p_out(StoreOperandType.discard),
				// add the second and third arguments on the stack
				op('add'),
				p_in(LoadOperandType.stack, LoadOperandType.stack), 
				p_out(StoreOperandType.ptr_16),
				0x03, 0xA0);
			let engine = stepImage(image, 4, test);
			test.equal(image.readInt32(label), 42);	
			test.done();	
		}
		
		
		tests.Opcodes.Functions.testReturn =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('call'), 
				    p_in(LoadOperandType.int16, LoadOperandType.zero),
					p_out(StoreOperandType.ptr_16), // Store result in memory
					label >> 8, label & 0xFF,
					label >> 8, label & 0xFF
			);
			image.writeBytes(label, CallType.stack, 0, 0);  // type C0, no args
			writeAddFunction(image, label + 3);		// this returns 155
			let engine = stepImage(image, 3, test);  // .. on cycle 3
			test.equal(image.readInt32(label), 155);	
			test.done();	
		}
		
		// TODO: testCatch  testThrow
		
		tests.Opcodes.Functions.testTailCall =
		function(test: nodeunit.Test){
			//          call label
			// label:   add 10, 20 => label
			let label = 0x03A0;
			
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('tailcall'), 
				    p_in(LoadOperandType.int16, LoadOperandType.zero),
					label >> 8, label & 0xFF
			);
			image.writeBytes(label, CallType.stack, 0, 0);  // type C0, no args
			writeAddFunction(image, label + 3);		
			let engine = stepImage(image, 2, test);
			test.equal(image.readInt32(label), 30);	
			test.equal(engine['SP'], 16);
			test.done();	
		}
		
		tests.Opcodes.Variables.testCopy = 
		function(test: nodeunit.Test){
			check_byte_store(m, test, 'copy', 5, 5);
			test.done();	
		}
		
		tests.Opcodes.Variables.testCopys = 
		function(test: nodeunit.Test){
			check_int32_store(m, test, 'copys', 1, 2, 3, 4 , 0x03040000);
			test.done();	
		}
		
		tests.Opcodes.Variables.testCopyb = 
		function(test: nodeunit.Test){
			check_int32_store(m, test, 'copyb', 1, 2, 3, 4, 0x04000000);
			test.done();	
		}
		
		tests.Opcodes.Variables.testSexs = 
		function(test: nodeunit.Test){
			check_int32_store(m, test, 'sexs', 1, 2, 0x80, 5, 0xFFFF8005);
			check_int32_store(m, test, 'sexs', 9, 9, 0, 5, 5);
			test.done();	
		}
		
		tests.Opcodes.Variables.testSexb = 
		function(test: nodeunit.Test){
			check_int32_store(m, test, 'sexb', 9, 9, 9, 0x85, 0xFFFFFF85);
			check_int32_store(m, test, 'sexb', 9, 9, 9, 5, 5);
			test.done();	
		}

		tests.Opcodes.Variables.testAload = 
		function(test: nodeunit.Test){
			// "array" is the code segment 
			// array[1] = { CallType.stack, 0x00, 0x00, opcode } )
			check_byte_byte_store(m, test, 'aload', 252, 1, 0xC0000048);
			
			// negative indexing:
			// byte 0 is 'Glul'
			let GLUL = 0x476c756c;
			check_byte_int32_store(m, test, 'aload', 4, 0xFF, 0xFF, 0xFF, 0xFF, GLUL);
			
			test.done();	
		}

		tests.Opcodes.Variables.testAloads = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'aloads', 252, 2, 0xC000);
			test.done();	
		}

		tests.Opcodes.Variables.testAloadb = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'aloadb', 252, 4, 0xC0);
			test.done();	
		}
		
		tests.Opcodes.Variables.testAloadbit = 
		function(test: nodeunit.Test){
			// 0xC0 = 1100 0000
			check_byte_byte_store(m, test, 'aloadbit', 252, 32, 0);
			check_byte_byte_store(m, test, 'aloadbit', 252, 39, 1);
			test.done();	
		}
		
		tests.Opcodes.Variables.testAstore = 
		function(test: nodeunit.Test){
			check_int16_int16_int16(m, test, 'astore', 0x0300, 0xA0 / 4, 99, 99);
			test.done();	
		}
		
		tests.Opcodes.Variables.testAstores = 
		function(test: nodeunit.Test){
			check_int16_int16_int16(m, test, 'astores', 0x0300, 0xA0 / 2 + 1, 99, 99);
			test.done();	
		}
		
		tests.Opcodes.Variables.testAstoreb = 
		function(test: nodeunit.Test){
			check_int16_int16_int16(m, test, 'astoreb', 0x0300, 0xA0 + 3, 99, 99);
			test.done();	
		}

		tests.Opcodes.Variables.testAstorebit = 
		function(test: nodeunit.Test){
			check_int16_int16_int16(m, test, 'astorebit', 0x03A0, 28, 1, 16);
			check_int16_int16_int16(m, test, 'astorebit', 0x03A0, 7, 1, 0x80000000);
			check_int16_int16_int16(m, test, 'astorebit', 0x03A0, 7, 0, 0);
			
			test.done();	
		}

		tests.Opcodes.Output.setiosys = 
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x49, // double-byte opcode 0x0149
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					20, 0
			);
			let engine = stepImage(image, 0, test);
			test.equal(engine['outputSystem'], IOSystem.Null);
			engine.step();
			test.equal(engine['outputSystem'], IOSystem.Channels);
			test.done();	
		}
		
		tests.Opcodes.Output.streamchar = 
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x49, // double-byte opcode 0x0149
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					20, 0,
				op('streamchar'),
					p_in(LoadOperandType.byte),
					'X'.charCodeAt(0),
				op('streamchar'),
					p_in(LoadOperandType.int16),
					99, 'Y'.charCodeAt(0)
			);
			let engine = stepImage(image, 2, test);
			let channels = engine['outputBuffer'].flush();
			test.equal(channels['MAIN'], 'X');
			engine.step();
			channels = engine['outputBuffer'].flush();
			test.equal(channels['MAIN'], 'Y');
			test.done();	
		}
		
		tests.Opcodes.Output.streamunichar = 
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x49, // double-byte opcode 0x0149
				    p_in(LoadOperandType.byte, LoadOperandType.byte),
					20, 0,
				op('streamunichar'),
					p_in(LoadOperandType.int16),
					0x30, 0x42
			);
			let engine = stepImage(image, 2, test);
			let channels = engine['outputBuffer'].flush();
			test.equal(channels['MAIN'], 'あ');
			test.done();	
		}

		tests.Opcodes.MemoryManagement.getmemsize =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x02, // double-byte opcode 0x0102
				    p_out(StoreOperandType.ptr_16),
					0x03, 0xA0
			);
			let engine = stepImage(image, 1, test);
			test.equal(image.readInt32(0x03A0), image.getEndMem());
			test.done();	
		};

		tests.Opcodes.MemoryManagement.setmemsize =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x03, // double-byte opcode 0x0103
				    p_in(LoadOperandType.int16, LoadOperandType.zero),
					0x05, 0xA0
			);
			let engine = stepImage(image, 1, test);
			test.equal(image.getEndMem(), 0x0600, "rounded up to multiple of 256");
			test.done();	
		};

		tests.Opcodes.MemoryManagement.mzero =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x70, // double-byte opcode 0x0170
				    p_in(LoadOperandType.byte, LoadOperandType.int16),
					0xFF,
					0x03, 0xA0
			);
			image.writeInt32(0x03A0, 0x12345678)
			let engine = stepImage(image, 1, test);
			test.equal(image.readInt32(0x03A0), 0);
			test.done();	
		};

		tests.Opcodes.MemoryManagement.mcopy =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x71, // double-byte opcode 0x0171
				    p_in(LoadOperandType.byte, LoadOperandType.int16),
					p_in(LoadOperandType.int16),
					0xFF,
					0x01, 0x00,
					0x03, 0xA0
			);
			let engine = stepImage(image, 1, test);
			test.equal(image.readInt32(0x03A0), 0xC0000081);
			test.done();	
		};
		
		
		tests.Opcodes.MemoryManagement.malloc =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x78, // double-byte opcode 0x0178
				    p_in(LoadOperandType.byte, LoadOperandType.ptr_16),
					0x08,
					0x03, 0xA0
			);
			// lower memory limit to make space for heap
			image.setEndMem(8000);
			let engine = stepImage(image, 1, test);
			let heap : HeapAllocator = engine['heap'];
			test.ok(heap, "allocator was created");
			test.equals(1, heap.blockCount());
			test.done();	
		};
		

		tests.Opcodes.MemoryManagement.mfree =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x78, // double-byte opcode malloc
				    p_in(LoadOperandType.byte, LoadOperandType.ptr_16),
					0x08,
					0x03, 0xA0,
				0x81, 0x79, // double-byte opcode mfree
					p_in(LoadOperandType.ptr_16),
					0x03, 0xA0
			);
			// lower memory limit to make space for heap
			image.setEndMem(8000);
			let engine = stepImage(image, 1, test);
			test.ok(engine['heap'], "allocator was created");
			engine.step();
			test.equal(engine['heap'], null, "allocator was destroyed");
			test.done();	
		};
		
		tests.Opcodes.StackManipulation.stkcount =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('stkcount'),
				    p_out(StoreOperandType.ptr_16),
					0x03, 0xA0
			);
			let engine = stepImage(image, 1, test, [1,2,3,4]);
			test.equal(image.readInt32(0x03A0),4);
			test.done();	
		}


		tests.Opcodes.StackManipulation.stkpeek =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('stkpeek'),
				    p_in(LoadOperandType.byte, LoadOperandType.ptr_16),
					1,
					0x03, 0xA0
			);
			let engine = stepImage(image, 1, test, [1,2,3,4]);
			test.equal(image.readInt32(0x03A0),2);
			test.done();	
		}
		
		tests.Opcodes.StackManipulation.stkswap =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('stkswap')
			);
			let engine = stepImage(image, 1, test, [1,2,3,4]);
			let a = engine['pop']();
			let b = engine['pop']();
			let c = engine['pop']();
			test.equal(a,2);
			test.equal(b,1);
			test.equal(c,3);
			test.done();	
		}
		
		tests.Opcodes.StackManipulation.stkroll =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('stkroll'),
				p_in(LoadOperandType.byte, LoadOperandType.byte),
				3, 1
			);
			let engine = stepImage(image, 1, test, [1,2,3,4]);
			let a = engine['pop']();
			let b = engine['pop']();
			let c = engine['pop']();
			let d = engine['pop']();
			
			test.equal(a,2);
			test.equal(b,3);
			test.equal(c,1);
			test.equal(d,4);
			
			test.done();
			// TODO: negative roll	
		}


		tests.Opcodes.StackManipulation.stkcopy =
		function(test: nodeunit.Test){
			let image = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('stkcopy'),
				p_in(LoadOperandType.byte),
				2
			);
			let engine = stepImage(image, 1, test, [1,2,3,4]);
			let a = engine['pop']();
			let b = engine['pop']();
			let c = engine['pop']();
			test.equal(a,1);
			test.equal(b,2);
			test.equal(c,1);
			test.done();	
		}
		
		tests.Opcodes.GameState.quit = 
		function(test: nodeunit.Test){
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				0x81, 0x20  // "quit"
			);
			let engine = new Engine(gameImage);
			engine.run();
			test.done();
		}

		tests.Opcodes.Misc.gestalt = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'gestalt', Gestalt.GlulxVersion, 0, 0x00030102);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.TerpVersion, 0, 0x00000001);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.ResizeMem, 0, 1);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.Undo, 0, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.Unicode, 0, 1);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.MemCopy, 0, 1);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.Acceleration, 0, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.Float, 0, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.IOSystem, 0, 1);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.IOSystem, 20, 1);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.IOSystem, 1, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.IOSystem, 2, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.MAllocHeap, 0, 0);
			check_byte_byte_store(m, test, 'gestalt', Gestalt.AccelFunc, 0, 0);
			
			
			test.done();
		}
		
		
		}
	}
}