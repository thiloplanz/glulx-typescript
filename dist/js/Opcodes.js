// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/// <reference path='mersenne-twister.ts' />
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
    })();
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
                    var resume = this.resumeAfterWait.bind(this);
                    var callback = function (success) {
                        if (success) {
                            engine['performDelayedStore'](destType, destAddr, 0);
                        }
                        else {
                            engine['performDelayedStore'](destType, destAddr, 1);
                        }
                        resume();
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
                    var resume = this.resumeAfterWait.bind(this);
                    var callback = function (quetzal) {
                        if (quetzal) {
                            engine.loadFromQuetzal(quetzal);
                            resume();
                            return;
                        }
                        engine['performDelayedStore'](destType, destAddr, 1);
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
