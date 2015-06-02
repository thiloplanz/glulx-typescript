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

		export function p_in(a:LoadOperandType, b:LoadOperandType = 0){
			return a + (b << 4);
		}

		export function p_out(a: StoreOperandType, b:StoreOperandType = 0){
			return  a + (b << 4);
		}
		
		export function stepImage(gameImage: UlxImage, stepCount = 1) : Engine{
			let engine = new Engine(gameImage);
			engine.bootstrap();
			while(stepCount--){
				engine.step();
			}
			return engine;
		}
	
		function testLoadOperandTypeByte(test: nodeunit.Test){
			
			let gameImage = makeTestImage(this,
				0x00, 0x00, 0x00,  // type C0, no args
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

		function testLoadOperandTypeInt16(test: nodeunit.Test){
			
			let gameImage = makeTestImage(this,
				0x00, 0x00, 0x00,  // type C0, no args
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


		function testLoadOperandTypeInt32(test: nodeunit.Test){
			
			let gameImage = makeTestImage(this,
				0x00, 0x00, 0x00,  // type C0, no args
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

		function testStoreOperandTypePtr_32(test: nodeunit.Test){
			
			let gameImage = makeTestImage(this,
				0x00, 0x00, 0x00,  // type C0, no args
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


		export function addEngineTests(tests, m: MemoryAccess){
			tests.Engine = {
				testLoadOperandTypeByte : testLoadOperandTypeByte.bind(m),
				testLoadOperandTypeInt16 : testLoadOperandTypeInt16.bind(m),
				testLoadOperandTypeInt32 : testLoadOperandTypeInt32.bind(m),
				testStoreOperandTypePtr_32 : testStoreOperandTypePtr_32.bind(m)
			}
		}

	}
}