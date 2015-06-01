// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path='../../node/core-on-node.ts' />
/// <reference path='../core/MemoryAccessTest.ts' />
/// <reference path='../core/UlxImageTest.ts' />
/// <reference path='../core/EngineTest.ts' />

let buffer = new FyreVM.BufferMemoryAccess(1000);

FyreVM.NodeUnit.addMemoryTests(exports, buffer);

FyreVM.NodeUnit.addImageTests(exports, buffer);

FyreVM.NodeUnit.addEngineTests(exports, buffer);