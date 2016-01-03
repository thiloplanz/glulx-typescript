// Written in 2015 by Thilo Planz and Andrew Plotkin
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
    })();
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
            return operandPos;
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
            return operandPos;
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
            var ifhd1 = new Uint8Array(quetzal.getChunk('IFhd'));
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
    })();
    FyreVM.Engine = Engine;
})(FyreVM || (FyreVM = {}));
