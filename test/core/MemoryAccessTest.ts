// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/MemoryAccess.ts' />
/// <reference path='../nodeunit.d.ts' />



module FyreVM{
	
	export module NodeUnit {
		
		function testReadWriteInt16(test: nodeunit.Test){
			this.writeInt16(0, 0xffff);
			this.writeInt16(2, 0xaaaa)
    		test.equals(this.readInt16(0), 0xffff, "read back");
    		test.equals(this.readInt16(1), 0xffaa, "read back shifted by one");
  			test.done();
		};
		
		function testAlloc(test: nodeunit.Test){
			let allocator = new HeapAllocator(0, this);
			test.equals(allocator.blockCount(), 0, "initially no blocks");
			test.equals(allocator.alloc(100), 0, "could alloc 100 bytes");
			test.equals(allocator.blockCount(), 1, "allocated the first block");
			test.equals(allocator.alloc(950), null, "could not alloc another 950 bytes");
			test.equals(allocator.blockCount(), 1, "no new block after failed allocation");
			test.equals(allocator.alloc(100), 100, "could alloc 100 bytes");
			test.equals(allocator.blockCount(), 2, "allocated the second block");
			
			test.done();
		}
		
		function testFree(test: nodeunit.Test){
			let allocator = new HeapAllocator(0, this);
			let a = allocator.alloc(500);
			let b = allocator.alloc(500);
			test.equals(allocator.blockCount(), 2);
			
			allocator.free(a);
			test.equals(allocator.blockCount(), 1);
			
			let c = allocator.alloc(200);
			let d = allocator.alloc(300);
			test.equals(allocator.blockCount(), 3);
			
			allocator.free(b);
			test.equals(allocator.blockCount(), 2);
			
			allocator.free(c);
			test.equals(allocator.blockCount(), 1);
			
			allocator.free(d);
			test.equals(allocator.blockCount(), 0);
		
			test.done();
		}
		
		
		export function addMemoryTests(tests, m: MemoryAccess){
			tests.MemoryAccess = { 
				testReadWriteInt16 : testReadWriteInt16.bind(m),
				testAlloc : testAlloc.bind(m),
				testFree : testFree.bind(m)
			};
		}
	}
}