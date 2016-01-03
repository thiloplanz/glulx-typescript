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
    })();
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
