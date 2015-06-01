// Written in 2015 by Thilo Planz 
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

module FyreVM {
	
	/**
	 * an OpcodeHandler takes any number of arguments (all numbers)
	 * and returns nothing, or a number, or multiple numbers
	 */
	interface OpcodeHandler{
		(...any:number[]) : void | number | number[]
	}
	
	export class Opcode {
		code: number;
		name: string;
		loadArgs: number;
		storeArgs: number;
		handler:OpcodeHandler;
		constructor(code: number, name: string, loadArgs: number, storeArgs: number, handler:OpcodeHandler){
			this.code = code;
			this.name = name;
			this.loadArgs = loadArgs;
			this.storeArgs = storeArgs;
			this.handler = handler;
		}
	}
	
	
	export module Opcodes{
		export function initOpcodes(){
			let opcodes: Opcode[] = [];
			
			function opcode(code: number, name: string, loadArgs: number, storeArgs: number, handler:OpcodeHandler){
				opcodes[code] = new Opcode(code, name, loadArgs, storeArgs, handler);
			}
			
			opcode(0x00, 'nop', 0, 0, 
				function(){ });
			
		
			opcode(0x10, 'add', 2, 1,
				function(a,b){ return a+b});				
		
			return opcodes;
		}
	}
}