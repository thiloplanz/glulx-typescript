// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='MemoryAccess.ts' />
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
        return Quetzal;
    })();
    FyreVM.Quetzal = Quetzal;
})(FyreVM || (FyreVM = {}));
