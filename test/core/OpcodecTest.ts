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