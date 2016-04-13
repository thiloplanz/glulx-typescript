// Written from 2015 to 2016 by Thilo Planz and Andrew Plotkin
// To the extent possible under law, I have dedicated all copyright and related and neighboring rights 
// to this software to the public domain worldwide. This software is distributed without any warranty. 
// http://creativecommons.org/publicdomain/zero/1.0/

/**
 * Provides hardcoded versions of some commonly used veneer routines (low-level
 *  functions that are automatically compiled into every Inform game).
 * Inform games rely heavily on these routines, and substituting our "native" versions
 * for the Glulx versions in the story file can increase performance significantly.   
 */

/// <reference path='Engine.ts' />

module FyreVM {
	
	    /// Identifies a veneer routine that is intercepted, or a constant that
        /// the replacement routine needs to use.
        export const enum VeneerSlot
        {
            // routine addresses
            Z__Region = 1,
            CP__Tab = 2,
            OC__Cl = 3,
            RA__Pr = 4,
            RT__ChLDW = 5,
            Unsigned__Compare = 6,
            RL__Pr = 7,
            RV__Pr = 8,
            OP__Pr = 9,
            RT__ChSTW = 10,
            RT__ChLDB = 11,
            Meta__class = 12,

            // object numbers and compiler constants
            String = 1001,
            Routine = 1002,
            Class = 1003,
            Object = 1004,
            RT__Err = 1005,
            NUM_ATTR_BYTES = 1006,
            classes_table = 1007,
            INDIV_PROP_START = 1008,
            cpv__start = 1009,
            ofclass_err = 1010,
            readprop_err = 1011,
        }
	
    
     // RAM addresses of compiler-generated global variables
     let SELF_OFFSET = 16;
     let SENDER_OFFSET = 20;
     
     // offsets of compiler-generated property numbers from INDIV_PROP_START
     let CALL_PROP = 5;
     let PRINT_PROP = 6;
     let PRINT_TO_ARRAY_PROP = 7;

          
    
     interface Veneer {
         string_mc : number,
         routine_mc : number,
         class_mc : number,
         object_mc : number,
         num_attr_bytes : number,
         classes_table: number,
         indiv_prop_start : number,
         cpv_start : number
       }
    
    /**
     * Registers a routine address or constant value, using the acceleration
     * codes defined in the Glulx specification.
     */
    
    export function setSlotGlulx(isParam: boolean, slot: number, value) : boolean {
       if (isParam && slot === 6){
           let image: UlxImage = this.image;
           if (value != image.getRamAddress(SELF_OFFSET)){
               throw new Error("Unexpected value for acceleration parameter 6");
           }
           return true;
       } 
       if (isParam){
           switch(slot){
               case 0: return setSlotFyre.call(this, VeneerSlot.classes_table, value);
               case 1: return setSlotFyre.call(this, VeneerSlot.INDIV_PROP_START, value);
               case 2: return setSlotFyre.call(this, VeneerSlot.Class, value);
               case 3: return setSlotFyre.call(this, VeneerSlot.Object, value);
               case 4: return setSlotFyre.call(this, VeneerSlot.Routine, value);
               case 5: return setSlotFyre.call(this, VeneerSlot.String, value);
               case 7: return setSlotFyre.call(this, VeneerSlot.NUM_ATTR_BYTES, value);
               case 8: return setSlotFyre.call(this, VeneerSlot.cpv__start, value);
               default: return false; 
           }
       }
       switch(slot){
               case 1: return setSlotFyre.call(this, VeneerSlot.Z__Region, value);
               case 2: return setSlotFyre.call(this, VeneerSlot.CP__Tab, value);
               case 3: return setSlotFyre.call(this, VeneerSlot.RA__Pr, value);
               case 4: return setSlotFyre.call(this, VeneerSlot.RL__Pr, value);
               case 5: return setSlotFyre.call(this, VeneerSlot.OC__Cl, value);
               case 6: return setSlotFyre.call(this, VeneerSlot.RV__Pr, value);
               case 7: return setSlotFyre.call(this, VeneerSlot.OP__Pr, value);
               default: return false; 
           
       }
    }
    
    
    /**
     *  Registers a routine address or constant value, using the traditional
     *  FyreVM slot codes.
     */
	
