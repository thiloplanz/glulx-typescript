// Written in 2015 and 2016 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/// <reference path="../engineWrapper/engineWrapper.d.ts" />

import { Component, NgZone } from 'angular2/core';

declare const WebAssembly: any

@Component({
	selector: 'my-app',
	templateUrl: 'app/app.html'
})
// Component controller
export class AppComponent {

	private engineWrapper: FyreVM.EngineWrapper = null;

	private channelData;

	private engineState: FyreVM.EngineState

	userInput = "";

	constructor(_ngZone: NgZone) {
		// TODO: find out how one is supposed to do this in Angular2
		window['handleKey'] = (ev) => _ngZone.run(() => this.handleKey(ev))
	}




	loadAndStart() {

		let file = document.getElementById('gameImage')['files'][0];
		let reader = new FileReader();
		reader.onload = (ev) => {

			const vmlib_support = {
				glk(selector, argc) {
					console.info(`GLK ${selector}`)
				}
			}

			WebAssembly
				.instantiate(ev.target['result'], { vmlib_support })
				.then(module => {
					this.engineWrapper = FyreVM.EngineWrapper.loadFromArrayBuffer(module.instance.exports.memory.buffer, true)
					this.process(this.engineWrapper.run());
				})
		}
		reader.readAsArrayBuffer(file);
	}

	process(result: FyreVM.EngineWrapperState) {
		if (result.channelData) {
			this.channelData = result.channelData;
		}
		this.engineState = result.state
		switch (result.state) {
			case FyreVM.EngineState.waitingForGameSavedConfirmation: {
				let key = `fyrevm_saved_game_${Base64.fromByteArray(result.gameBeingSaved.getIFhdChunk())}`
				let q = result.gameBeingSaved.base64Encode()
				localStorage[key] = q
				this.process(this.engineWrapper.saveGameDone(true))
			}
				break;
			case FyreVM.EngineState.waitingForLoadSaveGame: {
				let key = `fyrevm_saved_game_${Base64.fromByteArray(this.engineWrapper.getIFhd())}`
				let q = localStorage[key]
				if (q) {
					q = FyreVM.Quetzal.base64Decode(q)
				}
				this.process(this.engineWrapper.receiveSavedGame(q))
			}
				break;
		}
	}

	getChannel(name: string) {
		let c = this.channelData
		if (!c) return null
		return this.channelData[name]
	}

	sendLine(line: string) {
		this.process(this.engineWrapper.receiveLine(line))
	}

	sendKey(key: string) {
		this.process(this.engineWrapper.receiveKey(key))
	}

	handleKey($event: KeyboardEvent) {
		$event.preventDefault();
		$event.stopPropagation();
		if ($event.type === 'keyup') {
			let state = this.engineState;
			if (state === FyreVM.EngineState.waitingForLineInput) {
				let key = getKey($event);
				if (key === null)
					return;
				if (key.length === 1) {
					this.userInput += key;
					return;
				}
				switch (key) {
					case 'Backspace':
						let l = this.userInput.length;
						if (l) {
							this.userInput = this.userInput.substr(0, l - 1);
						}
						return;
					case 'Enter':
						this.sendLine(this.userInput);
						this.userInput = '';
						return;
				}
			}
			if (state === FyreVM.EngineState.waitingForKeyInput) {
				let key = getKey($event);
				if (key === null)
					return;
				if (key.length === 1) {
					this.sendKey(key);
					return;
				}
				if (key === 'Enter') {
					this.sendKey('\n');
					return;
				}
			}
		}
	}


	get prompt() {
		let state = this.engineState;
		if (state === FyreVM.EngineState.waitingForLineInput)
			return (this.getChannel('PRPT') || '>') + this.userInput;
		if (state === FyreVM.EngineState.waitingForKeyInput)
			return '...';
		return '';
	}


	get time() {
		let x = parseInt(this.getChannel('TIME'));
		let hours = printf02d(Math.floor(x / 100));
		let mins = printf02d(x % 100);
		return `${hours}:${mins}`;
	}

}


function getKey($event: KeyboardEvent): string {
	// this is the standard way, but not implemented on all browsers
	let key = $event.key;
	if (key) return key;
	// use the deprecated "keyCode" as a fallback	
	let code = $event.keyCode;
	if (code >= 31 && code < 127) {
		key = String.fromCharCode(code);
		if ($event.shiftKey) return key.toUpperCase();
		return key.toLowerCase();
	}
	if (code === 8) return 'Backspace';
	if (code === 13) return 'Enter';
	return null;
}


function printf02d(x: number): string {
	if (x < 10)
		return `0${x}`;
	return "" + x;
}

// http://jsperf.com/tobase64-implementations/10
// http://stackoverflow.com/a/9458996/14955
function base64(data) {
	if (!data) return null;
	var bytes = new Uint8Array(data);
	var len = bytes.byteLength;
	var chArray = new Array(len);
	for (var i = 0; i < len; i++) {
		chArray[i] = String.fromCharCode(bytes[i]);
	}
	return btoa(chArray.join(""));
}		