// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/Opcodec.ts' />
/// <reference path='EngineTest.ts' />



module FyreVM{
	
	export module NodeUnit {

			export function addOpcodecTests(tests){
	
				let m = new MemoryAccess(10240);
				tests.Opcodec = {};
				
				
				tests.Opcodec.testEncodeOpcode_DelayedStore =
				function(test: nodeunit.Test){
					let [ oc1, oc2, load, store, addr1, addr2, addr3, addr4, arg0, rest ] = encodeOpcode('callfi', 0xa5fc6, 1, StoreOperandType.discard);
					test.equal(oc1 * 0x100+  oc2 , 0x8161);
					test.equal(addr2 *0x10000 + addr3 *0x100 + addr4, 0xa5fc6);
					test.equal(arg0, 1);
					test.equal(rest, undefined);
					test.done();
				}
				
				tests.Opcodec.testDecodeFunction = 
				function(test: nodeunit.Test){
					let gameImage = makeTestImage(m,
						CallType.stack, 0x04, 0x02, 0x00, 0x00, // type C0, two locals
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('return', 'pop')
					)
					let f = decodeFunction(m, 256);
					test.equals(f.opcodes.length, 2);
					test.equals(f.locals_32, 2);
					test.equals(f.locals_16, 0);
					test.equals(f.callType, CallType.stack);
					test.done();
				}
				
				tests.Opcodec.testDecodeFunction_0xaf20 = 
				function(test: nodeunit.Test){
					// taken from real game image, used to cause an infinite loop
					let gameImage = makeTestImage(m,
						CallType.localStorage, 0x00, 0x00, 
						encodeOpcode('callfi', 0xa5fc6, 1, StoreOperandType.discard),
						encodeOpcode('jnz', "*R:80", 0x13),
						encodeOpcode('copy', 1, "*R:0314"),
						encodeOpcode('callfi', 0xa5e5e, 2,  StoreOperandType.discard),
						encodeOpcode('jump', 0xed - 0xff - 1),
						encodeOpcode('callfi', 0xa5e5e, 3,  'push'),
						encodeOpcode('jnz', 'pop', 5),
						encodeOpcode('return', 1),
						encodeOpcode('jump', 0xdb - 0xff - 1),
						encodeOpcode('return', 1) // this is never reached
					)
					let f = decodeFunction(m, 256);
					test.equals(f.opcodes.length, 9, 'just 9, because final return is dead code');
					test.equals(f.locals_32, 0);
					test.equals(f.callType, CallType.localStorage);
					test.done();
				}
				
				
				
				tests.Opcodec.testDecodeCodeBlock =
				function(test: nodeunit.Test){
					
					let gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('return', 1)
					);
					test.equals(decodeCodeBlock(m, 256).length, 2);
					
					gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('jump', 1) // return 1
					);
					test.equals(decodeCodeBlock(m, 256).length, 2);
					
					gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('jump', 0) // return 0
					);
					test.equals(decodeCodeBlock(m, 256).length, 2);
					
					gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('jump', 2), // jump "+0"
						encodeOpcode('jump', -1) // infinite loop
					);
					test.equals(decodeCodeBlock(m, 256).length, 3);
					
					gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('jne', 'Fr:00', 1, 5),  
						encodeOpcode('return', 1), 
						encodeOpcode('return', 0)
					);
					test.equals(decodeCodeBlock(m, 256).length, 4);
				
					gameImage = makeTestImage(m,
						encodeOpcode('add', 1, 1, 'push'),
						encodeOpcode('jne', 'Fr:00', 1, 2),  
						encodeOpcode('return', 1)
					);
					test.equals(decodeCodeBlock(m, 256).length, 3);
				
					
					
					test.done();
				}

			}
			
	}
	
}