	 export function setSlotFyre(slot:VeneerSlot, value) : boolean{
		 let v : Veneer = this.veneer;
         switch(slot){
			 case VeneerSlot.Z__Region: this.veneer[value] = Z__Region; return true;
			 case VeneerSlot.CP__Tab: this.veneer[value] = CP__Tab; return true;
             case VeneerSlot.OC__Cl: this.veneer[value] = OC__Cl; return true;
             case VeneerSlot.RA__Pr: this.veneer[value] = RA__Pr; return true;
             case VeneerSlot.RT__ChLDW: this.veneer[value] = RT__ChLDW; return true;
             case VeneerSlot.Unsigned__Compare: this.veneer[value] = Unsigned__Compare; return true;
             case VeneerSlot.RL__Pr: this.veneer[value] = RL__Pr; return true;
             case VeneerSlot.RV__Pr: this.veneer[value] = RV__Pr; return true;
             case VeneerSlot.OP__Pr: this.veneer[value] = OP__Pr; return true;
             case VeneerSlot.RT__ChSTW: this.veneer[value] = RT__ChSTW; return true;
             case VeneerSlot.RT__ChLDB: this.veneer[value] = RT__ChLDB; return true;
             case VeneerSlot.Meta__class: this.veneer[value] = Meta__class; return true;
             
             case VeneerSlot.String: v.string_mc = value; return true;
             case VeneerSlot.Routine: v.routine_mc = value; return true;
             case VeneerSlot.Class: v.class_mc = value; return true;
             case VeneerSlot.Object: v.object_mc = value; return true;
             case VeneerSlot.NUM_ATTR_BYTES: v.num_attr_bytes = value; return true;
             case VeneerSlot.classes_table: v.classes_table = value; return true;
             case VeneerSlot.INDIV_PROP_START: v.indiv_prop_start = value; return true;
             case VeneerSlot.cpv__start: v.cpv_start = value; return true;
             
             // run-time error handlers are just ignored (we log an error message instead, like Quixe does, no NestedCall a la FyreVM)
             case VeneerSlot.RT__Err:
             case VeneerSlot.ofclass_err:
             case VeneerSlot.readprop_err:
                return true;
            
             default: 
             		console.warn(`ignoring veneer ${slot} ${value}`);
					return false;
				
		 }
	 }
	
     function Unsigned__Compare(a,b){
          a = a >>> 0;
          b = b >>> 0;
          if (a > b) return 1;
          if (a < b) return -1;
          return 0;
     }
    
	
	 // distinguishes between strings, routines, and objects
     function Z__Region(address:number) : number{
		 let image: UlxImage = this.image;
		 if (address < 36 || address >= image.getEndMem())
		 	return 0;
		
		 let type = image.readByte(address);
		 if (type >= 0xE0) return 3;
		 if (type >= 0xC0) return 2;
		 if (type >= 0x70 && type <= 0x7F && address >= image.getRamAddress(0)) return 1;
	 	 return 0;
	 }  
     
     
      // finds an object's common property table
        function CP__Tab(obj,id) : number
        {
            if (Z__Region.call(this, obj) != 1)
            {
                // error "handling" inspired by Quixe
                // instead of doing a NestedCall to the supplied error handler
                // just log an error message
                console.error("[** Programming error: tried to find the \".\" of (something) **]");
                return 0;
            }
            let image: UlxImage = this.image;
	
            let otab = image.readInt32(obj + 16);
            if (otab == 0)
                return 0;
            let max = image.readInt32(otab);
            otab += 4;
            // PerformBinarySearch
            return this.opcodes[0x151].handler.call(this, id, 2, otab, 10, max, 0, 0);
        }
     
     
      // finds the location of an object ("parent()" function)
      function Parent(obj){
         return this.image.readInt32(obj + 1 + this.veneer.num_attr_bytes + 12);
      }
     
     // determines whether an object is a member of a given class ("ofclass" operator)
      function OC__Cl(obj, cla)
        {
             let v : Veneer = this.veneer;
        
            switch (Z__Region.call(this, obj))
            {
                case 3:
                    return (cla === v.string_mc ? 1 : 0);
    
                case 2:
                    return (cla === v.routine_mc ? 1 : 0);
    
                case 1:
                    if (cla === v.class_mc)
                    {
                        if (Parent.call(this, obj) === v.class_mc)
                            return 1;
                        if (obj === v.class_mc || obj === v.string_mc ||
                            obj === v.routine_mc || obj === v.object_mc)
                            return 1;
                        return 0;
                    }
    
                    if (cla == this.veneer.object_mc)
                    {
                        if (Parent.call(this, obj) == v.class_mc)
                            return 0;
                        if (obj == v.class_mc || obj == v.string_mc ||
                            obj == v.routine_mc || obj == v.object_mc)
                            return 0;
                        return 1;
                    }
    
                    if (cla == v.string_mc || cla == v.routine_mc)
                        return 0;
    
                    if (Parent.call(this, cla) != v.class_mc)
                    {
                        console.error("[** Programming error: tried to apply 'ofclass' with non-class **]")   
                        return 0;
                    }
    
                    let image: UlxImage = this.image;
	
                    let inlist = RA__Pr.call(this, obj, 2);
                    if (inlist == 0)
                        return 0;
    
                    let inlistlen = RL__Pr.call(this, obj, 2) / 4;
                    for (let jx = 0; jx < inlistlen; jx++)
                        if (image.readInt32(inlist + jx * 4) === cla)
                            return 1;
    
                    return 0;
    
                default:
                    return 0;
            }
        }
     
