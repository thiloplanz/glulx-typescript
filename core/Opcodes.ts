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
				
			opcode(0x11, 'sub', 2, 1,
				function(a,b){ return a-b});				
		
			opcode(0x12, 'mul', 2, 1,
				function(a,b){ return a*b});
		
			opcode(0x13, 'div', 2, 1,
				function(a,b){ return Math.floor(a / b)});
		
			opcode(0x14, 'mod', 2, 1,
				function(a,b){ return a % b});
	
			// TODO: check the specs
			opcode(0x15, 'neg', 1, 1,
				function(x){ return 0xFFFFFFFF - x });
	
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x18, 'bitand', 2, 1,
				function(a,b){ return a & b});
		
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x19, 'bitor', 2, 1,
				function(a,b){ return a | b});
		
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x1A, 'bitxor', 2, 1,
				function(a,b){ return a ^ b});
			
			// TODO: check if it works, JS has signed ints, we want uint	
			opcode(0x1B, 'bitnot', 1, 1,
				function(x){ x = ~x; if (x<0) return 1 + x + 0xFFFFFFFF; return x; });
	
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x1C, 'shiftl', 2, 1,
				function(a,b){ 
					if (b >= 32) return 0;
					return a << b});

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x1D, 'sshiftr', 2, 1,
				function(a,b){ 
					if (b >= 32) return (a & 0x80000000) ? 0 : 0xFFFFFFFF;
					return a >> b});
			
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x1E, 'ushiftr', 2, 1,
				function(a,b){ 
					if (b >= 32) return 0;
					return a >> b});
					
					
			opcode(0x20, 'jump', 1, 0, 
				function(jumpVector){
					this.takeBranch(jumpVector);
				}
			);
			
			opcode(0x022, 'jz', 2, 0, 
				function(condition, jumpVector){
					if (condition === 0)
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x023, 'jnz', 2, 0, 
				function(condition, jumpVector){
					if (condition !== 0)
						this.takeBranch(jumpVector);
				}
			);


			opcode(0x024, 'jeq', 3, 0, 
				function(a, b, jumpVector){
					if (a === b)
						this.takeBranch(jumpVector);
				}
			);

			opcode(0x025, 'jne', 3, 0, 
				function(a, b, jumpVector){
					if (a !== b)
						this.takeBranch(jumpVector);
				}
			);
			
			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x026, 'jlt', 3, 0, 
				function(a, b, jumpVector){
					if (a < b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x027, 'jge', 3, 0, 
				function(a, b, jumpVector){
					if (a >= b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x028, 'jgt', 3, 0, 
				function(a, b, jumpVector){
					if (a > b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x029, 'jle', 3, 0, 
				function(a, b, jumpVector){
					if (a <= b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02A, 'jltu', 3, 0, 
				function(a, b, jumpVector){
					if (a < b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02B, 'jgeu', 3, 0, 
				function(a, b, jumpVector){
					if (a >= b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02C, 'jgtu', 3, 0, 
				function(a, b, jumpVector){
					if (a > b)
						this.takeBranch(jumpVector);
				}
			);

			// TODO: check if it works, JS has signed ints, we want uint
			opcode(0x02D, 'jleu', 3, 0, 
				function(a, b, jumpVector){
					if (a <= b)
						this.takeBranch(jumpVector);
				}
			);

			
			opcode(0x0104, 'jumpabs', 1, 0, 
				function(address){
					this.PC = address;
				}
			);
			
			

		
			return opcodes;
		}
	}
}