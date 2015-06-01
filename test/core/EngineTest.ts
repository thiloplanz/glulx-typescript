// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/Engine.ts' />
/// <reference path='../nodeunit.d.ts' />


module FyreVM{
	
	export module NodeUnit {

		function makeTestImage(m: MemoryAccess, ...code : number[]): UlxImage{
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

		function op(name: string) : number{
			for (var c in opcodes) {
				if (opcodes[c].name === name){
					return opcodes[c].code;
				}
			}
			throw `unknown opcode ${name}`
		}

		function p_in(a:LoadOperandType, b:LoadOperandType = 0){
			return a + (b << 4);
		}

		function p_out(a: StoreOperandType, b:StoreOperandType = 0){
			return  a + (b << 4);
		}

		function testBootstrap(test: nodeunit.Test){
			
			let gameImage = makeTestImage(this,
				0x00, 0x00, 0x00,  // type C0, no args
				op('nop'),
				op('add'), 
				    p_in(LoadOperandType.byte, LoadOperandType.byte), 
					p_out(StoreOperandType.ptr_16),
					1, 1, 
					0x03, 0xA0
			);
	
			let engine = new Engine(gameImage);
			engine.bootstrap();
			engine.step();
			engine.step();
			test.equals(gameImage.readInt32(0x03A0), 2, "1+1=2");
			test.done();	
		}


		export function addEngineTests(tests, m: MemoryAccess){
			tests.testBootstrap = testBootstrap.bind(m);
		}

	}
}