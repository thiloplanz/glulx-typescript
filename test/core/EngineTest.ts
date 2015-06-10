// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/Engine.ts' />
/// <reference path='../nodeunit.d.ts' />


module FyreVM{
	
	export module NodeUnit {

		export function makeTestImage(m: MemoryAccess, ...code : number[]): UlxImage{
			let c = 256;
			UlxImage.writeHeader({
				endMem: 10*1024,
				version: 0x00030100,
				startFunc: c,
				stackSize: 1024,
				ramStart: 0x03A0
			}, m, 0);
			
			// allow for two-byte opcodes
			if (code[3] > 255){
				let oc = code[3];
				if (oc > 0x8000)
					throw `cannot encode opcode ${oc}`
				code.splice(3, 1, (oc + 0x8000) >> 8, oc & 0xFF);
			}
			
			for(let i=0; i<code.length; i++){
				m.writeByte(c++, code[i]);
			}
			
			return new UlxImage(m);
		}
		
		let opcodes = Opcodes.initOpcodes();

		export function op(name: string) : number{
			for (var c in opcodes) {
				if (opcodes[c].name === name){
					return opcodes[c].code;
				}
			}
			throw `unknown opcode ${name}`
		}

		export function p_in(a:LoadOperandType, b:LoadOperandType|StoreOperandType = 0){
			return a + (b << 4);
		}

		export function p_out(a: StoreOperandType, b:StoreOperandType = 0){
			return  a + (b << 4);
		}
		
		export function stepImage(gameImage: UlxImage, stepCount = 1, test?: nodeunit.Test, initialStack? : number[]) : Engine{
			try{
				let engine:any = new Engine(gameImage);
				engine.bootstrap();
				if (initialStack){
					for (let i=initialStack.length -1 ; i>=0; i--){
						engine.push(initialStack[i]);
					}
				}
				while(stepCount--){
					engine.step();
				}
				return engine;
			}
			catch(e){
				if (!test)
					throw e;
				test.strictEqual(null, e, e);
			}
		}
	
		export function addEngineTests(tests, m: MemoryAccess){
			tests.Engine = { }
	
	
		tests.Engine.testLoadOperandTypeByte =
		function(test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ptr_16),
					1, 1, 
					0x03, 0xA0
			);
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03A0), 2, "1+1=2");
			test.done();	
		}

		tests.Engine.testLoadOperandTypeInt16 =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.int16, LoadOperandType.int16), 
					p_out(StoreOperandType.ptr_16),
					0x01, 0x0F, 0x02, 0xF0, 
					0x03, 0xA0
			);
	
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03A0), 0x03FF, "0x010F+0x02F0=0x03FF");
			test.done();	
		}

		tests.Engine.testLoadOperandTypeInt32 =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.int32, LoadOperandType.zero), 
					p_out(StoreOperandType.ptr_16),
					0x01, 0x0F, 0x02, 0xF0, 
					0x03, 0xA0
			);
	
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03A0), 0x010F02F0, "0x010F02F0+0");
			test.done();	
		}
		
		tests.Engine.testLoadOperandTypePtr_32 =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.ptr_16, LoadOperandType.ptr_32), 
					p_out(StoreOperandType.ptr_16),
					0x03, 0xA0, 
					0x00, 0x00, 0x03, 0xA0, 
					0x03, 0xA0
			);
	
			gameImage.writeInt32(0x03A0, 0x01020304);
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03A0), 0x02040608, "ramStart := add ramStart, ramStart");
			test.done();	
		}
		
		tests.Engine.testLoadOperandTypeStack =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.stack, LoadOperandType.stack), 
					p_out(StoreOperandType.ptr_16),
					0x03, 0xA0
			);
	
			gameImage.writeInt32(0x03A0, 0x01020304);
			stepImage(gameImage,1, test, [12, 19]);
			test.equals(gameImage.readInt32(0x03A0), 31, "ramStart := add 12, 19");
			test.done();	
		}
		
		tests.Engine.testLoadOperandTypeRAM =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.ram_16, LoadOperandType.ram_8), 
					p_out(StoreOperandType.ptr_16),
					0, 0x10, 0x10, 
					0x03, 0xA0
			);
	
			gameImage.writeInt32(0x03B0, 0x01020304);
			stepImage(gameImage,1, test);
			test.equals(gameImage.readInt32(0x03A0), 0x02040608, "ramStart := add 0x01020304, 0x01020304");
			test.done();	
		}

		tests.Engine.testStoreOperandTypePtr_32 =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ptr_32),
					1, 1, 
					0x00, 0x00, 0x03, 0xA0
			);
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03A0), 2, "1+1=2");
			test.done();	
		}
		
		tests.Engine.testStoreOperandTypeRAM_32 =
		function (test: nodeunit.Test){
			
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ram_32),
					1, 1, 
					0x00, 0x00, 0x00, 0x21
			);
			stepImage(gameImage);
			test.equals(gameImage.readInt32(0x03C1), 2, "1+1=2");
			test.done();	
		}
		
		
		tests.Engine.run = 
		function(test: nodeunit.Test){
			let gameImage = makeTestImage(m,
				CallType.stack, 0x00, 0x00,  // type C0, no args
				op('add'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ptr_16),
					1, 1, 
					0x03, 0xA0,
				op('return'),
					p_in(LoadOperandType.zero)
			);
			let engine = new Engine(gameImage);
			engine.run();
			test.done();
		}
		

		}
		

	}
}