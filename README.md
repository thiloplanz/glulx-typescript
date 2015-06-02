## Glulx VM in TypeScript with Channel IO (work in progess)

[Glulx](http://en.wikipedia.org/wiki/Glulx) is a specification for a 32-bit virtual machine that runs Inform 6 and [Inform 7 story files](http://inform7.com).

This project is an attempt to implement Glulx in TypeScript.

It is based heavily on the [FyreVM](https://github.com/ChicagoDave/FyreVM) (a C# implementation). In particular, it also makes use of the contextual Channel IO layer introduced in FyreVM.

-----

Right now, all you can do is run some unit tests for core engine functionality.

You need Node.js and nodeunit installed (as well as a TypeScript 1.5 compiler).

Then you can compile everything in this project and run the test suite:

    $ tsc  
    $ nodeunit test.js 
   
Note that no command line arguments are required for `tsc`. All compiler configuration is contained in [tsconfig.json](tsconfig.json). If you are actively editing the files, you may want to add a `-w` ("watch") flag to the command, though, to have it recompile when the files are updated.


