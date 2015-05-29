// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/MemoryAccess.ts' />
/// <reference path='../../core/UlxImage.ts' />
/// <reference path='../nodeunit.d.ts' />



module FyreVM{
	
	export module NodeUnit {
	
		let headerFields = {
			endMem: 10 * 1204,
			ramStart: 50
		}
		
		function testImage(test: nodeunit.Test){
			let m: MemoryAccess = this;
			
			test.throws(function(){
				m.writeASCII(0, 'nope')
				let image = new UlxImage(m);
			}, null, "wrong magic");
			
			UlxImage.writeImageHeader(m, headerFields);
			let image = new UlxImage(m);
			
			test.done();
			
			
			
		};
		
		
		export function addImageTests(tests, m: MemoryAccess){
			tests.testImage = testImage.bind(m);
		}
		
	}
	
}