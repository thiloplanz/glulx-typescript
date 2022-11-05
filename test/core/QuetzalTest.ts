// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../core/Quetzal.ts' />

module FyreVM {

	export module NodeUnit {

		function bytes(x: string) {
			let a = new Uint8Array(x.length);
			for (let i = 0; i < x.length; i++) {
				a[i] = x.charCodeAt(i);
			}
			return a;
		}

		function chars(x: Uint8Array): string {
			let l = x.byteLength;
			let s = '';
			for (let i = 0; i < l; i++) {
				s += String.fromCharCode(x[i]);
			}
			return s;
		}


		function testRoundtrip(test) {
			let q = new Quetzal();
			q.setChunk('abcd', bytes('some text'));
			let x = q.serialize();
			q = Quetzal.load(x);
			test.equal(chars(q.getChunk('abcd')), 'some text');
			test.done();
		}

		export function addQuetzalTests(tests) {
			tests.Quetzal = {
				testRoundtrip: testRoundtrip
			}
		}
	}
}