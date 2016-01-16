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
    })();
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
    })();
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
    })();
    FyreVM.MemoryAccess = MemoryAccess;
})(FyreVM || (FyreVM = {}));
