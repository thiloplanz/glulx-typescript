// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='Opcodes.ts' />
var FyreVM;
(function (FyreVM) {
    // build a map of all opcodes by name
    var opcodes = (function (oc) {
        var map = {};
        for (var c in oc) {
            var op = oc[c];
            map[op.name] = op;
        }
        return map;
    })(FyreVM.Opcodes.initOpcodes());
    // coerce Javascript number into uint32 range
    function uint32(x) {
        return x >>> 0;
    }
    function uint16(x) {
        if (x < 0) {
            x = 0xFFFF + x + 1;
        }
        return x % 0x10000;
    }
    function uint8(x) {
        if (x < 0) {
            x = 255 + x + 1;
        }
        return x % 256;
    }
    function parseHex(x) {
        var n = new Number("0x" + x).valueOf();
        if (isNaN(n)) {
            throw new Error("invalid hex number " + x);
        }
        return n;
    }
    function parsePtr(x, params, i, sig) {
        if (x.indexOf("R:") === 1) {
            // *R:00
            if (x.length == 5) {
                sig.push(13 /* ram_8 */);
                params[i] = parseHex(x.substring(3));
                return;
            }
            // *R:1234
            if (x.length == 7) {
                sig.push(14 /* ram_16 */);
                params[i] = parseHex(x.substring(3));
                return;
            }
            // *R:12345678
            if (x.length == 11) {
                sig.push(15 /* ram_32 */);
                params[i] = parseHex(x.substring(3));
                return;
            }
        }
        // *1234
        if (x.length == 5) {
            sig.push(6 /* ptr_16 */);
            params[i] = parseHex(x.substring(1));
            return;
        }
        // *00112233
        if (x.length == 9) {
            sig.push(7 /* ptr_32 */);
            params[i] = parseHex(x.substring(1));
            return;
        }
        throw new Error("unsupported address specification " + x);
    }
    function parseLocal(x, params, i, sig) {
        // Fr:00
        if (x.length == 5) {
            sig.push(9 /* local_8 */);
            params[i] = parseHex(x.substring(3));
            return;
        }
        throw new Error("unsupported local frame address specification " + x);
    }
    /**
     * encode an opcode and its parameters
     */
    function encodeOpcode(name) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        var opcode = opcodes[name];
        if (!opcode) {
            throw new Error("unknown opcode " + name);
        }
        var loadArgs = opcode.loadArgs, storeArgs = opcode.storeArgs, code = opcode.code;
        if (params.length != loadArgs + storeArgs) {
            throw new Error("opcode '" + name + "' requires " + (loadArgs + storeArgs) + " arguments, but you gave me " + params.length + ": " + JSON.stringify(params));
        }
        // opcode
        var result;
        if (code >= 0x1000) {
            result = [0xC0, 0x00, code >> 8, code & 0xFF];
        }
        else if (code >= 0x80) {
            code = code + 0x8000;
            result = [code >> 8, code & 0xFF];
        }
        else {
            result = [code];
        }
        // loadArgs signature
        var sig = [];
        var i = 0;
        for (; i < loadArgs; i++) {
            var x = params[i];
            if (typeof (x) === 'number') {
                if (x === 0) {
                    sig.push(0 /* zero */);
                    continue;
                }
                if (-128 <= x && x <= 127) {
                    sig.push(1 /* byte */);
                    continue;
                }
                if (-0x10000 <= x && x <= 0xFFFF) {
                    sig.push(2 /* int16 */);
                    continue;
                }
                if (x > 0xFFFFFFFF || x < -0x100000000) {
                    throw new Error("immediate load operand " + x + " out of signed 32 bit integer range.");
                }
                sig.push(3 /* int32 */);
                continue;
            }
            if (typeof (x) === 'string') {
                if (x === 'pop') {
                    sig.push(8 /* stack */);
                    continue;
                }
                if (x.indexOf("*") === 0) {
                    parsePtr(x, params, i, sig);
                    continue;
                }
                if (x.indexOf("Fr:") === 0) {
                    parseLocal(x, params, i, sig);
                    continue;
                }
            }
            throw new Error("unsupported load argument " + x + " for " + name + "(" + JSON.stringify(params) + ")");
        }
        // storeArg signature
        if (storeArgs) {
            for (; i < loadArgs + storeArgs; i++) {
                var x = params[i];
                if (x === null || x === 0 /* discard */) {
                    sig.push(0 /* discard */);
                    continue;
                }
                if (typeof (x) === 'number') {
                    if (x <= 0xFFFF) {
                        sig.push(6 /* ptr_16 */);
                        continue;
                    }
                }
                if (typeof (x) === 'string') {
                    if (x === 'push') {
                        sig.push(8 /* stack */);
                        continue;
                    }
                    if (x.indexOf("*") === 0) {
                        parsePtr(x, params, i, sig);
                        continue;
                    }
                    if (x.indexOf("Fr:") === 0) {
                        parseLocal(x, params, i, sig);
                        continue;
                    }
                }
                throw new Error("unsupported store argument " + x + " for " + name + "(" + JSON.stringify(params) + ")");
            }
        }
        // signature padding
        if (i % 2) {
            sig.push(0);
        }
        for (var j = 0; j < sig.length; j += 2) {
            result.push(sig[j] + (sig[j + 1] << 4));
        }
        for (var j = 0; j < i; j++) {
            var s = sig[j];
            if (s === 0 /* zero */)
                continue;
            if (s === 8 /* stack */)
                continue;
            var x = params[j];
            if (s === 1 /* byte */) {
                result.push(uint8(x));
                continue;
            }
            if (s === 2 /* int16 */) {
                x = uint16(x);
                result.push(x >> 8);
                result.push(x & 0xFF);
                continue;
            }
            if (s === 3 /* int32 */) {
                x = uint32(x);
                result.push(x >> 24);
                result.push((x >> 16) & 0xFF);
                result.push((x >> 8) & 0xFF);
                result.push(x & 0xFF);
                continue;
            }
            if (s === 5 /* ptr_8 */ || s === 13 /* ram_8 */ || s === 9 /* local_8 */) {
                result.push(x);
                continue;
            }
            if (s === 6 /* ptr_16 */ || s === 14 /* ram_16 */) {
                result.push(x >> 8);
                result.push(x & 0xFF);
                continue;
            }
            if (s === 7 /* ptr_32 */ || s === 15 /* ram_32 */) {
                result.push(x >> 24);
                result.push((x >> 16) & 0xFF);
                result.push((x >> 8) & 0xFF);
                result.push(x & 0xFF);
                continue;
            }
            throw new Error("unsupported argument " + x + " of type " + s + " for " + name + "(" + JSON.stringify(params) + ")");
        }
        return result;
    }
    FyreVM.encodeOpcode = encodeOpcode;
})(FyreVM || (FyreVM = {}));
