// Written in 2015 by Thilo Planz and Andrew Plotkin
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
                return true;
            }
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
