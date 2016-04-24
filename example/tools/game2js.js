/*
 * TypeScript port by Thilo Planz
 *
 * https://gist.github.com/thiloplanz/6abf04f957197e9e3912
 */
/*
  I've wrapped Makoto Matsumoto and Takuji Nishimura's code in a namespace
  so it's better encapsulated. Now you can have multiple random number generators
  and they won't stomp all over eachother's state.
  
  If you want to use this as a substitute for Math.random(), use the random()
  method like so:
  
  var m = new MersenneTwister();
  var randomNumber = m.random();
  
  You can also call the other genrand_{foo}() methods on the instance.

  If you want to use a specific seed in order to get a repeatable random
  sequence, pass an integer into the constructor:

  var m = new MersenneTwister(123);

  and that will always produce the same random sequence.

  Sean McCullough (banksean@gmail.com)
*/
/*
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.
 
   Before using, initialize the state by using init_genrand(seed)
   or init_by_array(init_key, key_length).
 
   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.
 
   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
 
     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
 
     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.
 
     3. The names of its contributors may not be used to endorse or promote
        products derived from this software without specific prior written
        permission.
 
   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 
 
   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/
var MersenneTwister = (function () {
    function MersenneTwister(seed) {
        /* Period parameters */
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df; /* constant vector a */
        this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
        this.LOWER_MASK = 0x7fffffff; /* least significant r bits */
        this.mt = new Array(this.N); /* the array for the state vector */
        this.mti = this.N + 1; /* mti==N+1 means mt[N] is not initialized */
        if (seed == undefined) {
            seed = new Date().getTime();
        }
        this.init_genrand(seed);
    }
    /* initializes mt[N] with a seed */
    MersenneTwister.prototype.init_genrand = function (s) {
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
                + this.mti;
            /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
            /* In the previous versions, MSBs of the seed affect   */
            /* only MSBs of the array mt[].                        */
            /* 2002/01/09 modified by Makoto Matsumoto             */
            this.mt[this.mti] >>>= 0;
        }
    };
    /* initialize by an array with array-length */
    /* init_key is the array for initializing keys */
    /* key_length is its length */
    /* slight change for C++, 2004/2/26 */
    MersenneTwister.prototype.init_by_array = function (init_key, key_length) {
        var i, j, k;
        this.init_genrand(19650218);
        i = 1;
        j = 0;
        k = (this.N > key_length ? this.N : key_length);
        for (; k; k--) {
            var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
                + init_key[j] + j; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            j++;
            if (i >= this.N) {
                this.mt[0] = this.mt[this.N - 1];
                i = 1;
            }
            if (j >= key_length)
                j = 0;
        }
        for (k = this.N - 1; k; k--) {
            var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941))
                - i; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            if (i >= this.N) {
                this.mt[0] = this.mt[this.N - 1];
                i = 1;
            }
        }
        this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
    };
    /* generates a random number on [0,0xffffffff]-interval */
    MersenneTwister.prototype.genrand_int32 = function () {
        var y;
        var mag01 = new Array(0x0, this.MATRIX_A);
        /* mag01[x] = x * MATRIX_A  for x=0,1 */
        if (this.mti >= this.N) {
            var kk;
            if (this.mti == this.N + 1)
                this.init_genrand(5489); /* a default initial seed is used */
            for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (; kk < this.N - 1; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];
            this.mti = 0;
        }
        y = this.mt[this.mti++];
        /* Tempering */
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);
        return y >>> 0;
    };
    /* generates a random number on [0,0x7fffffff]-interval */
    MersenneTwister.prototype.genrand_int31 = function () {
        return (this.genrand_int32() >>> 1);
    };
    /* generates a random number on [0,1]-real-interval */
    MersenneTwister.prototype.genrand_real1 = function () {
        return this.genrand_int32() * (1.0 / 4294967295.0);
        /* divided by 2^32-1 */
    };
    /* generates a random number on [0,1)-real-interval */
    MersenneTwister.prototype.random = function () {
        return this.genrand_int32() * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };
    /* generates a random number on (0,1)-real-interval */
    MersenneTwister.prototype.genrand_real3 = function () {
        return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };
    /* generates a random number on [0,1) with 53-bit resolution*/
    MersenneTwister.prototype.genrand_res53 = function () {
        var a = this.genrand_int32() >>> 5, b = this.genrand_int32() >>> 6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    };
    return MersenneTwister;
}());
// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/**
 * A wrapper to emulate minimal Glk functionality.
 */
/// <reference path='Engine.ts' />
var FyreVM;
(function (FyreVM) {
    var GlkWindowStream = (function () {
        function GlkWindowStream(id, engine) {
            this.id = id;
            this.engine = engine;
        }
        GlkWindowStream.prototype.getId = function () {
            return this.id;
        };
        GlkWindowStream.prototype.put = function (s) {
            this.engine['outputBuffer'].write(s);
        };
        GlkWindowStream.prototype.close = function () {
            return { ok: false, written: 0, read: 0 };
        };
        return GlkWindowStream;
    }());
    function GlkWrapperCall(code, argc) {
        if (!this.glkHandlers) {
            this.glkHandlers = initGlkHandlers();
            this.glkStreams = [];
        }
        if (argc > 8) {
            throw new Error("Too many stack arguments for glk call " + code + ": " + argc);
        }
        var glkArgs = [];
        while (argc--) {
            glkArgs.push(this.pop());
        }
        var handler = this.glkHandlers[code];
        if (handler) {
            return handler.apply(this, glkArgs);
        }
        else {
            console.error("unimplemented glk call " + code);
            return 0;
        }
    }
    FyreVM.GlkWrapperCall = GlkWrapperCall;
    function GlkWrapperWrite(s) {
        if (this.glkCurrentStream) {
            this.glkCurrentStream.put(s);
        }
    }
    FyreVM.GlkWrapperWrite = GlkWrapperWrite;
    function stub() { return 0; }
    ;
    function initGlkHandlers() {
        var handlers = [];
        // glk_stream_iterate
        handlers[0x40] = stub;
        // glk_window_iterate
        handlers[0x20] = function (win_id) {
            if (this.glkWindowOpen && win_id === 0)
                return 1;
            return 0;
        };
        // glk_fileref_iterate 
        handlers[0x64] = stub;
        // glk_window_open
        handlers[0x23] = function () {
            if (this.glkWindowOpen)
                return 0;
            this.glkWindowOpen = true;
            this.glkStreams[1] = new GlkWindowStream(1, this);
            return 1;
        };
        // glk_set_window
        handlers[0x2F] = function () {
            if (this.glkWindowOpen) {
                this.glkCurrentStream = this.glkStreams[1];
            }
            return 0;
        };
        // glk_set_style
        handlers[0x86] = stub;
        //glk_stylehint_set 
        handlers[0xB0] = stub;
        // glk_style_distinguish
        handlers[0xB2] = stub;
        // glk_style_measure
        handlers[0xB3] = stub;
        // glk_char_to_lower
        handlers[0xA0] = function (ch) {
            return String.fromCharCode(ch).toLowerCase().charCodeAt(0);
        };
        // glk_char_to_upper
        handlers[0xA1] = function (ch) {
            return String.fromCharCode(ch).toUpperCase().charCodeAt(0);
        };
        // glk_request_line_event
        handlers[0xD0] = function (winId, buffer, bufferSize) {
            this.glkWantLineInput = true;
            this.glkLineInputBufSize = bufferSize;
            this.glkLineInputBuffer = buffer;
        };
        // glk_request_char_event
        handlers[0xD2] = function () {
            this.glkWantCharInput = true;
        };
        // glk_put_char
        handlers[0x80] = function (c) {
            GlkWrapperWrite.call(this, String.fromCharCode(c));
        };
        // glk_select 
        handlers[0xC0] = function (reference) {
            this.deliverOutput();
            if (this.glkWantLineInput) {
                this.glkWantLineInput = false;
                if (!this.lineWanted) {
                    GlkWriteReference.call(this, reference, 3 /* evtype_LineInput */, 1, 1, 0);
                    return 0;
                }
                var callback = function (line) {
                    if (line === void 0) { line = ''; }
                    var max = this.image.writeASCII(this.glkLineInputBuffer, line, this.glkLineInputBufSize);
                    GlkWriteReference.call(this, reference, 3 /* evtype_LineInput */, 1, max, 0);
                    this.resumeAfterWait([0]);
                };
                this.lineWanted(callback.bind(this));
                return 'wait';
            }
            else if (this.glkWantCharInput) {
                this.glkWantCharInput = false;
                if (!this.keyWanted) {
                    GlkWriteReference.call(this, reference, 2 /* evtype_CharInput */, 1, 0, 0);
                    return 0;
                }
                var callback = function (line) {
                    GlkWriteReference.call(this, reference, 2 /* evtype_CharInput */, 1, line.charCodeAt(0), 0);
                    this.resumeAfterWait([0]);
                };
                this.lineWanted(callback.bind(this));
                return 'wait';
            }
            else {
                // no event
                GlkWriteReference.call(this, reference, 0 /* evtype_None */, 0, 0, 0);
            }
            return 0;
        };
        return handlers;
    }
    function GlkWriteReference(reference) {
        var values = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            values[_i - 1] = arguments[_i];
        }
        if (reference == 0xffffffff) {
            for (var i = 0; i < values.length; i++)
                this.push(values[i]);
        }
        else {
            for (var i = 0; i < values.length; i++) {
                this.image.writeInt32(reference, values[i]);
                reference += 4;
            }
        }
    }
})(FyreVM || (FyreVM = {}));
// Written from 2015 to 2016 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/**
 * Provides hardcoded versions of some commonly used veneer routines (low-level
 *  functions that are automatically compiled into every Inform game).
 * Inform games rely heavily on these routines, and substituting our "native" versions
 * for the Glulx versions in the story file can increase performance significantly.
 */
