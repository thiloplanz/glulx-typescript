// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/
/**
 * A wrapper around Engine that can be communicates
 * via simple JSON-serializable messages.
 *
 * All method calls designed to be used asynchronously,
 * with the EngineWrapperListener delegate receiving results.
 *
 */
/// <reference path='Engine.ts' />
var FyreVM;
(function (FyreVM) {
    var EngineWrapper = (function () {
        function EngineWrapper(del) {
            this.canSaveGames = false;
            this.delegate = del;
        }
        EngineWrapper.prototype.load = function (gameImage) {
            var image = new FyreVM.UlxImage(gameImage);
            var engine = this.engine = new FyreVM.Engine(image);
            engine.outputReady = this.fire.bind(this);
            engine.keyWanted = this.keyWanted.bind(this);
            engine.lineWanted = this.lineWanted.bind(this);
            engine.saveRequested = this.saveRequested.bind(this);
            engine.loadRequested = this.loadRequested.bind(this);
            this.engineState = 1 /* loaded */;
            this.fire();
        };
        EngineWrapper.prototype.run = function () {
            this.engineState = 2 /* running */;
            this.fire();
            this.engine.run();
        };
        EngineWrapper.prototype.fire = function (channelData) {
            this.delegate({ state: this.engineState, channelData: channelData });
        };
        EngineWrapper.prototype.lineWanted = function (callback) {
            this.engineState = 51 /* waitingForLineInput */;
            this.resumeCallback = callback;
            this.fire();
        };
        EngineWrapper.prototype.keyWanted = function (callback) {
            this.engineState = 52 /* waitingForKeyInput */;
            this.resumeCallback = callback;
            this.fire();
        };
        EngineWrapper.prototype.saveRequested = function (quetzal, callback) {
            if (this.canSaveGames) {
                this.gameBeingSaved = quetzal;
                this.engineState = 53 /* waitingForGameSavedConfirmation */;
                this.resumeCallback = callback;
                this.fire();
            }
            else {
                callback(false);
            }
        };
        EngineWrapper.prototype.loadRequested = function (callback) {
            if (this.canSaveGames) {
                this.engineState = 54 /* waitingForLoadSaveGame */;
                this.resumeCallback = callback;
                this.fire();
            }
            else {
                callback(null);
            }
        };
        EngineWrapper.prototype.receiveLine = function (line) {
            if (this.engineState !== 51 /* waitingForLineInput */)
                return;
            this.engineState = 2 /* running */;
            this.fire();
            this.resumeCallback(line);
        };
        EngineWrapper.prototype.receiveKey = function (line) {
            if (this.engineState !== 52 /* waitingForKeyInput */)
                return;
            this.engineState = 2 /* running */;
            this.fire();
            this.resumeCallback(line);
        };
        EngineWrapper.prototype.receiveSavedGame = function (quetzal) {
            if (this.engineState !== 54 /* waitingForLoadSaveGame */)
                return;
            this.engineState = 2 /* running */;
            this.fire();
            this.resumeCallback(quetzal);
        };
        EngineWrapper.prototype.saveGameDone = function (success) {
            if (this.engineState !== 53 /* waitingForGameSavedConfirmation */)
                return;
            this.gameBeingSaved = null;
            this.engineState = 2 /* running */;
            this.fire();
            this.resumeCallback(success);
        };
        EngineWrapper.prototype.getIFhd = function () {
            if (this.engine) {
                return this.engine['image']['memory'].copy(0, 128).buffer;
            }
            return null;
        };
        return EngineWrapper;
    })();
    FyreVM.EngineWrapper = EngineWrapper;
})(FyreVM || (FyreVM = {}));
