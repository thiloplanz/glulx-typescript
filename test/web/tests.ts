// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../node/core-on-node.ts' />
/// <reference path='../../core/Engine.ts' />
/// <reference path='../core/MemoryAccessTest.ts' />
/// <reference path='../core/UlxImageTest.ts' />
/// <reference path='../core/EngineTest.ts' />
/// <reference path='../core/OpcodesTest.ts' />
/// <reference path='../core/QuetzalTest.ts' />

function addTests(tests){

	let buffer = new FyreVM.Uint8ArrayMemoryAccess(1000, 10240);

	FyreVM.NodeUnit.addMemoryTests(tests, buffer);

	FyreVM.NodeUnit.addImageTests(tests, buffer);

	FyreVM.NodeUnit.addEngineTests(tests, buffer);

	FyreVM.NodeUnit.addOpcodeTests(tests, buffer);
	
	FyreVM.NodeUnit.addQuetzalTests(tests);

}