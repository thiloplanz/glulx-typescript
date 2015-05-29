## Glulx VM in TypeScript with Channel IO (work in progess)

Glulx is a specification for a 32-bit virtual machine that runs Inform 6 and [Inform 7 story files](http://inform7.com).

This project is an attempt to implement Glulx in TypeScript.

It is based heavily on the FyreVM (a C# implementation). In particular, it also makes use of the contextual Channel IO layer introduced in FyreVM.

-----

Right now, all you can do is run some unit tests for core engine functionality.

You need Node.js and nodeunit installed (as well as a TypeScript compiler).

Then you can compile everything in this project

    $ tsc --out test.js core/*.ts node/*.ts test/core/*.ts test/node/*.ts 
    $ nodeunit test.js 
   
   

