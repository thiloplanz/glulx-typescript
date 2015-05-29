// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/



module FyreVM {

	// Header size and field offsets
    export const enum GLULX_HDR {
		SIZE = 36,
        MAGIC_OFFSET = 0,
		VERSION_OFFSET = 4,
        RAMSTART_OFFSET = 8,
        EXTSTART_OFFSET = 12,
        ENDMEM_OFFSET = 16,
        STACKSIZE_OFFSET = 20,
        STARTFUNC_OFFSET = 24,
        DECODINGTBL_OFFSET = 28,
        CHECKSUM_OFFSET = 32
	};
		
}