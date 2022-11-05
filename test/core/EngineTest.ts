// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/Engine.ts' />
/// <reference path='../../core/Opcodec.ts' />

module FyreVM {

	export module NodeUnit {

		let RAM = 0x03A0;

		export function makeTestImage(m: MemoryAccess, ...code: any[]): UlxImage {
			let c = 256;
			UlxImage.writeHeader({
				endMem: 10 * 1024,
				version: 0x00030100,
				startFunc: c,
				stackSize: 1024,
				ramStart: RAM,
				decodingTbl: 0x3B0
			}, m, 0);


			for (let i = 0; i < code.length; i++) {
				let x = code[i];
				if (typeof (x) === 'number')
					m.writeByte(c++, code[i]);
				else {
					// flatten arrays
					for (let j = 0; j < x.length; j++) {
						m.writeByte(c++, x[j])
					}
				}
			}

			return new UlxImage(m);
		}

		let opcodes = Opcodes.initOpcodes();


		export function op(name: string): any {
			for (var c in opcodes) {
				if (opcodes[c].name === name) {
					let code = opcodes[c].code;
					if (code >= 0x1000) {
						return [0xC0, 0x00, code >> 8, code & 0xFF];
					}
					if (code >= 0x80) {
						code = code + 0x8000;
						return [code >> 8, code & 0xFF]
					}
					return code;
				}
			}
			throw new Error(`unknown opcode ${name}`);
		}



		export function p_in(a: LoadOperandType, b: LoadOperandType | StoreOperandType = 0) {
			return a + (b << 4);
		}

		export function p_out(a: StoreOperandType, b: StoreOperandType = 0) {
			return a + (b << 4);
		}

		export function stepImage(gameImage: UlxImage, stepCount = 1, test?, initialStack?: number[]): Engine {
			let engine: any = new Engine(gameImage);
			engine.bootstrap();
			if (initialStack) {
				for (let i = initialStack.length - 1; i >= 0; i--) {
					engine.push(initialStack[i]);
				}
			}
			while (stepCount--) {
				engine.step();
			}
			return engine;
		}

		export function addEngineTests(tests, m: MemoryAccess) {
			tests.Engine = {}


			tests.Engine.testLoadOperandTypeByte =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 1, 1, RAM)
					);
					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03A0), 2, "1+1=2");
					test.done();
				}

			tests.Engine.testLoadOperandTypeInt16 =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 0x010F, 0x02F0, RAM)
					);

					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03A0), 0x03FF, "0x010F+0x02F0=0x03FF");
					test.done();
				}

			tests.Engine.testLoadOperandTypeInt32 =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 0x010F02F0, 0, RAM)
					);

					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03A0), 0x010F02F0, "0x010F02F0+0");
					test.done();
				}

			tests.Engine.testLoadOperandTypePtr_32 =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', '*03A0', '*000003A0', RAM)
					);

					gameImage.writeInt32(0x03A0, 0x01020304);
					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03A0), 0x02040608, "ramStart := add ramStart, ramStart");
					test.done();
				}

			tests.Engine.testLoadOperandTypeStack =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 'pop', 'pop', RAM)
					);

					gameImage.writeInt32(0x03A0, 0x01020304);
					stepImage(gameImage, 1, test, [12, 19]);
					test.equals(gameImage.readInt32(0x03A0), 31, "ramStart := add 12, 19");
					test.done();
				}

			tests.Engine.testLoadOperandTypeLocal =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x04, 0x02, 0x00, 0x00,  // type C0, two locals
						encodeOpcode('copy', 12, 'Fr:00'),
						encodeOpcode('copy', 19, 'Fr:04'),
						encodeOpcode('add', 'Fr:00', 'Fr:04', RAM)
					);

					gameImage.writeInt32(0x03A0, 0x01020304);
					stepImage(gameImage, 3, test);
					test.equals(gameImage.readInt32(0x03A0), 31, "ramStart := add 12, 19");
					test.done();
				}


			tests.Engine.testLoadOperandTypeRAM =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', '*R:0010', '*R:10', RAM)
					);

					gameImage.writeInt32(0x03B0, 0x01020304);
					stepImage(gameImage, 1, test);
					test.equals(gameImage.readInt32(0x03A0), 0x02040608, "ramStart := add 0x01020304, 0x01020304");
					test.done();
				}

			tests.Engine.testStoreOperandTypePtr_32 =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 1, 1, '*000003A0')
					);
					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03A0), 2, "1+1=2");
					test.done();
				}

			tests.Engine.testStoreOperandTypeRAM_32 =
				function (test) {

					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 1, 1, '*R:00000021')
					);
					stepImage(gameImage);
					test.equals(gameImage.readInt32(0x03C1), 2, "1+1=2");
					test.done();
				}


			tests.Engine.run =
				function (test) {
					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 1, 1, RAM),
						encodeOpcode('return', 0)
					);
					let engine = new Engine(gameImage);
					engine.run();
					test.done();
				}

			tests.Engine.saveToQuetzal =
				function (test) {
					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 100, 11, 'push'),
						encodeOpcode('return', 0)
					);
					let engine = new Engine(gameImage);
					engine.run();
					let q = engine.saveToQuetzal(0, 0);
					test.equal(q.getChunk('IFhd').byteLength, 128, 'game file identifier present');
					test.equal(q.getChunk('MAll'), undefined, 'no heap');
					let stack = new MemoryAccess(0);
					stack.buffer = new Uint8Array(q.getChunk('Stks'));
					test.equal(stack.readInt32(12), 111, 'result data found in saved stack')
					test.done();
				}

			tests.Engine.quetzalRoundTrip =
				function (test) {
					let gameImage = makeTestImage(m,
						CallType.stack, 0x00, 0x00,  // type C0, no args
						encodeOpcode('add', 100, 11, 'push'),
						encodeOpcode('return', 0)
					);
					let engine = new Engine(gameImage);
					engine.run();
					let q = engine.saveToQuetzal(0, 0);
					engine = new Engine(gameImage);
					engine.loadFromQuetzal(q);
					test.equal(engine['stack'].readInt32(12), 111, 'result data found in saved stack');
					test.done();
				}

		}


	}
}