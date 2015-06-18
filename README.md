## Glulx VM in TypeScript with Channel IO (work in progess)

[Glulx](http://en.wikipedia.org/wiki/Glulx) is a specification for a 32-bit virtual machine that runs Inform 6 and [Inform 7 story files](http://inform7.com).

This project is an attempt to implement Glulx in TypeScript.

It is based heavily on the [FyreVM](https://github.com/ChicagoDave/FyreVM) (a C# implementation). In particular, it also makes use of the contextual Channel IO layer introduced in FyreVM.

### Playing a game image

If you have a GLULX game image (a .ulx file), you can compile a simple Node.js and readline based command line tool and use that to play the game (if it works... this is all still very much under construction, games that target FyreVM work best, Inform6-compiled Glulx games seem to work okay, Inform7 not so much).

    $ cd examples/node
    $ tsc
    $ node runGameImage.js yourGameImageFile.ulx
    
 Note that no command line arguments are required for `tsc`. All compiler configuration is contained in [tsconfig.json](tsconfig.json). If you are actively editing the files, you may want to add a `-w` ("watch") flag to the command, though, to have it recompile when the files are updated.   

### Running unit tests


There are some unit tests for core engine functionality that you can run on Node.js or in a browser.

#### using nodeunit

You need Node.js and nodeunit installed (as well as a TypeScript 1.5 compiler).

Then you can compile everything in this project and run the test suite:

    $ cd test/node
    $ tsc  
    $ nodeunit tests.js 
   

#### in the browser


You can also run the same unit tests in your browser instead of on Node.js:

    $ cd test/web
    $ tsc
    $ open test.html
 