/// <reference path='Engine.ts' />
var FyreVM;
(function (FyreVM) {
    // RAM addresses of compiler-generated global variables
    var SELF_OFFSET = 16;
    var SENDER_OFFSET = 20;
    // offsets of compiler-generated property numbers from INDIV_PROP_START
    var CALL_PROP = 5;
    var PRINT_PROP = 6;
    var PRINT_TO_ARRAY_PROP = 7;
    /**
     * Registers a routine address or constant value, using the acceleration
     * codes defined in the Glulx specification.
     */
    function setSlotGlulx(isParam, slot, value) {
        if (isParam && slot === 6) {
            var image = this.image;
            if (value != image.getRamAddress(SELF_OFFSET)) {
                throw new Error("Unexpected value for acceleration parameter 6");
            }
            return true;
        }
        if (isParam) {
            switch (slot) {
                case 0: return setSlotFyre.call(this, 1007 /* classes_table */, value);
                case 1: return setSlotFyre.call(this, 1008 /* INDIV_PROP_START */, value);
                case 2: return setSlotFyre.call(this, 1003 /* Class */, value);
                case 3: return setSlotFyre.call(this, 1004 /* Object */, value);
                case 4: return setSlotFyre.call(this, 1002 /* Routine */, value);
                case 5: return setSlotFyre.call(this, 1001 /* String */, value);
                case 7: return setSlotFyre.call(this, 1006 /* NUM_ATTR_BYTES */, value);
                case 8: return setSlotFyre.call(this, 1009 /* cpv__start */, value);
                default: return false;
            }
        }
        switch (slot) {
            case 1: return setSlotFyre.call(this, 1 /* Z__Region */, value);
            case 2: return setSlotFyre.call(this, 2 /* CP__Tab */, value);
            case 3: return setSlotFyre.call(this, 4 /* RA__Pr */, value);
            case 4: return setSlotFyre.call(this, 7 /* RL__Pr */, value);
            case 5: return setSlotFyre.call(this, 3 /* OC__Cl */, value);
            case 6: return setSlotFyre.call(this, 8 /* RV__Pr */, value);
            case 7: return setSlotFyre.call(this, 9 /* OP__Pr */, value);
            default: return false;
        }
    }
    FyreVM.setSlotGlulx = setSlotGlulx;
    /**
     *  Registers a routine address or constant value, using the traditional
     *  FyreVM slot codes.
     */
    function setSlotFyre(slot, value) {
        var v = this.veneer;
        switch (slot) {
            case 1 /* Z__Region */:
                this.veneer[value] = Z__Region;
                return true;
            case 2 /* CP__Tab */:
                this.veneer[value] = CP__Tab;
                return true;
            case 3 /* OC__Cl */:
                this.veneer[value] = OC__Cl;
                return true;
            case 4 /* RA__Pr */:
                this.veneer[value] = RA__Pr;
                return true;
            case 5 /* RT__ChLDW */:
                this.veneer[value] = RT__ChLDW;
                return true;
            case 6 /* Unsigned__Compare */:
                this.veneer[value] = Unsigned__Compare;
                return true;
            case 7 /* RL__Pr */:
                this.veneer[value] = RL__Pr;
                return true;
            case 8 /* RV__Pr */:
                this.veneer[value] = RV__Pr;
                return true;
            case 9 /* OP__Pr */:
                this.veneer[value] = OP__Pr;
                return true;
            case 10 /* RT__ChSTW */:
                this.veneer[value] = RT__ChSTW;
                return true;
            case 11 /* RT__ChLDB */:
                this.veneer[value] = RT__ChLDB;
                return true;
            case 12 /* Meta__class */:
                this.veneer[value] = Meta__class;
                return true;
            case 1001 /* String */:
                v.string_mc = value;
                return true;
            case 1002 /* Routine */:
                v.routine_mc = value;
                return true;
            case 1003 /* Class */:
                v.class_mc = value;
                return true;
            case 1004 /* Object */:
                v.object_mc = value;
                return true;
            case 1006 /* NUM_ATTR_BYTES */:
                v.num_attr_bytes = value;
                return true;
            case 1007 /* classes_table */:
                v.classes_table = value;
                return true;
            case 1008 /* INDIV_PROP_START */:
                v.indiv_prop_start = value;
                return true;
            case 1009 /* cpv__start */:
                v.cpv_start = value;
                return true;
            // run-time error handlers are just ignored (we log an error message instead, like Quixe does, no NestedCall a la FyreVM)
            case 1005 /* RT__Err */:
            case 1010 /* ofclass_err */:
            case 1011 /* readprop_err */:
                return true;
            default:
                console.warn("ignoring veneer " + slot + " " + value);
                return false;
        }
    }
    FyreVM.setSlotFyre = setSlotFyre;
    function Unsigned__Compare(a, b) {
        a = a >>> 0;
        b = b >>> 0;
        if (a > b)
            return 1;
        if (a < b)
            return -1;
        return 0;
    }
    // distinguishes between strings, routines, and objects
    function Z__Region(address) {
        var image = this.image;
        if (address < 36 || address >= image.getEndMem())
            return 0;
        var type = image.readByte(address);
        if (type >= 0xE0)
            return 3;
        if (type >= 0xC0)
            return 2;
        if (type >= 0x70 && type <= 0x7F && address >= image.getRamAddress(0))
            return 1;
        return 0;
    }
    // finds an object's common property table
    function CP__Tab(obj, id) {
        if (Z__Region.call(this, obj) != 1) {
            // error "handling" inspired by Quixe
            // instead of doing a NestedCall to the supplied error handler
            // just log an error message
            console.error("[** Programming error: tried to find the \".\" of (something) **]");
            return 0;
        }
        var image = this.image;
        var otab = image.readInt32(obj + 16);
        if (otab == 0)
            return 0;
        var max = image.readInt32(otab);
        otab += 4;
        // PerformBinarySearch
        return this.opcodes[0x151].handler.call(this, id, 2, otab, 10, max, 0, 0);
    }
    // finds the location of an object ("parent()" function)
    function Parent(obj) {
        return this.image.readInt32(obj + 1 + this.veneer.num_attr_bytes + 12);
    }
    // determines whether an object is a member of a given class ("ofclass" operator)
    function OC__Cl(obj, cla) {
        var v = this.veneer;
        switch (Z__Region.call(this, obj)) {
            case 3:
                return (cla === v.string_mc ? 1 : 0);
            case 2:
                return (cla === v.routine_mc ? 1 : 0);
            case 1:
                if (cla === v.class_mc) {
                    if (Parent.call(this, obj) === v.class_mc)
                        return 1;
                    if (obj === v.class_mc || obj === v.string_mc ||
                        obj === v.routine_mc || obj === v.object_mc)
                        return 1;
                    return 0;
                }
                if (cla == this.veneer.object_mc) {
                    if (Parent.call(this, obj) == v.class_mc)
                        return 0;
                    if (obj == v.class_mc || obj == v.string_mc ||
                        obj == v.routine_mc || obj == v.object_mc)
                        return 0;
                    return 1;
                }
                if (cla == v.string_mc || cla == v.routine_mc)
                    return 0;
                if (Parent.call(this, cla) != v.class_mc) {
                    console.error("[** Programming error: tried to apply 'ofclass' with non-class **]");
                    return 0;
                }
                var image = this.image;
                var inlist = RA__Pr.call(this, obj, 2);
                if (inlist == 0)
                    return 0;
                var inlistlen = RL__Pr.call(this, obj, 2) / 4;
                for (var jx = 0; jx < inlistlen; jx++)
                    if (image.readInt32(inlist + jx * 4) === cla)
                        return 1;
                return 0;
            default:
                return 0;
        }
    }
    // finds the address of an object's property (".&" operator)
    function RA__Pr(obj, id) {
        var cla = 0;
        var image = this.image;
        if ((id & 0xFFFF0000) != 0) {
            cla = image.readInt32(this.veneer.classes_table + 4 * (id & 0xFFFF));
            if (OC__Cl.call(this, obj, cla) == 0)
                return 0;
            id >>= 16;
            obj = cla;
        }
        var prop = CP__Tab.call(this, obj, id);
        if (prop == 0)
            return 0;
        if (Parent.call(this, obj) === this.veneer.class_mc && cla == 0)
            if (id < this.veneer.indiv_prop_start || id >= this.veneer.indiv_prop_start + 8)
                return 0;
        if (image.readInt32(image.getRamAddress(SELF_OFFSET)) != obj) {
            var ix = (image.readByte(prop + 9) & 1);
            if (ix != 0)
                return 0;
        }
        return image.readInt32(prop + 4);
    }
    // finds the length of an object's property (".#" operator)
    function RL__Pr(obj, id) {
        var cla = 0;
        var image = this.image;
        if ((id & 0xFFFF0000) != 0) {
            cla = image.readInt32(this.veneer.classes_table + 4 * (id & 0xFFFF));
            if (OC__Cl.call(this, obj, cla) == 0)
                return 0;
            id >>= 16;
            obj = cla;
        }
        var prop = CP__Tab.call(this, obj, id);
        if (prop == 0)
            return 0;
        if (Parent.call(this, obj) == this.veneer.class_mc && cla == 0)
            if (id < this.veneer.indiv_prop_start || id >= this.veneer.indiv_prop_start + 8)
                return 0;
        if (image.readInt32(image.getRamAddress(SELF_OFFSET)) != obj) {
            var ix = (image.readByte(prop + 9) & 1);
            if (ix != 0)
                return 0;
        }
        return 4 * image.readInt16(prop + 2);
    }
    // performs bounds checking when reading from a word array ("-->" operator)
    function RT__ChLDW(array, offset) {
        var address = array + 4 * offset;
        var image = this.image;
        if (address >= image.getEndMem()) {
            console.error("[** Programming error: tried to read from word array beyond EndMem **]");
            return 0;
        }
        return image.readInt32(address);
    }
    // reads the value of an object's property ("." operator)
    function RV__Pr(obj, id) {
        var addr = RA__Pr.call(this, obj, id);
        var image = this.image;
        if (addr == 0) {
            var v = this.veneer;
            if (id > 0 && id < v.indiv_prop_start)
                return image.readInt32(v.cpv_start + 4 * id);
            console.error("[** Programming error: tried to read (something) **]");
            return 0;
        }
        return image.readInt32(addr);
    }
    // determines whether an object provides a given property ("provides" operator)
    function OP__Pr(obj, id) {
        var v = this.veneer;
        switch (Z__Region.call(this, obj)) {
            case 3:
                if (id == v.indiv_prop_start + PRINT_PROP ||
                    id == v.indiv_prop_start + PRINT_TO_ARRAY_PROP)
                    return 1;
                else
                    return 0;
            case 2:
                if (id == v.indiv_prop_start + CALL_PROP)
                    return 1;
                else
                    return 0;
            case 1:
                if (id >= v.indiv_prop_start && id < v.indiv_prop_start + 8)
                    if (Parent.call(this, obj) == v.class_mc)
                        return 1;
                if (RA__Pr.call(this, obj, id) != 0)
                    return 1;
                else
                    return 0;
            default:
                return 0;
        }
    }
    // performs bounds checking when writing to a word array ("-->" operator)
    function RT__ChSTW(array, offset, val) {
        var image = this.image;
        var address = array + 4 * offset;
        if (address >= image.getEndMem() || address < image.getRamAddress(0)) {
            console.error("[** Programming error: tried to write to word array outside of RAM **]");
            return 0;
        }
        else {
            image.writeInt32(address, val);
            return 0;
        }
    }
    // performs bounds checking when reading from a byte array ("->" operator)
    function RT__ChLDB(array, offset) {
        var address = array + offset;
        var image = this.image;
        if (address >= image.getEndMem()) {
            console.error("[** Programming error: tried to read from byte array beyond EndMem **]");
            return 0;
        }
        return image.readByte(address);
    }
    // determines the metaclass of a routine, string, or object ("metaclass()" function)
    function Meta__class(obj) {
        switch (Z__Region.call(this, obj)) {
            case 2:
                return this.veneer.routine_mc;
            case 3:
                return this.veneer.string_mc;
            case 1:
                if (Parent.call(this, obj) === this.veneer.class_mc)
                    return this.veneer.class_mc;
                if (obj == this.veneer.class_mc || obj == this.veneer.string_mc ||
                    obj == this.veneer.routine_mc || obj == this.veneer.object_mc)
                    return this.veneer.class_mc;
                return this.veneer.object_mc;
            default:
                return 0;
        }
    }
})(FyreVM || (FyreVM = {}));
// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='../mersenne-twister.ts' />
/// <reference path='GlkWrapper.ts' />
/// <reference path='Veneer.ts' />
var FyreVM;
(function (FyreVM) {
    var Opcode = (function () {
        function Opcode(code, name, loadArgs, storeArgs, handler, rule) {
            this.code = code;
            this.name = name;
            this.loadArgs = loadArgs;
            this.storeArgs = storeArgs;
            this.handler = handler;
            this.rule = rule;
        }
        return Opcode;
    }());
    FyreVM.Opcode = Opcode;
    // coerce Javascript number into uint32 range
    function uint32(x) {
        return x >>> 0;
    }
    // coerce uint32 number into  (signed!) int32 range
    function int32(x) {
        return x | 0;
    }
    var Opcodes;
    (function (Opcodes) {
        function initOpcodes() {
            var opcodes = [];
            function opcode(code, name, loadArgs, storeArgs, handler, rule) {
                opcodes[code] = new Opcode(code, name, loadArgs, storeArgs, handler, rule);
            }
            opcode(0x00, 'nop', 0, 0, function () { });
            opcode(0x10, 'add', 2, 1, function add(a, b) { return uint32(a + b); });
            opcode(0x11, 'sub', 2, 1, function sub(a, b) { return uint32(a - b); });
            opcode(0x12, 'mul', 2, 1, function mul(a, b) { return uint32(Math.imul(int32(a), int32(b))); });
            opcode(0x13, 'div', 2, 1, function div(a, b) { return uint32(int32(a) / int32(b)); });
            opcode(0x14, 'mod', 2, 1, function mod(a, b) { return uint32(int32(a) % int32(b)); });
            // TODO: check the specs
            opcode(0x15, 'neg', 1, 1, function neg(x) {
                return uint32(0xFFFFFFFF - x + 1);
            });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x18, 'bitand', 2, 1, function bitand(a, b) { return uint32(uint32(a) & uint32(b)); });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x19, 'bitor', 2, 1, function bitor(a, b) { return uint32(uint32(a) | uint32(b)); });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x1A, 'bitxor', 2, 1, function bitxor(a, b) { return uint32(uint32(a) ^ uint32(b)); });
            // TODO: check if it works, JS has signed ints, we want uint	
            opcode(0x1B, 'bitnot', 1, 1, function bitnot(x) { x = ~uint32(x); if (x < 0)
                return 1 + x + 0xFFFFFFFF; return x; });
            opcode(0x1C, 'shiftl', 2, 1, function shiftl(a, b) {
                if (uint32(b) >= 32)
                    return 0;
                return uint32(a << b);
            });
            opcode(0x1D, 'sshiftr', 2, 1, function sshiftr(a, b) {
                if (uint32(b) >= 32)
                    return (a & 0x80000000) ? 0xFFFFFFFF : 0;
                return uint32(int32(a) >> b);
            });
            opcode(0x1E, 'ushiftr', 2, 1, function ushiftr(a, b) {
                if (uint32(b) >= 32)
                    return 0;
                return uint32(uint32(a) >>> b);
            });
            opcode(0x20, 'jump', 1, 0, function jump(jumpVector) {
                this.takeBranch(jumpVector);
            });
            opcode(0x022, 'jz', 2, 0, function jz(condition, jumpVector) {
                if (condition === 0)
                    this.takeBranch(jumpVector);
            });
            opcode(0x023, 'jnz', 2, 0, function jnz(condition, jumpVector) {
                if (condition !== 0)
                    this.takeBranch(jumpVector);
            });
            opcode(0x024, 'jeq', 3, 0, function jeq(a, b, jumpVector) {
                if (a === b || uint32(a) === uint32(b))
                    this.takeBranch(jumpVector);
            });
            opcode(0x025, 'jne', 3, 0, function jne(a, b, jumpVector) {
                if (uint32(a) !== uint32(b))
                    this.takeBranch(jumpVector);
            });
            opcode(0x026, 'jlt', 3, 0, function jlt(a, b, jumpVector) {
                if (int32(a) < int32(b))
                    this.takeBranch(jumpVector);
            });
            opcode(0x027, 'jge', 3, 0, function jge(a, b, jumpVector) {
                if (int32(a) >= int32(b))
                    this.takeBranch(jumpVector);
            });
            opcode(0x028, 'jgt', 3, 0, function jgt(a, b, jumpVector) {
                if (int32(a) > int32(b))
                    this.takeBranch(jumpVector);
            });
            opcode(0x029, 'jle', 3, 0, function jle(a, b, jumpVector) {
                if (int32(a) <= int32(b))
                    this.takeBranch(jumpVector);
            });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x02A, 'jltu', 3, 0, function jltu(a, b, jumpVector) {
                if (a < b)
                    this.takeBranch(jumpVector);
            });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x02B, 'jgeu', 3, 0, function jgeu(a, b, jumpVector) {
                if (a >= b)
                    this.takeBranch(jumpVector);
            });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x02C, 'jgtu', 3, 0, function jgtu(a, b, jumpVector) {
                if (a > b)
                    this.takeBranch(jumpVector);
            });
            // TODO: check if it works, JS has signed ints, we want uint
            opcode(0x02D, 'jleu', 3, 0, function jleu(a, b, jumpVector) {
                if (a <= b)
                    this.takeBranch(jumpVector);
            });
            opcode(0x0104, 'jumpabs', 1, 0, function jumpabs(address) {
                this.PC = address;
            });
            opcode(0x30, 'call', 2, 0, function call(address, argc, destType, destAddr) {
                var args = [];
                while (argc--) {
                    args.push(this.pop());
                }
                this.performCall(address, args, destType, destAddr, this.PC);
            }, 3 /* DelayedStore */);
            opcode(0x160, 'callf', 1, 0, function callf(address, destType, destAddr) {
                this.performCall(address, null, destType, destAddr, this.PC);
            }, 3 /* DelayedStore */);
            opcode(0x161, 'callfi', 2, 0, function callfi(address, arg, destType, destAddr) {
                this.performCall(address, [uint32(arg)], destType, destAddr, this.PC);
            }, 3 /* DelayedStore */);
            opcode(0x162, 'callfii', 3, 0, function callfii(address, arg1, arg2, destType, destAddr) {
                this.performCall(address, [uint32(arg1), uint32(arg2)], destType, destAddr, this.PC);
            }, 3 /* DelayedStore */);
            opcode(0x163, 'callfiii', 4, 0, function callfiii(address, arg1, arg2, arg3, destType, destAddr) {
                this.performCall(address, [uint32(arg1), uint32(arg2), uint32(arg3)], destType, destAddr, this.PC);
            }, 3 /* DelayedStore */);
            opcode(0x31, 'return', 1, 0, function _return(retVal) {
                this.leaveFunction(uint32(retVal));
            });
            opcode(0x32, "catch", 0, 0, function _catch(destType, destAddr, address) {
                this.pushCallStub(destType, destAddr, this.PC, this.FP);
                // the catch token is the value of sp after pushing that stub
                this.performDelayedStore(destType, destAddr, this.SP);
                this.takeBranch(address);
            }, 4 /* Catch */);
            opcode(0x33, "throw", 2, 0, function _throw(ex, catchToken) {
                if (catchToken > this.SP)
                    throw new Error("invalid catch token ${catchToken}");
                // pop the stack back down to the stub pushed by catch
                this.SP = catchToken;
                // restore from the stub
                var stub = this.popCallStub();
                this.PC = stub.PC;
                this.FP = stub.framePtr;
                this.frameLen = this.stack.readInt32(this.FP);
                this.localsPos = this.stack.readInt32(this.FP + 4);
                // store the thrown value and resume after the catch opcode
                this.performDelayedStore(stub.destType, stub.destAddr, ex);
            });
            opcode(0x34, "tailcall", 2, 0, function tailcall(address, argc) {
                var argv = [];
                while (argc--) {
                    argv.push(this.pop());
                }
                this.performCall(address, argv, 0, 0, 0, true);
            });
            opcode(0x180, 'accelfunc', 2, 0, function (slot, value) {
                FyreVM.setSlotGlulx.call(this, false, slot, value);
            });
            opcode(0x181, 'accelparam', 2, 0, function (slot, value) {
                FyreVM.setSlotGlulx.call(this, true, slot, value);
            });
            opcode(0x40, "copy", 1, 1, function copy(x) {
                return uint32(x);
            });
            opcode(0x41, "copys", 1, 1, function copys(x) {
                return x & 0xFFFF;
            }, 2 /* Indirect16Bit */);
            opcode(0x42, "copyb", 1, 1, function copyb(x) {
                return x & 0xFF;
            }, 1 /* Indirect8Bit */);
            opcode(0x44, "sexs", 1, 1, function sexs(x) {
                return x & 0x8000 ? uint32(x | 0xFFFF0000) : x & 0x0000FFFF;
            });
            opcode(0x45, "sexb", 1, 1, function sexb(x) {
                return x & 0x80 ? uint32(x | 0xFFFFFF00) : x & 0x000000FF;
            });
            opcode(0x48, "aload", 2, 1, function aload(array, index) {
                return this.image.readInt32(uint32(array + 4 * index));
            });
            opcode(0x49, "aloads", 2, 1, function aloads(array, index) {
                return this.image.readInt16(uint32(array + 2 * index));
            });
            opcode(0x4A, "aloadb", 2, 1, function aloadb(array, index) {
                return this.image.readByte(uint32(array + index));
            });
            opcode(0x4B, "aloadbit", 2, 1, function aloadbit(array, index) {
                index = int32(index);
                var bitx = index & 7;
                var address = array;
                if (index >= 0) {
                    address += (index >> 3);
                }
                else {
                    address -= (1 + ((-1 - index) >> 3));
                }
                var byte = this.image.readByte(uint32(address));
                return byte & (1 << bitx) ? 1 : 0;
            });
            opcode(0x4C, "astore", 3, 0, function astore(array, index, value) {
                this.image.writeInt32(array + 4 * int32(index), uint32(value));
            });
            opcode(0x4D, "astores", 3, 0, function astores(array, index, value) {
                value = value & 0xFFFF;
                this.image.writeBytes(array + 2 * index, value >> 8, value & 0xFF);
            });
            opcode(0x4E, "astoreb", 3, 0, function astoreb(array, index, value) {
                this.image.writeBytes(array + index, value & 0xFF);
            });
            opcode(0x4F, "astorebit", 3, 0, function astorebit(array, index, value) {
                index = int32(index);
                var bitx = index & 7;
                var address = array;
                if (index >= 0) {
                    address += (index >> 3);
                }
                else {
                    address -= (1 + ((-1 - index) >> 3));
                }
                var byte = this.image.readByte(address);
                if (value === 0) {
                    byte &= ~(1 << bitx);
                }
                else {
                    byte |= (1 << bitx);
                }
                this.image.writeBytes(address, byte);
            });
            opcode(0x70, 'streamchar', 1, 0, FyreVM.Engine.prototype.streamCharCore);
            opcode(0x73, 'streamunichar', 1, 0, FyreVM.Engine.prototype.streamUniCharCore);
            opcode(0x71, 'streamnum', 1, 0, FyreVM.Engine.prototype.streamNumCore);
            opcode(0x72, 'streamstr', 1, 0, FyreVM.Engine.prototype.streamStrCore);
            opcode(0x130, 'glk', 2, 1, function glk(code, argc) {
                switch (this.glkMode) {
                    case 0 /* None */:
                        // not really supported, just clear the stack
                        while (argc--) {
                            this.pop();
                        }
                        return 0;
                    case 1 /* Wrapper */:
                        return FyreVM.GlkWrapperCall.call(this, code, argc);
                    default:
                        throw new Error("unsupported glkMode " + this.glkMode);
                }
            });
            opcode(0x140, 'getstringtbl', 0, 1, function getstringtbl() {
                return this.decodingTable;
            });
            opcode(0x141, 'setstringtbl', 1, 0, function setstringtbl(addr) {
                this.decodingTable = addr;
            });
            opcode(0x148, 'getiosys', 0, 2, function getiosys() {
                switch (this.outputSystem) {
                    case 0 /* Null */: return [0, 0];
                    case 1 /* Filter */: return [1, this.filterAddress];
                    case 2 /* Channels */: return [20, 0];
                    case 3 /* Glk */: return [2, 0];
                }
            });
            opcode(0x149, 'setiosys', 2, 0, function setiosys(system, rock) {
                switch (system) {
                    case 0:
                        this.outputSystem = 0 /* Null */;
                        return;
                    case 1:
                        this.outputSystem = 1 /* Filter */;
                        this.filterAddress = rock;
                        return;
                    case 2:
                        if (this.glkMode !== 1 /* Wrapper */)
                            throw new Error("Glk wrapper support has not been enabled");
                        this.outputSystem = 3 /* Glk */;
                        return;
                    case 20:
                        if (!this.enableFyreVM)
                            throw new Error("FyreVM support has been disabled");
                        this.outputSystem = 2 /* Channels */;
                        return;
                    default:
                        throw new Error("Unrecognized output system " + system);
                }
            });
            opcode(0x102, 'getmemsize', 0, 1, function getmemsize() {
                return this.image.getEndMem();
            });
            opcode(0x103, 'setmemsize', 1, 1, function setmemsize(size) {
                if (this.heap)
                    throw new Error("setmemsize is not allowed while the heap is active");
                try {
                    this.image.setEndMem(size);
                    return 0;
                }
                catch (e) {
                    console.error(e);
                    return 1;
                }
            });
            opcode(0x170, 'mzero', 2, 0, function mzero(count, address) {
                var zeros = [];
                count = uint32(count);
                while (count--) {
                    zeros.push(0);
                }
                (_a = this.image).writeBytes.apply(_a, [address].concat(zeros));
                var _a;
            });
            opcode(0x171, 'mcopy', 3, 0, function mcopy(count, from, to) {
                var data = [];
                count = uint32(count);
                for (var i = from; i < from + count; i++) {
                    data.push(this.image.readByte(i));
                }
                (_a = this.image).writeBytes.apply(_a, [to].concat(data));
                var _a;
            });
            opcode(0x178, 'malloc', 1, 1, function malloc(size) {
                if (size <= 0)
                    return 0;
                if (this.heap) {
                    return this.heap.alloc(size);
                }
                var oldEndMem = this.image.getEndMem();
                this.heap = new FyreVM.HeapAllocator(oldEndMem, this.image.memory);
                this.heap.maxHeapExtent = this.maxHeapSize;
                var a = this.heap.alloc(size);
                if (a === 0) {
                    this.heap = null;
                    this.image.setEndMem(oldEndMem);
                }
                return a;
            });
            opcode(0x179, 'mfree', 1, 0, function mfree(address) {
                if (this.heap) {
                    this.heap.free(address);
                    if (this.heap.blockCount() === 0) {
                        this.image.endMem = this.heap.heapAddress;
                        this.heap = null;
                    }
                }
            });
            opcode(0x150, 'linearsearch', 7, 1, PerformLinearSearch);
            opcode(0x151, 'binarysearch', 7, 1, PerformBinarySearch);
            opcode(0x152, 'linkedsearch', 6, 1, PerformLinkedSearch);
            opcode(0x50, 'stkcount', 0, 1, function stkcount() {
                return (this.SP - (this.FP + this.frameLen)) / 4;
            });
            opcode(0x51, 'stkpeek', 1, 1, function stkpeek(pos) {
                var address = this.SP - 4 * (1 + pos);
                if (address < this.FP + this.frameLen)
                    throw new Error("Stack underflow");
                return this.stack.readInt32(address);
            });
            opcode(0x52, 'stkswap', 0, 0, function stkswap(pos) {
                if (this.SP - (this.FP + this.frameLen) < 8)
                    throw new Error("Stack underflow");
                var a = this.pop();
                var b = this.pop();
                this.push(a);
                this.push(b);
            });
            opcode(0x53, 'stkroll', 2, 0, function stkroll(items, distance) {
                // TODO: treat distance as signed value
                if (items === 0)
                    return;
                distance %= items;
                if (distance === 0)
                    return;
                // rolling X items down Y slots == rolling X items up X-Y slots
                if (distance < 0)
                    distance += items;
                if (this.SP - (this.FP + this.frameLen) < 4 * items)
                    throw new Error("Stack underflow");
                var temp1 = [];
                var temp2 = [];
                for (var i = 0; i < distance; i++) {
                    temp1.push(this.pop());
                }
                for (var i = distance; i < items; i++) {
                    temp2.push(this.pop());
                }
                while (temp1.length) {
                    this.push(temp1.pop());
                }
                while (temp2.length) {
                    this.push(temp2.pop());
                }
            });
            opcode(0x54, 'stkcopy', 1, 0, function stkcopy(count) {
                var bytes = count * 4;
                if (bytes > this.SP - (this.FP + this.frameLen))
                    throw new Error("Stack underflow");
                var start = this.SP - bytes;
                while (count--) {
                    this.push(this.stack.readInt32(start));
                    start += 4;
                }
            });
            opcode(0x100, "gestalt", 2, 1, function gestalt(selector, arg) {
                switch (selector) {
                    case 0 /* GlulxVersion */: return 196866 /* glulx */;
                    case 1 /* TerpVersion */: return 1 /* terp */;
                    case 2 /* ResizeMem */:
                    case 5 /* Unicode */:
                    case 6 /* MemCopy */:
                    case 7 /* MAlloc */:
                    case 3 /* Undo */:
                    case 12 /* ExtUndo */:
                    case 9 /* Acceleration */:
                        return 1;
                    case 11 /* Float */:
                        return 0;
                    case 4 /* IOSystem */:
                        if (arg === 0)
                            return 1; // Null-IO
                        if (arg === 1)
                            return 1; // Filter
                        if (arg === 20 && this.enableFyreVM)
                            return 1; // Channel IO
                        if (arg == 2 && this.glkMode === 1 /* Wrapper */)
                            return 1; // Glk
                        return 0;
                    case 8 /* MAllocHeap */:
                        if (this.heap)
                            return this.heap.heapAddress;
                        return 0;
                    case 10 /* AccelFunc */:
                        return 0;
                    default:
                        return 0;
                }
            });
            opcode(0x120, 'quit', 0, 0, function quit() { this.running = false; });
            opcode(0x122, 'restart', 0, 0, FyreVM.Engine.prototype.restart);
            opcode(0x123, 'save', 1, 0, function save(X, destType, destAddr) {
                // TODO: find out what that one argument X does ...
                var engine = this;
                if (engine.saveRequested) {
                    var q = engine.saveToQuetzal(destType, destAddr);
                    var resume_1 = this.resumeAfterWait.bind(this);
                    var callback = function (success) {
                        if (success) {
                            engine['performDelayedStore'](destType, destAddr, 0);
                        }
                        else {
                            engine['performDelayedStore'](destType, destAddr, 1);
                        }
                        resume_1();
                    };
                    engine.saveRequested(q, callback);
                    var wait = 'wait';
                    return wait;
                }
                engine['performDelayedStore'](destType, destAddr, 1);
            }, 3 /* DelayedStore */);
            opcode(0x124, "restore", 1, 0, function restore(X, destType, destAddr) {
                // TODO: find out what that one argument X does ...
                var engine = this;
                if (engine.loadRequested) {
                    var resume_2 = this.resumeAfterWait.bind(this);
                    var callback = function (quetzal) {
                        if (quetzal) {
                            engine.loadFromQuetzal(quetzal);
                            resume_2();
                            return;
                        }
                        engine['performDelayedStore'](destType, destAddr, 1);
                        resume_2();
                    };
                    engine.loadRequested(callback);
                    var wait = 'wait';
                    return wait;
                }
                engine['performDelayedStore'](destType, destAddr, 1);
            }, 3 /* DelayedStore */);
            opcode(0x125, 'saveundo', 0, 0, function saveundo(destType, destAddr) {
                var q = this.saveToQuetzal(destType, destAddr);
                if (this.undoBuffers) {
                    // TODO make MAX_UNDO_LEVEL configurable
                    if (this.undoBuffers.length >= 3) {
                        this.undoBuffers.unshift();
                    }
                    this.undoBuffers.push(q);
                }
                else {
                    this.undoBuffers = [q];
                }
                this.performDelayedStore(destType, destAddr, 0);
            }, 3 /* DelayedStore */);
            opcode(0x126, 'restoreundo', 0, 0, function restoreundo(destType, destAddr) {
                if (this.undoBuffers && this.undoBuffers.length) {
                    var q = this.undoBuffers.pop();
                    this.loadFromQuetzal(q);
                }
                else {
                    this.performDelayedStore(destType, destAddr, 1);
                }
            }, 3 /* DelayedStore */);
            opcode(0x127, 'protect', 2, 0, function protect(start, length) {
                if (start < this.image.getEndMem()) {
                    this.protectionStart = start;
                    this.protectionLength = length;
                }
            });
            opcode(0x128, 'hasundo', 0, 1, 
            // Test whether a VM state is available in temporary storage. 
            // return 0 if a state is available, 1 if not. 
            // If this returns 0, then restoreundo is expected to succeed.
            function hasundo() {
                if (this.undoBuffers && this.undoBuffers.length)
                    return 0;
                return 1;
            });
            opcode(0x129, 'discardundo', 0, 0, 
            // Discard a VM state (the most recently saved) from temporary storage. If none is available, this does nothing.
            function discardundo() {
                if (this.undoBuffers) {
                    this.undoBuffers.pop();
                }
            });
            opcode(0x110, 'random', 1, 1, function random(max) {
                if (max === 1 || max === 0xFFFFFFFF)
                    return 0;
                var random = this.random;
                if (!random) {
                    random = this.random = new MersenneTwister();
                }
                if (max === 0) {
                    return random.genrand_int32();
                }
                max = int32(max);
                if (max < 0) {
                    return uint32(-(random.genrand_int31() % -max));
                }
                return random.genrand_int31() % max;
            });
            opcode(0x111, 'setrandom', 1, 0, function setrandom(seed) {
                if (!seed)
                    seed = undefined;
                this.random = new MersenneTwister(seed);
            });
            opcode(0x1000, 'fyrecall', 3, 1, FyreVM.Engine.prototype.fyreCall);
            return opcodes;
        }
        Opcodes.initOpcodes = initOpcodes;
    })(Opcodes = FyreVM.Opcodes || (FyreVM.Opcodes = {}));
    function PerformBinarySearch(key, keySize, start, structSize, numStructs, keyOffset, options) {
        if (options & 2 /* ZeroKeyTerminates */)
            throw new Error("ZeroKeyTerminated option may not be used with binary search");
        if (keySize > 4 && !(options & 1 /* KeyIndirect */))
            throw new Error("KeyIndirect option must be used when searching for a >4 byte key");
        var returnIndex = options & 4 /* ReturnIndex */;
        var low = 0, high = numStructs;
        key = key >>> 0;
        while (low < high) {
            var index = Math.floor((low + high) / 2);
            var cmp = compareKeys.call(this, key, start + index * structSize + keyOffset, keySize, options);
            if (cmp === 0) {
                // found it
                if (returnIndex)
                    return index;
                return start + index * structSize;
            }
            if (cmp < 0) {
                high = index;
            }
            else {
                low = index + 1;
            }
        }
        // did not find
        return returnIndex ? 0xFFFFFFFF : 0;
    }
    function PerformLinearSearch(key, keySize, start, structSize, numStructs, keyOffset, options) {
        if (keySize > 4 && !(options & 1 /* KeyIndirect */))
            throw new Error("KeyIndirect option must be used when searching for a >4 byte key");
        var returnIndex = options & 4 /* ReturnIndex */;
        key = key >>> 0;
        for (var i = 0; numStructs === -1 || i < numStructs; i++) {
            var cmp = compareKeys.call(this, key, start + i * structSize + keyOffset, keySize, options);
            if (cmp === 0) {
                // found it
                if (returnIndex)
                    return i;
                return start + i * structSize;
            }
            if (options & 2 /* ZeroKeyTerminates */) {
                if (keyIsZero.call(this, start + i * structSize + keyOffset, keySize)) {
                    break;
                }
            }
        }
        // did not find
        return returnIndex ? 0xFFFFFFFF : 0;
    }
    function PerformLinkedSearch(key, keySize, start, keyOffset, nextOffset, options) {
        if (options & 4 /* ReturnIndex */)
            throw new Error("ReturnIndex option may not be used with linked search");
        var node = start;
        key = key >>> 0;
        while (node) {
            var cmp = compareKeys.call(this, key, node + keyOffset, keySize, options);
            if (cmp === 0) {
                // found it
                return node;
            }
            if (options & 2 /* ZeroKeyTerminates */) {
                if (keyIsZero.call(this, node + keyOffset, keySize)) {
                    return 0;
                }
            }
            // advance the next item
            node = this.image.readInt32(node + nextOffset);
        }
    }
    function keyIsZero(address, size) {
        while (size--) {
            if (this.image.readByte(address + size) !== 0)
                return false;
        }
        return true;
    }
    function compareKeys(query, candidateAddr, keySize, options) {
        var image = this.image;
        if (options & 1 /* KeyIndirect */) {
            // KeyIndirect *is* set
            // compare the bytes stored at query vs. candidateAddr
            for (var i = 0; i < keySize; i++) {
                var b1 = image.readByte(query++);
                var b2 = image.readByte(candidateAddr++);
                if (b1 < b2)
                    return -1;
                if (b1 > b2)
                    return 1;
            }
            return 0;
        }
        // KeyIndirect is *not* set
        // mask query to the appropriate size and compare it against the value stored at candidateAddr
        var ckey;
        switch (keySize) {
            case 1:
                ckey = image.readByte(candidateAddr);
                query &= 0xFF;
                return query - ckey;
            case 2:
                ckey = image.readInt16(candidateAddr);
                query &= 0xFFFF;
                return query - ckey;
            case 3:
                ckey = image.readInt32(candidateAddr) & 0xFFFFFF;
                query &= 0xFFFFFF;
                return query - ckey;
            case 4:
                ckey = image.readInt32(candidateAddr);
                return query - ckey;
        }
    }
})(FyreVM || (FyreVM = {}));
// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='GlkWrapper.ts' />
var FyreVM;
(function (FyreVM) {
    function SendCharToOutput(x) {
        switch (this.outputSystem) {
            case 0 /* Null */: return;
            case 2 /* Channels */:
                // TODO? need to handle Unicode characters larger than 16 bits
                this.outputBuffer.write(String.fromCharCode(x));
                return;
            case 3 /* Glk */:
                if (this.glkMode === 1 /* Wrapper */)
                    FyreVM.GlkWrapperWrite.call(this, String.fromCharCode(x));
                return;
        }
        throw new Error("unsupported output system " + this.outputSystem);
    }
    FyreVM.SendCharToOutput = SendCharToOutput;
    function SendStringToOutput(x) {
        switch (this.outputSystem) {
            case 0 /* Null */: return;
            case 2 /* Channels */:
                this.outputBuffer.write(x);
                return;
            case 3 /* Glk */:
                if (this.glkMode === 1 /* Wrapper */)
                    FyreVM.GlkWrapperWrite.call(this, x);
                return;
        }
        throw new Error("unsupported output system " + this.outputSystem);
    }
    FyreVM.SendStringToOutput = SendStringToOutput;
    /**
     * Prints the next character of a compressed string, consuming one or more bits.
     *
     */
    function NextCompressedChar() {
        var engine = this;
        var image = engine.image;
        var node = image.readInt32(this.decodingTable + 8 /* ROOTNODE_OFFSET */);
        while (true) {
            var nodeType = image.readByte(node++);
            switch (nodeType) {
                case 0 /* NODE_BRANCH */:
                    if (nextCompressedStringBit(engine)) {
                        node = image.readInt32(node + 4); // go right
                    }
                    else {
                        node = image.readInt32(node); // go left
                    }
                    break;
                case 1 /* NODE_END */:
                    this.resumeFromCallStub(0);
                    return;
                case 2 /* NODE_CHAR */:
                case 4 /* NODE_UNICHAR */:
                    var c = (nodeType === 4 /* NODE_UNICHAR */) ? image.readInt32(node) : image.readByte(node);
                    if (this.outputSystem === 1 /* Filter */) {
                        this.performCall(this.filterAddress, [c], 10 /* RESUME_HUFFSTR */, this.printingDigit, this.PC);
                    }
                    else {
                        SendCharToOutput.call(this, c);
                    }
                    return;
                case 3 /* NODE_CSTR */:
                    if (this.outputSystem === 1 /* Filter */) {
                        this.pushCallStub(10 /* RESUME_HUFFSTR */, this.printingDigit, this.PC, this.FP);
                        this.PC = node;
                        this.execMode = 1 /* CString */;
                    }
                    else {
                        SendStringToOutput.call(this, this.image.readCString(node));
                    }
                    return;
                // TODO: the other node types
                default:
                    throw new Error("Unrecognized compressed string node type " + nodeType);
            }
        }
    }
    FyreVM.NextCompressedChar = NextCompressedChar;
    function nextCompressedStringBit(engine) {
        var result = ((engine.image.readByte(engine.PC) & (1 << engine.printingDigit)) !== 0);
        engine.printingDigit++;
        if (engine.printingDigit === 8) {
            engine.printingDigit = 0;
            engine.PC++;
        }
        return result;
    }
    function NextCStringChar() {
        var ch = this.image.readByte(this.PC++);
        if (ch === 0) {
            this.resumeFromCallStub(0);
            return;
        }
        if (this.outputSystem === 1 /* Filter */) {
            this.performCall(this.filterAddress, [ch], 13 /* RESUME_CSTR */, 0, this.PC);
        }
        else {
            SendCharToOutput(ch);
        }
    }
    FyreVM.NextCStringChar = NextCStringChar;
    function NextUniStringChar() {
        var ch = this.image.readInt32(this.PC);
        this.PC += 4;
        if (ch === 0) {
            this.resumeFromCallStub(0);
            return;
        }
        if (this.outputSystem === 1 /* Filter */) {
            this.performCall(this.filterAddress, [ch], 14 /* RESUME_UNISTR */, 0, this.PC);
        }
        else {
            SendCharToOutput(ch);
        }
    }
    FyreVM.NextUniStringChar = NextUniStringChar;
    function NextDigit() {
        var s = this.PC.toString();
        if (this.printingDigit < s.length) {
            var ch = s.charAt(this.printingDigit);
            if (this.outputSystem === 1 /* Filter */) {
                this.performCall(this.filterAddress, [ch.charCodeAt(0)], 12 /* RESUME_NUMBER */, this.printingDigit + 1, this.PC);
            }
            else {
                SendStringToOutput(ch);
                this.printingDigit++;
            }
        }
        else {
            this.resumeFromCallStub(0);
        }
    }
    FyreVM.NextDigit = NextDigit;
    var OutputBuffer = (function () {
        function OutputBuffer() {
            // No special "StringBuilder"
            // simple String concatenation is said to be fast on modern browsers
            // http://stackoverflow.com/a/27126355/14955
            this.channel = 'MAIN';
            this.channelData = {
                MAIN: ''
            };
        }
        OutputBuffer.prototype.getChannel = function () {
            return this.channel;
        };
        /**  If the output channel is changed to any channel other than
        * "MAIN", the channel's contents will be
        * cleared first.
        */
        OutputBuffer.prototype.setChannel = function (c) {
            if (c === this.channel)
                return;
            this.channel = c;
            if (c !== 'MAIN') {
                this.channelData[c] = '';
            }
        };
        /**
         * Writes a string to the buffer for the currently
         * selected output channel.
         */
        OutputBuffer.prototype.write = function (s) {
            this.channelData[this.channel] += s;
        };
        /**
         *  Packages all the output that has been stored so far, returns it,
         *  and empties the buffer.
         */
        OutputBuffer.prototype.flush = function () {
            var channelData = this.channelData;
            var r = {};
            for (var c in channelData) {
                var s = channelData[c];
                if (s) {
                    r[c] = s;
                    channelData[c] = '';
                }
            }
            return r;
        };
        return OutputBuffer;
    }());
    FyreVM.OutputBuffer = OutputBuffer;
})(FyreVM || (FyreVM = {}));
// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
var FyreVM;
(function (FyreVM) {
    /**
     * a struct to keep track of heap fragments
     */
    var HeapEntry = (function () {
        function HeapEntry(offset, length) {
            this.offset = offset;
            this.length = length;
        }
        return HeapEntry;
    }());
    /**
     * Manages the heap size and block allocation for the malloc/mfree opcodes.
     *
     * If Inform ever starts using the malloc opcode directly, instead of
     * its own heap allocator, this should be made a little smarter.
     * Currently we make no attempt to avoid heap fragmentation.
     */
    var HeapAllocator = (function () {
        function HeapAllocator(heapAddress, memory) {
            this.heapExtent = 0;
            this.maxHeapExtent = 0;
            this.blocks = [];
            this.freeList = [];
            this.heapAddress = heapAddress;
            this.memory = memory;
            this.endMem = heapAddress;
        }
        /**
         * saves the heap state into a ArrayBuffer.
         * Does not include the memory itself, only the block allocation information.
         */
        HeapAllocator.prototype.save = function () {
            var count = this.blockCount();
            var result = new MemoryAccess(8 + count * 8);
            result.writeInt32(0, this.heapAddress);
            result.writeInt32(4, count);
            var blocks = this.blocks;
            for (var i = 0; i < count; i++) {
                result.writeInt32(8 * i + 8, blocks[i].offset);
                result.writeInt32(8 * i * 12, blocks[i].length);
            }
            return result.buffer;
        };
        /**
         * restores the heap state from an ArrayBuffer (as created by the "save" method)
         */
        HeapAllocator.restore = function (buffer, memory) {
            var m = new MemoryAccess(0);
            m.buffer = new Uint8Array(buffer);
            var count = m.readInt32(4);
            if (count === 0)
                return null;
            var heap = new HeapAllocator(m.readInt32(0), memory);
            var nextAddress = heap.heapAddress;
            for (var i = 0; i < count; i++) {
                var start = m.readInt32(8 * i + 8);
                var length_1 = m.readInt32(8 * i + 12);
                heap.blocks.push(new HeapEntry(start, length_1));
                if (nextAddress < start) {
                    heap.freeList.push(new HeapEntry(nextAddress, start - nextAddress));
                }
                nextAddress = start + length_1;
            }
            heap.endMem = nextAddress;
            heap.heapExtent = nextAddress - heap.heapAddress;
            if (!heap.memory.setEndMem(heap.endMem)) {
                throw new Error("Can't allocate VM memory to fit saved heap");
            }
            // TODO: sort blocklist and freelist
            return heap;
        };
        /**
         * allocates a new block on the heap
         * @return the address of the new block, or null if allocation failed
         */
        HeapAllocator.prototype.alloc = function (size) {
            var _a = this, blocks = _a.blocks, freeList = _a.freeList;
            var result = new HeapEntry(-1, size);
            // look for a free block
            for (var i = 0; i < freeList.length; i++) {
                var entry = freeList[i];
                if (entry && entry.length >= size) {
                    result.offset = entry.offset;
                    if (entry.length > size) {
                        // keep the rest in the free list
                        entry.offset += size;
                        entry.length -= size;
                    }
                    else {
                        freeList[i] = null;
                    }
                    break;
                }
            }
            if (result.offset === -1) {
                // enforce max heap size
                if (this.maxHeapExtent && this.heapExtent + size > this.maxHeapExtent) {
                    return null;
                }
                // add a new block
                result.offset = this.heapAddress + this.heapExtent;
                if (result.offset + size > this.endMem) {
                    // grow the heap
                    var newHeapAllocation = Math.max(this.heapExtent * 5 / 4, this.heapExtent + size);
                    if (this.maxHeapExtent) {
                        newHeapAllocation = Math.min(newHeapAllocation, this.maxHeapExtent);
                    }
                    if (!this.setEndMem(newHeapAllocation)) {
                        return null;
                    }
                }
                this.heapExtent += size;
            }
            // TODO: keep the list sorted
            blocks.push(result);
            return result.offset;
        };
        HeapAllocator.prototype.setEndMem = function (newHeapAllocation) {
            var newEndMem = this.heapAddress + newHeapAllocation;
            if (this.memory.setEndMem(newEndMem)) {
                this.endMem = newEndMem;
                return true;
            }
            return false;
        };
        HeapAllocator.prototype.blockCount = function () {
            return this.blocks.length;
        };
        /**
         * deallocates a previously allocated block
         */
        HeapAllocator.prototype.free = function (address) {
            var _a = this, blocks = _a.blocks, freeList = _a.freeList;
            // find the block
            for (var i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                if (block.offset === address) {
                    // remove it
                    blocks.splice(i, 1);
                    // shrink the heap if that was at the end
                    if (address + block.length - this.heapAddress === this.heapExtent) {
                        var newHeapExtent = this.heapAddress;
                        for (var j = 0; j < blocks.length; j++) {
                            var b = blocks[j];
                            newHeapExtent = Math.max(newHeapExtent, b.length + b.offset);
                        }
                        this.heapExtent = newHeapExtent - this.heapAddress;
                    }
                    else {
                        // add to the free list
                        freeList.push(block);
                    }
                    // shrink the heap
                    if (blocks.length > 0 && this.heapExtent <= (this.endMem - this.heapAddress) / 2) {
                        if (this.setEndMem(this.heapExtent)) {
                            var newEndMem = this.endMem;
                            for (var i_1 = 0; i_1 < freeList.length; i_1++) {
                                var entry = freeList[i_1];
                                if (entry && entry.offset >= newEndMem) {
                                    freeList[i_1] = null;
                                }
                            }
                        }
                    }
                    return;
                }
            }
        };
        return HeapAllocator;
    }());
    FyreVM.HeapAllocator = HeapAllocator;
    /**
     *  Wrapper around ECMAScript 6 standard Uint8Array.
     *  Provides access to a memory buffer.
     */
    var MemoryAccess = (function () {
        function MemoryAccess(size, maxSize) {
            if (maxSize === void 0) { maxSize = size; }
            this.buffer = new Uint8Array(size);
            this.maxSize = maxSize;
        }
        /**
         * Reads a single byte (unsigned)
         */
        MemoryAccess.prototype.readByte = function (offset) {
            return this.buffer[offset];
        };
        /**
        * Writes a single byte (unsigned).
        * Writes 0 when value is undefined or null.
        */
        MemoryAccess.prototype.writeByte = function (offset, value) {
            if (value < 0 || value > 255)
                throw new Error(value + " is out of range for a byte");
            this.buffer[offset] = value;
        };
        /**
         * Reads an unsigned, big-endian, 16-bit number
         */
        MemoryAccess.prototype.readInt16 = function (offset) {
            return (this.buffer[offset] * 256) + this.buffer[offset + 1];
        };
        // TypeScript does not like us calling "set" with an array directly
        MemoryAccess.prototype.set = function (offset, value) {
            this.buffer.set(value, offset);
        };
        /**
         * Writes an unsigned, big-endian, 16-bit number.
         * Writes 0 when value is undefined or null.
         */
        MemoryAccess.prototype.writeInt16 = function (offset, value) {
            if (value < 0 || value > 0xFFFF)
                throw new Error(value + " is out of range for uint16");
            this.set(offset, [value >> 8, value & 0xFF]);
        };
        /**
        * Reads an unsigned, big-endian, 32-bit number
        */
        MemoryAccess.prototype.readInt32 = function (offset) {
            return this.buffer[offset] * 0x1000000
                + this.buffer[offset + 1] * 0x10000
                + this.buffer[offset + 2] * 0x100
                + this.buffer[offset + 3];
        };
        /**
         * Writes an unsigned, big-endian, 32-bit number
         * Writes 0 when value is undefined or null.
         */
        MemoryAccess.prototype.writeInt32 = function (offset, value) {
            value = value >>> 0;
            this.set(offset, [value >> 24, value >> 16 & 0xFF, value >> 8 & 0xFF, value & 0xFF]);
        };
        /**
         * Converts part of the buffer into a String,
         * assumes that the data is valid ASCII
         */
        MemoryAccess.prototype.readASCII = function (offset, length) {
            var len = 0, buffer = this.buffer, d = [];
            while (len < length) {
                var x = buffer[offset + len];
                len++;
                d.push(x);
            }
            return String.fromCharCode.apply(String, d);
        };
        /**
         * reads a 0-terminated C-string
         */
        MemoryAccess.prototype.readCString = function (offset) {
            var len = 0, buffer = this.buffer, d = [];
            while (true) {
                var x = buffer[offset + len];
                if (x === 0)
                    break;
                len++;
                d.push(x);
            }
            return String.fromCharCode.apply(String, d);
        };
        /**
         * Writes an ASCII String
         */
        MemoryAccess.prototype.writeASCII = function (offset, value) {
            var codes = [];
            for (var i = 0; i < value.length; i++) {
                codes.push(value.charCodeAt(i));
            }
            this.set(offset, codes);
        };
        /**
        * Resizes the available memory
        */
        MemoryAccess.prototype.setEndMem = function (newEndMem) {
            if (newEndMem > this.maxSize)
                return false;
            return true;
        };
        /**
         * Copy a part of the memory into a new buffer.
         *
         * The length can be more than there is data
         * in the original buffer. In this case the
         * new buffer will contain unspecified data
         * at the end.
         */
        MemoryAccess.prototype.copy = function (offset, length) {
            // TODO: range check
            if (length > this.maxSize)
                throw new Error("Memory request for " + length + " bytes exceeds limit of " + this.maxSize);
            var result = new MemoryAccess(length);
            result.buffer.set(this.buffer.subarray(offset, offset + length));
            result.maxSize = this.maxSize;
            return result;
        };
        /**
          * returns the number of bytes available
          */
        MemoryAccess.prototype.size = function () {
            return this.buffer.length;
        };
        return MemoryAccess;
    }());
    FyreVM.MemoryAccess = MemoryAccess;
})(FyreVM || (FyreVM = {}));
// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='MemoryAccess.ts' />
/**
 * Represents the ROM and RAM of a Glulx game image.
 */
