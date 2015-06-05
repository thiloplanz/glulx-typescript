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
		
		export function addOpcodeTests(tests, m: MemoryAccess){
			tests.Opcodes = { Arithmetics: {}, Branching: {}, Functions: {}, Variables: {} }
			
		
		tests.Opcodes.Arithmetics.testAdd = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'add', 40, 2, 42);
			test.done();	
		}
		
		tests.Opcodes.Arithmetics.testSub = 
		function(test: nodeunit.Test){
			check_byte_byte_store(m, test, 'sub', 47, 5, 42);
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
				0x81, 0x04, // double-byte opcode 0x0104
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
				0x81, 0x60, // double-byte opcode 0x0160
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
		
		
		}
	}
}