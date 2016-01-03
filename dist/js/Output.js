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
    })();
    FyreVM.OutputBuffer = OutputBuffer;
})(FyreVM || (FyreVM = {}));