var FyreVM;
(function (FyreVM) {
    ;
    var UlxImage = (function () {
        function UlxImage(original) {
            this.original = original;
            this.loadFromOriginal();
        }
        UlxImage.prototype.loadFromOriginal = function () {
            var stream = this.original;
            // read the header, to find out how much memory we need
            var header = stream.copy(0, 36 /* SIZE */);
            var magic = header.readASCII(0, 4);
            if (magic !== 'Glul') {
                throw new Error(".ulx file has wrong magic number " + magic);
            }
            var endmem = header.readInt32(16 /* ENDMEM_OFFSET */);
            if (endmem < 36 /* SIZE */) {
                throw new Error("invalid endMem " + endmem + " in .ulx file. Too small to even fit the header.");
            }
            // now read the whole thing
            this.memory = stream.copy(0, endmem);
            // TODO: verify checksum
            this.ramstart = header.readInt32(8 /* RAMSTART_OFFSET */);
            if (this.ramstart > endmem) {
                throw new Error("invalid ramStart " + this.ramstart + " beyond endMem " + endmem + ".");
            }
        };
        UlxImage.prototype.getMajorVersion = function () {
            return this.memory.readInt16(4 /* VERSION_OFFSET */);
        };
        UlxImage.prototype.getMinorVersion = function () {
            return this.memory.readInt16(4 /* VERSION_OFFSET */ + 2) >> 8;
        };
        UlxImage.prototype.getStackSize = function () {
            return this.memory.readInt32(20 /* STACKSIZE_OFFSET */);
        };
        UlxImage.prototype.getEndMem = function () {
            return this.memory.size();
        };
        UlxImage.prototype.getRamAddress = function (relativeAddress) {
            return this.ramstart + relativeAddress;
        };
        /**
         * sets the address at which memory ends.
         * This can be changed by the game with setmemsize,
         * or managed automatically be the heap allocator.
         */
        UlxImage.prototype.setEndMem = function (value) {
            // round up to the next multiple of 256
            if (value % 256 != 0) {
                value = (value + 255) & 0xFFFFFF00;
            }
            if (this.memory.size() != value) {
                this.memory = this.memory.copy(0, value);
            }
        };
        UlxImage.prototype.getStartFunc = function () {
            return this.memory.readInt32(24 /* STARTFUNC_OFFSET */);
        };
        UlxImage.prototype.getDecodingTable = function () {
            return this.memory.readInt32(28 /* DECODINGTBL_OFFSET */);
        };
        UlxImage.prototype.saveToQuetzal = function () {
            var quetzal = new FyreVM.Quetzal();
            // 'IFhd' identifies the first 128 bytes of the game file
            quetzal.setChunk('IFhd', this.original.copy(0, 128).buffer);
            // 'CMem' or 'UMem' are the compressed/uncompressed contents of RAM
            // TODO: implement compression
            var ramSize = this.getEndMem() - this.ramstart;
            var umem = new FyreVM.MemoryAccess(ramSize + 4);
            umem.writeInt32(0, ramSize);
            umem.buffer.set(new Uint8Array(this.memory.buffer).subarray(this.ramstart, this.ramstart + ramSize), 4);
            quetzal.setChunk("UMem", umem.buffer);
            return quetzal;
        };
        UlxImage.prototype.readByte = function (address) {
            return this.memory.readByte(address);
        };
        UlxImage.prototype.readInt16 = function (address) {
            return this.memory.readInt16(address);
        };
        UlxImage.prototype.readInt32 = function (address) {
            return this.memory.readInt32(address);
        };
        UlxImage.prototype.readCString = function (address) {
            return this.memory.readCString(address);
        };
        UlxImage.prototype.writeInt32 = function (address, value) {
            if (address < this.ramstart)
                throw new Error("Writing into ROM! offset: " + address);
            this.memory.writeInt32(address, value);
        };
        UlxImage.prototype.writeBytes = function (address) {
            var bytes = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                bytes[_i - 1] = arguments[_i];
            }
            if (address < this.ramstart)
                throw new Error("Writing into ROM! offset: " + address);
            for (var i = 0; i < bytes.length; i++) {
                this.memory.writeByte(address + i, bytes[i]);
            }
        };
        UlxImage.prototype.write = function (rule, address, value) {
            switch (rule) {
                case 1 /* Indirect8Bit */:
                    this.writeBytes(address, value);
                    return;
                case 2 /* Indirect16Bit */:
                    this.writeBytes(address, value >> 8, value & 0xFF);
                    return;
                default:
                    this.writeInt32(address, value);
            }
        };
        /**
         * @param limit: the maximum number of bytes to write
         * returns the number of bytes written
         */
        UlxImage.prototype.writeASCII = function (address, text, limit) {
            var bytes = [];
            for (var i = 0; i < text.length && i < limit; i++) {
                var c = text.charCodeAt(i);
                if (c > 255) {
                    c = 63; // '?'
                }
                bytes.push(c);
            }
            this.writeBytes.apply(this, [address].concat(bytes));
            return bytes.length;
        };
        UlxImage.writeHeader = function (fields, m, offset) {
            if (offset === void 0) { offset = 0; }
            m.writeASCII(offset, fields.magic || 'Glul');
            m.writeInt32(offset + 4 /* VERSION_OFFSET */, fields.version);
            m.writeInt32(offset + 8 /* RAMSTART_OFFSET */, fields.ramStart);
            m.writeInt32(offset + 12 /* EXTSTART_OFFSET */, fields.extStart);
            m.writeInt32(offset + 16 /* ENDMEM_OFFSET */, fields.endMem);
            m.writeInt32(offset + 20 /* STACKSIZE_OFFSET */, fields.stackSize);
            m.writeInt32(offset + 24 /* STARTFUNC_OFFSET */, fields.startFunc);
            m.writeInt32(offset + 28 /* DECODINGTBL_OFFSET */, fields.decodingTbl);
            m.writeInt32(offset + 32 /* CHECKSUM_OFFSET */, fields.checksum);
        };
        /** Reloads the game file, discarding all changes that have been made
        * to RAM and restoring the memory map to its original size.
        *
        * Use the optional "protection" parameters to preserve a RAM region
        */
        UlxImage.prototype.revert = function (protectionStart, protectionLength) {
            if (protectionStart === void 0) { protectionStart = 0; }
            if (protectionLength === void 0) { protectionLength = 0; }
            var prot = this.copyProtectedRam(protectionStart, protectionLength);
            this.loadFromOriginal();
            if (prot) {
                var d = [];
                for (var i = 0; i < protectionLength; i++) {
                    d.push(prot.readByte(i));
                }
                this.writeBytes.apply(this, [protectionStart].concat(d));
            }
        };
        UlxImage.prototype.copyProtectedRam = function (protectionStart, protectionLength) {
            var prot = null;
            if (protectionLength > 0) {
                if (protectionStart + protectionLength > this.getEndMem()) {
                    protectionLength = this.getEndMem() - protectionStart;
                }
                // can only protect RAM
                var start = protectionStart - this.ramstart;
                if (start < 0) {
                    protectionLength += start;
                    start = 0;
                }
                prot = this.memory.copy(start + this.ramstart, protectionLength);
            }
            return prot;
        };
        UlxImage.prototype.restoreFromQuetzal = function (quetzal, protectionStart, protectionLength) {
            if (protectionStart === void 0) { protectionStart = 0; }
            if (protectionLength === void 0) { protectionLength = 0; }
            // TODO: support compressed RAM
            var newRam = quetzal.getChunk('UMem');
            if (newRam) {
                var prot = this.copyProtectedRam(protectionStart, protectionLength);
                var r = new FyreVM.MemoryAccess(0);
                r.buffer = new Uint8Array(newRam);
                var length_2 = r.readInt32(0);
                this.setEndMem(length_2 + this.ramstart);
                var i = 4;
                var j = this.ramstart;
                while (i < newRam.byteLength) {
                    this.memory.writeByte(j++, r.readByte(i++));
                }
                if (prot) {
                    var d = [];
                    for (var i_2 = 0; i_2 < protectionLength; i_2++) {
                        d.push(prot.readByte(i_2));
                    }
                    this.writeBytes.apply(this, [protectionStart].concat(d));
                }
            }
            else {
                throw new Error("Missing CMem/UMem blocks");
            }
        };
        return UlxImage;
    }());
    FyreVM.UlxImage = UlxImage;
})(FyreVM || (FyreVM = {}));
// slightly adapted from https://github.com/beatgammit/base64-js
var Base64;
(function (Base64) {
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    function init() {
        var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        for (var i = 0, len = code.length; i < len; ++i) {
            lookup[i] = code[i];
            revLookup[code.charCodeAt(i)] = i;
        }
        revLookup['-'.charCodeAt(0)] = 62;
        revLookup['_'.charCodeAt(0)] = 63;
    }
    init();
    function toByteArray(b64) {
        var i, j, l, tmp, placeHolders, arr;
        var len = b64.length;
        if (len % 4 > 0) {
            throw new Error('Invalid string. Length must be a multiple of 4');
        }
        // the number of equal signs (place holders)
        // if there are two placeholders, than the two characters before it
        // represent one byte
        // if there is only one, then the three characters before it represent 2 bytes
        // this is just a cheap hack to not do indexOf twice
        placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;
        // base64 is 4/3 + up to two characters of the original data
        arr = new Arr(len * 3 / 4 - placeHolders);
        // if there are placeholders, only get up to the last complete 4 chars
        l = placeHolders > 0 ? len - 4 : len;
        var L = 0;
        for (i = 0, j = 0; i < l; i += 4, j += 3) {
            tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
            arr[L++] = (tmp >> 16) & 0xFF;
            arr[L++] = (tmp >> 8) & 0xFF;
            arr[L++] = tmp & 0xFF;
        }
        if (placeHolders === 2) {
            tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
            arr[L++] = tmp & 0xFF;
        }
        else if (placeHolders === 1) {
            tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
            arr[L++] = (tmp >> 8) & 0xFF;
            arr[L++] = tmp & 0xFF;
        }
        return arr;
    }
    Base64.toByteArray = toByteArray;
    function tripletToBase64(num) {
        return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
    }
    function encodeChunk(uint8, start, end) {
        var tmp;
        var output = [];
        for (var i = start; i < end; i += 3) {
            tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
            output.push(tripletToBase64(tmp));
        }
        return output.join('');
    }
    function fromByteArray(uint8) {
        var tmp;
        var len = uint8.length;
        var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
        var output = '';
        var parts = [];
        var maxChunkLength = 16383; // must be multiple of 3
        // go through the array every three bytes, we'll deal with trailing stuff later
        for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
            parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
        }
        // pad the end with zeros, but make sure to not forget the extra bytes
        if (extraBytes === 1) {
            tmp = uint8[len - 1];
            output += lookup[tmp >> 2];
            output += lookup[(tmp << 4) & 0x3F];
            output += '==';
        }
        else if (extraBytes === 2) {
            tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
            output += lookup[tmp >> 10];
            output += lookup[(tmp >> 4) & 0x3F];
            output += lookup[(tmp << 2) & 0x3F];
            output += '=';
        }
        parts.push(output);
        return parts.join('');
    }
    Base64.fromByteArray = fromByteArray;
})(Base64 || (Base64 = {}));
// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='MemoryAccess.ts' />
/// <reference path="../b64.ts" />
var FyreVM;
(function (FyreVM) {
    /// Implements the Quetzal saved-game file specification by holding a list of
    /// typed data chunks which can be read from or written to streams.
    /// http://www.ifarchive.org/if-archive/infocom/interpreters/specification/savefile_14.txt
    var Quetzal = (function () {
        function Quetzal() {
            this.chunks = {};
        }
        Quetzal.prototype.setChunk = function (name, value) {
            if (name.length != 4) {
                throw new Error("invalid chunk id " + name + ", must be four ASCII chars");
            }
            this.chunks[name] = value;
        };
        Quetzal.prototype.getChunk = function (name) {
            return this.chunks[name];
        };
        Quetzal.prototype.getIFhdChunk = function () {
            return this.getChunk('IFhd');
        };
        Quetzal.prototype.serialize = function () {
            // determine the buffer size
            var size = 12; // three int32 headers
            var chunks = this.chunks;
            for (var name_1 in chunks) {
                size += 4; // the key
                size += 4; // the value length
                size += chunks[name_1].byteLength;
            }
            var fileLength = size - 8;
            if (size % 2) {
                size++; // padding				
            }
            var m = new FyreVM.MemoryAccess(size);
            m.writeByte(size - 1, 0);
            m.writeASCII(0, 'FORM'); // IFF tag
            m.writeInt32(4, fileLength);
            m.writeASCII(8, 'IFZS'); // FORM sub-ID for Quetzal
            var pos = 12;
            for (var name_2 in chunks) {
                m.writeASCII(pos, name_2);
                var value = chunks[name_2];
                var len = value.byteLength;
                m.writeInt32(pos + 4, len);
                m.buffer.set(new Uint8Array(value), pos + 8);
                pos += 8 + len;
            }
            return m.buffer.buffer;
        };
        Quetzal.load = function (buffer) {
            var q = new Quetzal();
            var m = new FyreVM.MemoryAccess(0);
            m.buffer = new Uint8Array(buffer);
            var type = m.readASCII(0, 4);
            if (type !== 'FORM' && type !== 'LIST' && type !== 'CAT_') {
                throw new Error("invalid IFF type " + type);
            }
            var length = m.readInt32(4);
            if (buffer.byteLength < 8 + length) {
                throw new Error("Quetzal file is too short for ${length} bytes");
            }
            type = m.readASCII(8, 4);
            if (type !== 'IFZS') {
                throw new Error("invalid IFF sub-type " + type + ". Not a Quetzal file");
            }
            var pos = 12;
            var limit = 8 + length;
            while (pos < limit) {
                var name_3 = m.readASCII(pos, 4);
                length = m.readInt32(pos + 4);
                var value = m.buffer.subarray(pos + 8, pos + 8 + length);
                q.setChunk(name_3, value);
                pos += 8 + length;
            }
            return q;
        };
        /**
         * convenience method to encode a Quetzal file as Base64
         */
        Quetzal.prototype.base64Encode = function () {
            return Base64.fromByteArray(new Uint8Array(this.serialize()));
        };
        /**
         * convenience method to decode a Quetzal file from Base64
         */
        Quetzal.base64Decode = function (base64) {
            return Quetzal.load(Base64.toByteArray(base64).buffer);
        };
        return Quetzal;
    }());
    FyreVM.Quetzal = Quetzal;
})(FyreVM || (FyreVM = {}));
// Written from 2015 to 2016 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='Opcodes.ts' />
/// <reference path='Output.ts' />
/// <reference path='UlxImage.ts' />
/// <reference path='Quetzal.ts' />
var FyreVM;
(function (FyreVM) {
    var CallStub = (function () {
        function CallStub() {
        }
        return CallStub;
    }());
    // coerce uint32 number into  (signed!) int32 range
    function int32(x) {
        if (x >= 0x80000000) {
            x = -(0xFFFFFFFF - x + 1);
        }
        return x;
    }
    function int16(x) {
        if (x >= 0x8000) {
            x = -(0xFFFF - x + 1);
        }
        return x;
    }
    function int8(x) {
        if (x >= 0x80) {
            x = -(0xFF - x + 1);
        }
        return x;
    }
    function uint8(x) {
        if (x < 0) {
            x = 255 + x + 1;
        }
        return x % 256;
    }
    function toASCII(x) {
        return String.fromCharCode(x >> 24, (x >> 16) & 0xFF, (x >> 8) & 0xFF, x & 0xFF);
    }
    var Engine = (function () {
        function Engine(gameFile) {
            this.outputBuffer = new FyreVM.OutputBuffer();
            // counters to measure performance
            this.cycle = 0;
            this.startTime = 0;
            this.printingDigit = 0; // bit number for compressed strings, digit for numbers
            this.protectionStart = 0;
            this.protectionLength = 0;
            this.veneer = {};
            // if turned off, no FyreVM functions are made available, just standard Glulx stuff
            this.enableFyreVM = true;
            this.glkMode = 0 /* None */;
            var major = gameFile.getMajorVersion();
            if (major < 2 || major > 3)
                throw new Error("Game version is out of the supported range");
            var minor = gameFile.getMinorVersion();
            if (major == 2 && minor < 0)
                throw new Error("Game version is out of the supported range");
            if (major == 3 && minor > 1)
                throw new Error("Game version is out of the supported range");
            this.image = gameFile;
            this.stack = new FyreVM.MemoryAccess(gameFile.getStackSize() * 4);
        }
        /**
         * clears the stack and initializes VM registers
         * from values found in RAM
         */
        Engine.prototype.bootstrap = function () {
            this.opcodes = FyreVM.Opcodes.initOpcodes();
            var mainfunc = this.image.getStartFunc();
            this.decodingTable = this.image.getDecodingTable();
            this.SP = this.FP = this.frameLen = this.localsPos = 0;
            this.outputSystem = 0 /* Null */;
            this.enterFunction(mainfunc);
        };
        /**
         *  Pushes a frame for a function call, updating FP, SP, and PC.
         *  (A call stub should have already been pushed.)
         */
        Engine.prototype.enterFunction = function (address) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var _a = this, image = _a.image, stack = _a.stack;
            this.execMode = 0 /* Code */;
            // push a call frame
            this.FP = this.SP;
            this.push(0); // temporary FrameLen
            this.push(0); // temporary LocalsPos
            // copy locals info into the frame
            var localSize = 0;
            for (var i = address + 1; true; i += 2) {
                var type = image.readByte(i);
                var count = image.readByte(i + 1);
                this.pushByte(type);
                this.pushByte(count);
                if (type === 0 || count === 0) {
                    this.PC = i + 2;
                    break;
                }
                if (localSize % type > 0) {
                    localSize += (type - (localSize % type));
                }
                localSize += type * count;
            }
            // padding
            while (this.SP % 4 > 0) {
                this.pushByte(0);
            }
            var sp = this.SP;
            var fp = this.FP;
            this.localsPos = sp - fp;
            // fill in localsPos
            stack.writeInt32(fp + 4, this.localsPos);
            var lastOffset = 0;
            if (args && args.length) {
                // copy initial values as appropriate
                var offset = 0;
                var size = 0;
                var count = 0;
                address++;
                for (var argnum = 0; argnum < args.length; argnum++) {
                    if (count === 0) {
                        size = image.readByte(address++);
                        count = image.readByte(address++);
                        if (size === 0 || count === 0)
                            break;
                        if (offset % size > 0) {
                            offset += (size - (offset % size));
                        }
                    }
                    // zero any padding space between locals
                    for (var i = lastOffset; i < offset; i++) {
                        stack.writeByte(sp + i, 0);
                    }
                    switch (size) {
                        case 1:
                            stack.writeByte(sp + offset, args[argnum]);
                            break;
                        case 2:
                            stack.writeInt16(sp + offset, args[argnum]);
                            break;
                        case 4:
                            stack.writeInt32(sp + offset, args[argnum]);
                            break;
                        default:
                            throw new Error("Illegal call param size " + size + " at position " + argnum);
                    }
                    offset += size;
                    lastOffset = offset;
                    count--;
                }
            }
            // zero any remaining local space
            for (var i = lastOffset; i < localSize; i++) {
                stack.writeByte(sp + i, 0);
            }
            sp += localSize;
            // padding
            while (sp % 4 > 0) {
                stack.writeByte(sp++, 0);
            }
            this.frameLen = sp - fp;
            stack.writeInt32(fp, sp - fp);
            this.SP = sp;
        };
        Engine.prototype.push = function (value) {
            this.stack.writeInt32(this.SP, value);
            this.SP += 4;
        };
        Engine.prototype.pop = function () {
            this.SP -= 4;
            return this.stack.readInt32(this.SP);
        };
        Engine.prototype.pushByte = function (value) {
            this.stack.writeByte(this.SP++, value);
        };
        Engine.prototype.pushCallStub = function (destType, destAddr, PC, framePtr) {
            this.push(destType);
            this.push(destAddr);
            this.push(PC);
            this.push(framePtr);
        };
        Engine.prototype.popCallStub = function () {
            var stub = new CallStub();
            stub.framePtr = this.pop();
            stub.PC = this.pop();
            stub.destAddr = this.pop();
            stub.destType = this.pop();
            return stub;
        };
        /**
         * executes a single cycle
         */
        Engine.prototype.step = function () {
            var image = this.image;
            this.cycle++;
            switch (this.execMode) {
                case 0 /* Code */:
                    // decode opcode number
                    var opnum = image.readByte(this.PC);
                    if (opnum >= 0xC0) {
                        opnum = image.readInt32(this.PC) - 0xC0000000;
                        this.PC += 4;
                    }
                    else if (opnum >= 0x80) {
                        opnum = image.readInt16(this.PC) - 0x8000;
                        this.PC += 2;
                    }
                    else {
                        this.PC++;
                    }
                    // look up opcode info
                    var opcode = this.opcodes[opnum];
                    if (!opcode) {
                        throw new Error("Unrecognized opcode " + opnum);
                    }
                    // decode load-operands
                    var opcount = opcode.loadArgs + opcode.storeArgs;
                    var operands = [];
                    if (opcode.rule === 3 /* DelayedStore */)
                        opcount++;
                    else if (opcode.rule === 4 /* Catch */)
                        opcount += 2;
                    var operandPos = Math.floor(this.PC + (opcount + 1) / 2);
                    for (var i = 0; i < opcode.loadArgs; i++) {
                        var type = void 0;
                        if (i % 2 === 0) {
                            type = image.readByte(this.PC) & 0xF;
                        }
                        else {
                            type = (image.readByte(this.PC++) >> 4) & 0xF;
                        }
                        operandPos += this.decodeLoadOperand(opcode, type, operands, operandPos);
                    }
                    // decode store-operands
                    var storePos = this.PC;
                    var resultTypes = [];
                    var resultAddrs = [];
                    for (var i = 0; i < opcode.storeArgs; i++) {
                        var type = i + opcode.loadArgs;
                        if (type % 2 === 0) {
                            type = image.readByte(this.PC) & 0xF;
                        }
                        else {
                            type = (image.readByte(this.PC++) >> 4) & 0xF;
                        }
                        resultTypes[i] = type;
                        operandPos += this.decodeStoreOperand(opcode, type, resultAddrs, operandPos);
                    }
                    if (opcode.rule === 3 /* DelayedStore */ || opcode.rule === 4 /* Catch */) {
                        var type = opcode.loadArgs + opcode.storeArgs;
                        if (type % 2 === 0) {
                            type = image.readByte(this.PC) & 0xF;
                        }
                        else {
                            type = (image.readByte(this.PC++) >> 4) & 0xF;
                        }
                        operandPos += this.decodeDelayedStoreOperand(opcode, type, operands, operandPos);
                    }
                    if (opcode.rule === 4 /* Catch */) {
                        // decode final load operand for @catch
                        var type = opcode.loadArgs + opcode.storeArgs + 1;
                        if (type % 2 === 0) {
                            type = image.readByte(this.PC) & 0xF;
                        }
                        else {
                            type = (image.readByte(this.PC++) >> 4) & 0xF;
                        }
                        operandPos += this.decodeLoadOperand(opcode, type, operands, operandPos);
                    }
                    //					console.info(opcode.name, operands, this.PC, operandPos);
                    // call opcode implementation
                    this.PC = operandPos; // after the last operanc				
                    var result = opcode.handler.apply(this, operands);
                    if (resultTypes.length === 1 || result === 'wait') {
                        result = [result];
                    }
                    // store results
                    if (result) {
                        // for asynchronous input, we need to stop right now
                        // until we are asked to resume
                        if ('wait' === result[0]) {
                            this.resumeAfterWait_resultTypes = resultTypes;
                            this.resumeAfterWait_resultAddrs = resultAddrs;
                            return 'wait';
                        }
                        this.storeResults(opcode.rule, resultTypes, resultAddrs, result);
                    }
                    break;
                case 2 /* CompressedString */:
                    // TODO: native decoding table
                    FyreVM.NextCompressedChar.call(this);
                    break;
                case 1 /* CString */:
                    FyreVM.NextCStringChar.call(this);
                    break;
                case 3 /* UnicodeString */:
                    FyreVM.NextUniStringChar.call(this);
                    break;
                case 4 /* Number */:
                    FyreVM.NextDigit.call(this);
                    break;
                default:
                    throw new Error("unsupported execution mode " + this.execMode);
            }
        };
        /**
         * Starts the interpreter.
         * This method does not return until the game finishes, either by
         * returning from the main function or with the quit opcode
         * (unless it is placed into "waiting" mode for asynchronous
         * user input. In this case, there will be a callback that resumes
         * execution)
         */
        Engine.prototype.run = function () {
            this.running = true;
            this.bootstrap();
            this.resumeAfterWait();
        };
        /**
         * @return how many extra bytes were read (so that operandPos can be advanced)
         */
        Engine.prototype.decodeLoadOperand = function (opcode, type, operands, operandPos) {
            var _a = this, image = _a.image, stack = _a.stack, FP = _a.FP, localsPos = _a.localsPos, frameLen = _a.frameLen;
            function loadLocal(address) {
                address += FP + localsPos;
                var maxAddress = FP + frameLen;
                switch (opcode.rule) {
                    case 1 /* Indirect8Bit */:
                        if (address > maxAddress)
                            throw new Error("Reading outside local storage bounds");
                        return stack.readByte(address);
                    case 2 /* Indirect16Bit */:
                        if (address + 1 > maxAddress)
                            throw new Error("Reading outside local storage bounds");
                        return stack.readInt16(address);
                    default:
                        if (address + 3 > maxAddress)
                            throw new Error("Reading outside local storage bounds");
                        return stack.readInt32(address);
                }
            }
            function loadIndirect(address) {
                switch (opcode.rule) {
                    case 1 /* Indirect8Bit */: return image.readByte(address);
                    case 2 /* Indirect16Bit */: return image.readInt16(address);
                    default: return image.readInt32(address);
                }
            }
            switch (type) {
                // immediates
                case 0 /* zero */:
                    operands.push(0);
                    return 0;
                case 1 /* byte */:
                    operands.push(int8(image.readByte(operandPos)));
                    return 1;
                case 2 /* int16 */:
                    operands.push(int16(image.readInt16(operandPos)));
                    return 2;
                case 3 /* int32 */:
                    operands.push(int32(image.readInt32(operandPos)));
                    return 4;
                // indirect
                case 5 /* ptr_8 */:
                    operands.push(loadIndirect(image.readByte(operandPos)));
                    return 1;
                case 6 /* ptr_16 */:
                    operands.push(loadIndirect(image.readInt16(operandPos)));
                    return 2;
                case 7 /* ptr_32 */:
                    operands.push(loadIndirect(image.readInt32(operandPos)));
                    return 4;
                // stack
                case 8 /* stack */:
                    if (this.SP <= this.FP + this.frameLen)
                        throw new Error("Stack underflow");
                    operands.push(this.pop());
                    return 0;
                // indirect from RAM
                case 13 /* ram_8 */:
                    operands.push(loadIndirect(image.getRamAddress(image.readByte(operandPos))));
                    return 1;
                case 14 /* ram_16 */:
                    operands.push(loadIndirect(image.getRamAddress(image.readInt16(operandPos))));
                    return 2;
                case 15 /* ram_32 */:
                    operands.push(loadIndirect(image.getRamAddress(image.readInt32(operandPos))));
                    return 4;
                // local storage
                case 9 /* local_8 */:
                    operands.push(loadLocal(image.readByte(operandPos)));
                    return 1;
                case 10 /* local_16 */:
                    operands.push(loadLocal(image.readInt16(operandPos)));
                    return 2;
                case 11 /* local_32 */:
                    operands.push(loadLocal(image.readInt32(operandPos)));
                    return 4;
                default: throw new Error("unsupported load operand type " + type);
            }
        };
        /**
         * @return how many extra bytes were read (so that operandPos can be advanced)
         */
        Engine.prototype.decodeStoreOperand = function (opcode, type, operands, operandPos) {
            switch (type) {
                case 0 /* discard */:
                case 8 /* stack */:
                    return 0;
                case 5 /* ptr_8 */:
                case 9 /* local_8 */:
                    operands.push(this.image.readByte(operandPos));
                    return 1;
                case 6 /* ptr_16 */:
                case 10 /* local_16 */:
                    operands.push(this.image.readInt16(operandPos));
                    return 2;
                case 7 /* ptr_32 */:
                case 11 /* local_32 */:
                    operands.push(this.image.readInt32(operandPos));
                    return 4;
                case 13 /* ram_8 */:
                    operands.push(this.image.getRamAddress(this.image.readByte(operandPos)));
                    return 1;
                case 14 /* ram_16 */:
                    operands.push(this.image.getRamAddress(this.image.readInt16(operandPos)));
                    return 2;
                case 15 /* ram_32 */:
                    operands.push(this.image.getRamAddress(this.image.readInt32(operandPos)));
                    return 4;
                default: throw new Error("unsupported store operand type " + type);
            }
        };
        /**
         * @return how many extra bytes were read (so that operandPos can be advanced)
         */
        Engine.prototype.decodeDelayedStoreOperand = function (opcode, type, operands, operandPos) {
            switch (type) {
                case 0 /* discard */:
                    operands.push(0 /* STORE_NULL */);
                    operands.push(0);
                    return 0;
                case 5 /* ptr_8 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.readByte(operandPos));
                    return 1;
                case 6 /* ptr_16 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.readInt16(operandPos));
                    return 2;
                case 7 /* ptr_32 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.readInt32(operandPos));
                    return 4;
                case 8 /* stack */:
                    operands.push(3 /* STORE_STACK */);
                    operands.push(0);
                    return 0;
                case 9 /* local_8 */:
                    operands.push(2 /* STORE_LOCAL */);
                    operands.push(this.image.readByte(operandPos));
                    return 1;
                case 10 /* local_16 */:
                    operands.push(2 /* STORE_LOCAL */);
                    operands.push(this.image.readInt16(operandPos));
                    return 2;
                case 11 /* local_32 */:
                    operands.push(2 /* STORE_LOCAL */);
                    operands.push(this.image.readInt32(operandPos));
                    return 4;
                case 13 /* ram_8 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.getRamAddress(this.image.readByte(operandPos)));
                    return 1;
                case 14 /* ram_16 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.getRamAddress(this.image.readInt16(operandPos)));
                    return 2;
                case 15 /* ram_32 */:
                    operands.push(1 /* STORE_MEM */);
                    operands.push(this.image.getRamAddress(this.image.readInt32(operandPos)));
                    return 4;
                default: throw new Error("unsupported delayed store operand type " + type);
            }
        };
        Engine.prototype.performDelayedStore = function (type, address, value) {
            switch (type) {
                case 0 /* STORE_NULL */: return;
                case 1 /* STORE_MEM */:
                    this.image.writeInt32(address, value);
                    return;
                case 2 /* STORE_LOCAL */:
                    this.stack.writeInt32(this.FP + this.localsPos + address, value);
                    return;
                case 3 /* STORE_STACK */:
                    this.push(value);
                    return;
                default: throw new Error("unsupported delayed store mode " + type);
            }
        };
        Engine.prototype.storeResults = function (rule, resultTypes, resultAddrs, results) {
            for (var i = 0; i < results.length; i++) {
                var value = results[i];
                var type = resultTypes[i];
                switch (type) {
                    case 0 /* discard */: return;
                    case 5:
                    case 6:
                    case 7:
                    case 13:
                    case 14:
                    case 15:
                        // write to memory
                        this.image.write(rule, resultAddrs[i], value);
                        break;
                    case 8 /* stack */:
                        // push onto stack
                        this.push(value);
                        break;
                    case 9 /* local_8 */:
                    case 10 /* local_16 */:
                    case 11 /* local_32 */:
                        // write to local storage
                        var address = resultAddrs[i] + this.FP + this.localsPos;
                        var limit = this.FP + this.frameLen;
                        switch (rule) {
                            case 1 /* Indirect8Bit */:
                                if (address >= limit)
                                    throw new Error("writing outside local storage bounds");
                                this.stack.writeByte(address, value);
                                break;
                            case 2 /* Indirect16Bit */:
                                if (address + 1 >= limit)
                                    throw new Error("writing outside local storage bounds");
                                this.stack.writeInt16(address, value);
                                break;
                            default:
                                if (address + 3 >= limit)
                                    throw new Error("writing outside local storage bounds");
                                this.stack.writeInt32(address, value);
                                break;
                        }
                        break;
                    default: throw new Error("unsupported store result mode " + type + " for result " + i + " of " + results);
                }
            }
        };
        Engine.prototype.leaveFunction = function (retVal) {
            if (this.FP === 0) {
                // top-level function
                this.running = false;
                return;
            }
            this.SP = this.FP;
            this.resumeFromCallStub(retVal);
        };
        Engine.prototype.resumeFromCallStub = function (result) {
            var stub = this.popCallStub();
            this.PC = stub.PC;
            this.execMode = 0 /* Code */;
            var newFP = stub.framePtr;
            var newFrameLen = this.stack.readInt32(newFP);
            var newLocalsPos = this.stack.readInt32(newFP + 4);
            switch (stub.destType) {
                case 0 /* STORE_NULL */: break;
                case 1 /* STORE_MEM */:
                    this.image.writeInt32(stub.destAddr, result);
                    break;
                case 2 /* STORE_LOCAL */:
                    this.stack.writeInt32(newFP + newLocalsPos + stub.destAddr, result);
                    break;
                case 3 /* STORE_STACK */:
                    this.push(result);
                    break;
                case 11 /* RESUME_FUNC */:
                    // resume executing in the same call frame
                    // return to avoid changing FP
                    return;
                case 13 /* RESUME_CSTR */:
                    // resume printing a C-string
                    this.execMode = 1 /* CString */;
                    break;
                case 14 /* RESUME_UNISTR */:
                    // resume printing a Unicode string
                    this.execMode = 3 /* UnicodeString */;
                    break;
                case 12 /* RESUME_NUMBER */:
                    // resume printing a decimal number
                    this.execMode = 4 /* Number */;
                    this.printingDigit = stub.destAddr;
                    break;
                case 10 /* RESUME_HUFFSTR */:
                    // resume printing a compressed string
                    this.execMode = 2 /* CompressedString */;
                    this.printingDigit = stub.destAddr;
                    break;
                // TODO: the other return modes
                default:
                    throw new Error("unsupported return mode " + stub.destType);
            }
            this.FP = newFP;
            this.frameLen = newFrameLen;
            this.localsPos = newLocalsPos;
        };
        Engine.prototype.takeBranch = function (jumpVector) {
            if (jumpVector === 0 || jumpVector === 1) {
                this.leaveFunction(jumpVector);
            }
            else {
                this.PC += jumpVector - 2;
            }
        };
        Engine.prototype.performCall = function (address, args, destType, destAddr, stubPC, tailCall) {
            if (tailCall === void 0) { tailCall = false; }
            // intercept veneer calls
            var veneer = this.veneer[address];
            if (veneer) {
                this.performDelayedStore(destType, destAddr, veneer.apply(this, args));
                return;
            }
            if (tailCall) {
                // pop the current frame and use the call stub below it
                this.SP = this.FP;
            }
            else {
                // use a new call stub
                this.pushCallStub(destType, destAddr, stubPC, this.FP);
            }
            var type = this.image.readByte(address);
            if (type === 192 /* stack */) {
                this.enterFunction(address);
                if (!args) {
                    this.push(0);
                }
                else {
                    for (var i = args.length - 1; i >= 0; i--)
                        this.push(args[i]);
                    this.push(args.length);
                }
            }
            else if (type === 193 /* localStorage */) {
                this.enterFunction.apply(this, [address].concat(args));
            }
            else {
                throw new Error("Invalid function call type " + type);
            }
        };
        Engine.prototype.streamCharCore = function (x) {
            this.streamUniCharCore(x & 0xFF);
        };
        Engine.prototype.streamUniCharCore = function (x) {
            if (this.outputSystem === 1 /* Filter */) {
                this.performCall(this.filterAddress, [x], 0 /* STORE_NULL */, 0, this.PC, false);
            }
            else {
                FyreVM.SendCharToOutput.call(this, x);
            }
        };
        Engine.prototype.streamNumCore = function (x) {
            x = x | 0;
            if (this.outputSystem === 1 /* Filter */) {
                this.pushCallStub(11 /* RESUME_FUNC */, 0, this.PC, this.FP);
                var num = x.toString();
                this.performCall(this.filterAddress, [num.charCodeAt(0)], 12 /* RESUME_NUMBER */, 1, x, false);
            }
            else {
                FyreVM.SendStringToOutput.call(this, x.toString());
            }
        };
        Engine.prototype.streamStrCore = function (address) {
            if (this.outputSystem == 0 /* Null */)
                return;
            var type = this.image.readByte(address);
            if (type === 0xE1 && !this.decodingTable)
                throw new Error("No string decoding table is set");
            // TODO: native decoding table
            // for now, just fall back to using ExecutionMode.CompressedString	  
            var fallbackEncoding = (type === 0xE1);
            if (this.outputSystem == 1 /* Filter */ || fallbackEncoding) {
                this.pushCallStub(11 /* RESUME_FUNC */, 0, this.PC, this.FP);
                switch (type) {
                    case 0xE0:
                        this.execMode = 1 /* CString */;
                        this.PC = address + 1;
                        return;
                    case 0xE1:
                        this.execMode = 2 /* CompressedString */;
                        this.PC = address + 1;
                        this.printingDigit = 0;
                        return;
                    case 0xE2:
                        this.execMode = 3 /* UnicodeString */;
                        this.PC = address + 4;
                        return;
                    default:
                        throw new Error("Invalid string type " + type + " at " + address);
                }
            }
            switch (type) {
                case 0xE0:
                    FyreVM.SendStringToOutput.call(this, this.image.readCString(address + 1));
                    return;
                default:
                    throw new Error("Invalid string type " + type + " at " + address);
            }
        };
        //  Sends the queued output to the OutputReady event handler.
        Engine.prototype.deliverOutput = function () {
            if (this.outputReady) {
                var pack = this.outputBuffer.flush();
                this.outputReady(pack);
            }
        };
        Engine.prototype.saveToQuetzal = function (destType, destAddr) {
            var quetzal = this.image.saveToQuetzal();
            // 'Stks' is the contents of the stack, with a stub on top
            // identifying the destination of the save opcode.
            this.pushCallStub(destType, destAddr, this.PC, this.FP);
            var trimmed = this.stack.copy(0, this.SP);
            quetzal.setChunk('Stks', trimmed.buffer);
            this.popCallStub();
            // 'MAll' is the list of heap blocks
            if (this.heap) {
                quetzal.setChunk('MAll', this.heap.save());
            }
            return quetzal;
        };
        Engine.prototype.loadFromQuetzal = function (quetzal) {
            // make sure the save file matches the game file
            var ifhd1 = new Uint8Array(quetzal.getIFhdChunk());
            if (ifhd1.byteLength !== 128) {
                throw new Error('Missing or invalid IFhd block');
            }
            var image = this.image;
            for (var i = 0; i < 128; i++) {
                if (ifhd1[i] !== image.readByte(i))
                    throw new Error("Saved game doesn't match this story file");
            }
            // load the stack
            var newStack = quetzal.getChunk("Stks");
            if (!newStack) {
                throw new Error("Missing Stks block");
            }
            this.stack.buffer.set(new Uint8Array(newStack));
            this.SP = newStack.byteLength;
            // restore RAM
            image.restoreFromQuetzal(quetzal);
            // pop a call stub to restore registers
            var stub = this.popCallStub();
            this.PC = stub.PC;
            this.FP = stub.framePtr;
            this.frameLen = this.stack.readInt32(this.FP);
            this.localsPos = this.stack.readInt32(this.FP + 4);
            this.execMode = 0 /* Code */;
            // restore the heap if available
            var heapChunk = quetzal.getChunk("MAll");
            if (heapChunk) {
                this.heap = FyreVM.HeapAllocator.restore(heapChunk, image['memory']);
            }
            // give the original save opcode a result of -1
            // to show that it's been restored
            this.performDelayedStore(stub.destType, stub.destAddr, 0xFFFFFFFF);
        };
        /**  Reloads the initial contents of memory (except the protected area)
        * and starts the game over from the top of the main function.
        */
        Engine.prototype.restart = function () {
            this.image.revert(this.protectionStart, this.protectionLength);
            this.bootstrap();
        };
        Engine.prototype.fyreCall = function (call, x, y) {
            if (!this.enableFyreVM)
                throw new Error("FyreVM functionality has been disabled");
            switch (call) {
                case 1 /* ReadLine */:
                    this.deliverOutput();
                    return this.inputLine(x, y);
                case 2 /* ReadKey */:
                    this.deliverOutput();
                    return this.inputChar();
                case 3 /* ToLower */:
                    return String.fromCharCode(uint8(x)).toLowerCase().charCodeAt(0);
                case 4 /* ToUpper */:
                    return String.fromCharCode(uint8(x)).toUpperCase().charCodeAt(0);
                case 5 /* Channel */:
                    x = toASCII(x);
                    this.outputBuffer.setChannel(x);
                    return;
                case 6 /* SetVeneer */:
                    return FyreVM.setSlotFyre.call(this, x, y) ? 1 : 0;
                case 8 /* SetStyle */:
                    // ignore
                    return 1;
                case 7 /* XMLFilter */:
                    // ignore
                    return 1;
                default:
                    throw new Error("Unrecognized FyreVM system call " + call + "(" + x + "," + y + ")");
            }
        };
        Engine.prototype.inputLine = function (address, bufSize) {
            // we need at least 4 bytes to do anything useful
            if (bufSize < 4) {
                console.warn("buffer size ${bufSize} to small to input line");
                return;
            }
            var image = this.image;
            var resume = this.resumeAfterWait.bind(this);
            // can't do anything without this event handler
            if (!this.lineWanted) {
                this.image.writeInt32(address, 0);
                return;
            }
            // ask the application to read a line
            var callback = function (line) {
                if (line && line.length) {
                    // TODO? handle Unicode
                    // write the length first
                    image.writeInt32(address, line.length);
                    // followed by the character data, truncated to fit the buffer
                    image.writeASCII(address + 4, line, bufSize - 4);
                }
                else {
                    image.writeInt32(address, 0);
                }
                resume();
            };
            this.lineWanted(callback);
            return 'wait';
        };
        Engine.prototype.inputChar = function () {
            // can't do anything without this event handler
            if (!this.keyWanted) {
                return 0;
            }
            var resume = this.resumeAfterWait.bind(this);
            // ask the application to read a character
            var callback = function (line) {
                if (line && line.length) {
                    resume([line.charCodeAt(0)]);
                }
                else {
                    resume([0]);
                }
            };
            this.keyWanted(callback);
            return 'wait';
        };
        Engine.prototype.resumeAfterWait = function (result) {
            this.cycle = 0;
            this.startTime = Date.now();
            if (result) {
                this.storeResults(null, this.resumeAfterWait_resultTypes, this.resumeAfterWait_resultAddrs, result);
                this.resumeAfterWait_resultAddrs = this.resumeAfterWait_resultTypes = null;
            }
            while (this.running) {
                if (this.step() === 'wait')
                    return;
            }
            // send any output that may be left
            this.deliverOutput();
        };
        return Engine;
    }());
    FyreVM.Engine = Engine;
})(FyreVM || (FyreVM = {}));
// Written in 2015 and 2016 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/**
 * A wrapper around Engine that can be communicates
 * via simple JSON-serializable messages.
 *
 */
