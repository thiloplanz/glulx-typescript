// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/MemoryAccess.ts' />
/// <reference path='../../core/UlxImage.ts' />
/// <reference path='../nodeunit.d.ts' />



module FyreVM{
	
	export module NodeUnit {
		
		function testImage(test: nodeunit.Test){
			let m: MemoryAccess = this;
			
			try{
				m.writeASCII(0, 'nope');
				let image = new UlxImage(m);
			}
			catch(e){
				test.equal(e.message, '.ulx file has wrong magic number nope');
			}
			
			
			UlxImage.writeHeader({
		 			endMem: 10*1024,
					ramStart: 50,
					version: 0x00030100
				}, m);
			let image = new UlxImage(m);
			
			test.equals(image.getMajorVersion(), 3, "major version");
			test.equals(image.getMinorVersion(), 1, "minor version");
			
			test.done();
			
		};
		
		function testSaveToQuetzal(test: nodeunit.Test){
			let m: MemoryAccess = this;
				UlxImage.writeHeader({
		 			endMem: 10*1024,
					ramStart: 50,
					version: 0x00030100
				}, m);
			m.writeASCII(50, 'Hello World');
			let image = new UlxImage(m);
			
			let q = image.saveToQuetzal();
			let umem = new Uint8ArrayMemoryAccess(0);
			umem.buffer = new Uint8Array(q.getChunk('UMem'));
			
			test.equal(umem.readASCII(4, 11), 'Hello World');
			test.equal(umem.readInt32(0), 10*1024 - 50);
			test.equal(q.getChunk('IFhd').byteLength, 128,  'IFhd');
			test.done();
		}
		
		
		export function addImageTests(tests, m: MemoryAccess){
			tests.UlxImage = {
				testImage : testImage.bind(m),
				testSaveToQuetzal : testSaveToQuetzal.bind(m)
			}
		}
		
	}
	
}