     // finds the address of an object's property (".&" operator)
        function RA__Pr(obj, id) : number
        {
            let cla = 0;
             let image: UlxImage = this.image;
	
            if ((id & 0xFFFF0000) != 0)
            {
                cla = image.readInt32(this.veneer.classes_table + 4 * (id & 0xFFFF));
                if (OC__Cl.call(this, obj, cla) == 0)
                    return 0;

                id >>= 16;
                obj = cla;
            }

            let prop = CP__Tab.call(this, obj, id);
            if (prop == 0)
                return 0;

            if (Parent.call(this, obj) === this.veneer.class_mc && cla == 0)
                if (id < this.veneer.indiv_prop_start || id >= this.veneer.indiv_prop_start + 8)
                    return 0;

            if (image.readInt32(image.getRamAddress(SELF_OFFSET)) != obj)
            {
                let ix = (image.readByte(prop + 9) & 1);
                if (ix != 0)
                    return 0;
            }

            return image.readInt32(prop + 4);
        }

     
     // finds the length of an object's property (".#" operator)
            function RL__Pr(obj, id): number
            {
                let cla = 0;
                let image: UlxImage = this.image;
	
                if ((id & 0xFFFF0000) != 0)
                {
                    cla = image.readInt32(this.veneer.classes_table + 4 * (id & 0xFFFF));
                    if (OC__Cl.call(this, obj, cla) == 0)
                        return 0;

                    id >>= 16;
                    obj = cla;
                }

                let prop = CP__Tab.call(this, obj, id);
                if (prop == 0)
                    return 0;

                if (Parent.call(this, obj) == this.veneer.class_mc && cla == 0)
                    if (id < this.veneer.indiv_prop_start || id >= this.veneer.indiv_prop_start + 8)
                        return 0;

                if (image.readInt32(image.getRamAddress(SELF_OFFSET)) != obj)
                {
                    let ix = (image.readByte(prop + 9) & 1);
                    if (ix != 0)
                        return 0;
                }

                return 4 * image.readInt16(prop + 2);
            }
     
     
       // performs bounds checking when reading from a word array ("-->" operator)
        function RT__ChLDW(array, offset)
        {
            let address = array + 4 * offset;
            let image: UlxImage = this.image;
	
            if (address >= image.getEndMem())
            {
                console.error("[** Programming error: tried to read from word array beyond EndMem **]");
                return 0;
            }
            return image.readInt32(address);
        }


        // reads the value of an object's property ("." operator)
        function RV__Pr(obj, id)
        {
                
            let addr = RA__Pr.call(this, obj, id);
            let image: UlxImage = this.image;
	
            if (addr == 0)
            {
                let v : Veneer = this.veneer;
        
                if (id > 0 && id < v.indiv_prop_start)
                    return image.readInt32(v.cpv_start + 4 * id);

                console.error("[** Programming error: tried to read (something) **]");
                return 0;
            }

            return image.readInt32(addr);
        }

     
      // determines whether an object provides a given property ("provides" operator)
      function OP__Pr(obj, id)
            {
                let v : Veneer = this.veneer;
                switch (Z__Region.call(this, obj))
                {
                    case 3:
                        if (id == v.indiv_prop_start + PRINT_PROP ||
                            id == v.indiv_prop_start + PRINT_TO_ARRAY_PROP)
                            return 1;
                        else
                            return 0;

                    case 2:
                        if (id == v.indiv_prop_start + CALL_PROP)
                            return 1;
                        else
                            return 0;

                    case 1:
                        if (id >= v.indiv_prop_start && id < v.indiv_prop_start + 8)
                            if (Parent.call(this, obj) == v.class_mc)
                                return 1;

                        if (RA__Pr.call(this, obj, id) != 0)
                            return 1;
                        else
                            return 0;

                    default:
                        return 0;
                }
            }
     
      // performs bounds checking when writing to a word array ("-->" operator)
        function RT__ChSTW(array, offset, val)
        {
            let image: UlxImage = this.image;
	        let address = array + 4 * offset;
            if (address >= image.getEndMem() || address < image.getRamAddress(0))
            {
                console.error("[** Programming error: tried to write to word array outside of RAM **]");
                return 0;
            }
            else
            {
                image.writeInt32(address, val);
                return 0;
            }
        }
        
         // performs bounds checking when reading from a byte array ("->" operator)
        function RT__ChLDB(array, offset)
        {
            let address = array + offset;
            let image: UlxImage = this.image;
	       
            if (address >= image.getEndMem()){
                console.error("[** Programming error: tried to read from byte array beyond EndMem **]");
                return 0;
            }

            return image.readByte(address);
        }

     
      // determines the metaclass of a routine, string, or object ("metaclass()" function)
      function Meta__class(obj) : number
        {
            switch (Z__Region.call(this, obj))
            {
                case 2:
                    return this.veneer.routine_mc;
                case 3:
                    return this.veneer.string_mc;
                case 1:
                    if (Parent.call(this,obj) === this.veneer.class_mc)
                        return this.veneer.class_mc;
                    if (obj == this.veneer.class_mc || obj == this.veneer.string_mc ||
                        obj == this.veneer.routine_mc || obj == this.veneer.object_mc)
                        return this.veneer.class_mc;
                    return this.veneer.object_mc;
                default:
                    return 0;
            }
        }
    
	
	
	
}