/// <reference path='Engine.ts' />
var FyreVM;
(function (FyreVM) {
    var EngineWrapper = (function () {
        function EngineWrapper(gameImage, canSaveGames) {
            var _this = this;
            if (canSaveGames === void 0) { canSaveGames = false; }
            this.canSaveGames = canSaveGames;
            var engine = this.engine = new FyreVM.Engine(new FyreVM.UlxImage(gameImage));
            // set up the callbacks
            engine.outputReady =
                function (channelData) {
                    _this.channelData = channelData;
                };
            engine.keyWanted =
                function (cb) { return _this.waitState(cb, 52 /* waitingForKeyInput */); };
            engine.lineWanted =
                function (cb) { return _this.waitState(cb, 51 /* waitingForLineInput */); };
            engine.saveRequested =
                function (quetzal, cb) {
                    if (!_this.canSaveGames) {
                        return cb(false);
                    }
                    _this.waitState(cb, 53 /* waitingForGameSavedConfirmation */);
                    _this.gameBeingSaved = quetzal;
                };
            engine.loadRequested =
                function (cb) {
                    if (!_this.canSaveGames) {
                        return cb(null);
                    }
                    _this.waitState(cb, 54 /* waitingForLoadSaveGame */);
                };
        }
        /**
         * convenience method to construct from an ArrayBuffer
         */
        EngineWrapper.loadFromArrayBuffer = function (arrayBuffer, canSaveGames) {
            if (canSaveGames === void 0) { canSaveGames = false; }
            var image = new FyreVM.MemoryAccess(0, 0);
            image['buffer'] = new Uint8Array(arrayBuffer);
            image['maxSize'] = arrayBuffer.byteLength;
            return new EngineWrapper(image, canSaveGames);
        };
        /**
         * convenience method to construct from a FileReaderEvent
         * (which is supposed to have been successful)
         */
        EngineWrapper.loadFromFileReaderEvent = function (ev, canSaveGames) {
            if (canSaveGames === void 0) { canSaveGames = false; }
            return EngineWrapper.loadFromArrayBuffer(ev.target['result'], canSaveGames);
        };
        EngineWrapper.prototype.waitState = function (resumeCallback, state) {
            this.resumeCallback = resumeCallback;
            this.engineState = state;
        };
        EngineWrapper.prototype.run = function () {
            this.engineState = 2 /* running */;
            this.engine.run();
            return this.currentState();
        };
        EngineWrapper.prototype.currentState = function () {
            // check if the game is over
            if (this.engineState === 2 /* running */
                && !this.engine['running']) {
                this.engineState = 100 /* completed */;
            }
            switch (this.engineState) {
                case 100 /* completed */:
                case 52 /* waitingForKeyInput */:
                case 51 /* waitingForLineInput */:
                    return {
                        state: this.engineState,
                        channelData: this.channelData
                    };
                case 53 /* waitingForGameSavedConfirmation */:
                    return {
                        state: this.engineState,
                        gameBeingSaved: this.gameBeingSaved
                    };
                case 54 /* waitingForLoadSaveGame */:
                    return {
                        state: this.engineState
                    };
                default:
                    console.error("Unexpected engine state: " + this.engineState);
                    return {
                        state: this.engineState
                    };
            }
        };
        EngineWrapper.prototype.receiveLine = function (line) {
            if (this.engineState !== 51 /* waitingForLineInput */)
                throw new Error("Illegal state, engine is not waiting for line input");
            this.engineState = 2 /* running */;
            this.resumeCallback(line);
            return this.currentState();
        };
        EngineWrapper.prototype.receiveKey = function (line) {
            if (this.engineState !== 52 /* waitingForKeyInput */)
                throw new Error("Illegal state, engine is not waiting for key input");
            this.engineState = 2 /* running */;
            this.resumeCallback(line);
            return this.currentState();
        };
        EngineWrapper.prototype.receiveSavedGame = function (quetzal) {
            if (this.engineState !== 54 /* waitingForLoadSaveGame */)
                throw new Error("Illegal state, engine is not waiting for a saved game to be loaded");
            this.engineState = 2 /* running */;
            this.resumeCallback(quetzal);
            return this.currentState();
        };
        EngineWrapper.prototype.saveGameDone = function (success) {
            if (this.engineState !== 53 /* waitingForGameSavedConfirmation */)
                throw new Error("Illegal state, engine is not waiting for a game to be saved");
            this.gameBeingSaved = null;
            this.engineState = 2 /* running */;
            this.resumeCallback(success);
            return this.currentState();
        };
        EngineWrapper.prototype.getIFhd = function () {
            return this.engine['image']['memory'].copy(0, 128).buffer;
        };
        /**
         * convenience method to run "restore" and then
         * feed it the given savegame
         */
        EngineWrapper.prototype.restoreSaveGame = function (quetzal) {
            var state = this.receiveLine("restore");
            if (state.state !== 54 /* waitingForLoadSaveGame */)
                throw new Error("Illegal state, engine did not respond to RESTORE command");
            return this.receiveSavedGame(quetzal);
        };
        /**
         * convenience method to run "save"
         */
        EngineWrapper.prototype.saveGame = function () {
            var state = this.receiveLine("save");
            if (state.state !== 53 /* waitingForGameSavedConfirmation */)
                throw new Error("Illegal state, engine did not respond to SAVE command");
            var game = state.gameBeingSaved;
            this.saveGameDone(true);
            return game;
        };
        return EngineWrapper;
    }());
    FyreVM.EngineWrapper = EngineWrapper;
})(FyreVM || (FyreVM = {}));
/*

    node game2js {fyrevm story file.ux} {target js file}

    This will create a new file that loads a variable with the base64 encoded contents of the .ulx file.
    This file can be imported in the web page that will run the story.

    var FyreVM_StoryFileData = '...';
 */
/// <reference path='../../core/EngineWrapper.ts' />
/// <reference path='../../node/node-0.11.d.ts' />
/// <reference path='../../b64.ts' />
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match;
        });
    };
}
var fs = require('fs');
var imageFile = process.argv[2];
var outFile = process.argv[3];
var game = new FyreVM.MemoryAccess(0);
game.buffer = new Uint8Array(fs.readFileSync(imageFile));
game['maxSize'] = game.buffer.byteLength * 2;
console.info("Game Length: " + game.buffer.length);
var game64 = Base64.fromByteArray(game.buffer);
var template = "var FYREVM_StoryImageData=\"{0}\";".format(game64);
//console.info(template);
fs.writeFile(outFile, template);
