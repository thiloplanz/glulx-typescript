// Written in 2015 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/


/// <reference path='Opcodes.ts' />


module FyreVM {
	
	// build a map of all opcodes by name
	let opcodes = (function(oc){
		let map = {};
		for (let c in oc){
			let op = oc[c];
			map[op.name] = op;
		}	
		return map;	
	})(Opcodes.initOpcodes());
	
	
	// coerce Javascript number into uint32 range
	function uint32(x:number) : number{
		return x >>> 0;
	}
	function uint16(x: number) :number{
		if (x < 0){
			x = 0xFFFF + x + 1;
		}
		return x % 0x10000;
	}
	function uint8(x: number) :number{
		if (x < 0){
			x = 255 + x + 1;
		}
		return x % 256;
	}
	
	function parseHex(x: string): number {
		let n= new Number(`0x${x}`).valueOf();
		if (isNaN(n)){
			throw new Error(`invalid hex number ${x}`);
		}
		return n;
	}
	function parsePtr(x: string, params: any[], i: number, sig: number[]){
		if (x.indexOf("R:") === 1){
			// *R:00
			if (x.length == 5){
				sig.push(LoadOperandType.ram_8);
				params[i] = parseHex(x.substring(3));
				return;
			}
			// *R:1234
			if (x.length == 7){
				sig.push(LoadOperandType.ram_16);
				params[i] = parseHex(x.substring(3));
				return;
			}
			// *R:12345678
			if (x.length == 11){
				sig.push(LoadOperandType.ram_32);
				params[i] = parseHex(x.substring(3));
				return;
			}
		}
		
		// *1234
		if (x.length == 5){
			sig.push(LoadOperandType.ptr_16);
			params[i] = parseHex(x.substring(1));
			return;
		}
		// *00112233
		if (x.length == 9){
			sig.push(LoadOperandType.ptr_32);
			params[i] = parseHex(x.substring(1));
			return;
		}
		throw new Error(`unsupported address specification ${x}`);
	}
	function parseLocal(x: string, params: any[], i: number, sig: number[]){
		// Fr:00
		if (x.length == 5){
			sig.push(LoadOperandType.local_8);
			params[i] = parseHex(x.substring(3));
			return;
		}	
		throw new Error(`unsupported local frame address specification ${x}`);
	}
		
	/**
	 * encode an opcode and its parameters 
	 */
	export function encodeOpcode(name: string, ... params: any[]) : number[]{
		let opcode : Opcode = opcodes[name];
		if (!opcode){
			throw new Error(`unknown opcode ${name}`);
		}		
		
		let {loadArgs, storeArgs, code} = opcode;
		if (params.length != loadArgs + storeArgs){
			throw new Error(`opcode '${name}' requires ${loadArgs+storeArgs} arguments, but you gave me ${params.length}: ${JSON.stringify(params)}`);
		}
		
		// opcode
		let result;
		if (code >= 0x1000){
			result = [ 0xC0, 0x00, code >> 8, code & 0xFF];
		}
		else if (code >= 0x80){
			code = code + 0x8000;
			result = [ code >> 8, code & 0xFF];
		}
		else {
			result = [ code ];
		}
			
		// loadArgs signature
		let sig = [];
		let i = 0;
		for(;i<loadArgs; i++){
			let x = params[i];
			if (typeof(x) === 'number'){
				if (x === 0){
					sig.push(LoadOperandType.zero);
					continue;
				}
				if (-128 <= x  && x <= 127){
					sig.push(LoadOperandType.byte);
					continue;
				}
				if (- 0x10000 <= x  && x <= 0xFFFF){
					sig.push(LoadOperandType.int16);
					continue;
				}
				if (x > 0xFFFFFFFF || x < - 0x100000000){
					throw new Error(`immediate load operand ${x} out of signed 32 bit integer range.`);
				}
				sig.push(LoadOperandType.int32);
				continue;
			}
			if (typeof(x) === 'string'){
				if (x === 'pop'){
					sig.push(LoadOperandType.stack);
					continue;
				}
				if (x.indexOf("*") === 0){
					parsePtr(x, params, i, sig);
					continue;
				}
				if (x.indexOf("Fr:") === 0){
					parseLocal(x, params, i, sig);
					continue;
				}
			}
			throw new Error(`unsupported load argument ${x} for ${name}(${JSON.stringify(params)})`);
		}
		// storeArg signature
		if (storeArgs){
			for (; i<loadArgs+storeArgs; i++){
				let x = params[i];
				if (x === null || x === StoreOperandType.discard){
					sig.push(StoreOperandType.discard);
					continue;
				}
				if (typeof(x) === 'number'){
					if (x <= 0xFFFF){
						sig.push(StoreOperandType.ptr_16);
						continue;
					}
				}
				if (typeof(x) === 'string'){
					if (x === 'push'){
						sig.push(StoreOperandType.stack);
						continue;
					}
					if (x.indexOf("*") === 0){
						parsePtr(x, params, i, sig);
						continue;
					}
					if (x.indexOf("Fr:") === 0){
						parseLocal(x, params, i, sig);
						continue;
					}
					
				}
				throw new Error(`unsupported store argument ${x} for ${name}(${JSON.stringify(params)})`)
			}
		}
		// signature padding
		if (i%2){
			sig.push(0);
		}
		
		for (let j=0; j<sig.length; j+=2){
			result.push(sig[j] + (sig[j+1] << 4));
		}
		
		for (let j=0; j<i; j++){
			let s = sig[j];
			if (s === LoadOperandType.zero) continue;
			if (s === LoadOperandType.stack) continue;
			let x = params[j];
			if (s === LoadOperandType.byte){
				result.push(uint8(x));
				continue;
			}
			if (s === LoadOperandType.int16){
				x = uint16(x);
				result.push(x >> 8);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.int32){
				x = uint32(x);
				result.push(x >> 24);
				result.push((x >> 16) & 0xFF);
				result.push((x >> 8) & 0xFF);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.ptr_8 || s === LoadOperandType.ram_8 || s === LoadOperandType.local_8){
				result.push(x);
				continue;
			}
			if (s === LoadOperandType.ptr_16 || s === LoadOperandType.ram_16){
				result.push(x >> 8);
				result.push(x & 0xFF);
				continue;
			}
			if (s === LoadOperandType.ptr_32 || s === LoadOperandType.ram_32){
				result.push(x >> 24);
				result.push((x >> 16) & 0xFF);
				result.push((x >> 8) & 0xFF);
				result.push(x & 0xFF);
				continue;
			}
			throw new Error(`unsupported argument ${x} of type ${s} for ${name}(${JSON.stringify(params)})`)
	
		}
		
		return result;
	}
	
}