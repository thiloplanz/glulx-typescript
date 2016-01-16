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
                var length_1 = r.readInt32(0);
                this.setEndMem(length_1 + this.ramstart);
                var i = 4;
                var j = this.ramstart;
                while (i < newRam.byteLength) {
                    this.memory.writeByte(j++, r.readByte(i++));
                }
                if (prot) {
                    var d = [];
                    for (var i_1 = 0; i_1 < protectionLength; i_1++) {
                        d.push(prot.readByte(i_1));
                    }
                    this.writeBytes.apply(this, [protectionStart].concat(d));
                }
            }
            else {
                throw new Error("Missing CMem/UMem blocks");
            }
        };
        return UlxImage;
    })();
    FyreVM.UlxImage = UlxImage;
})(FyreVM || (FyreVM = {}));
