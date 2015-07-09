## Glulx VM in TypeScript with Channel IO (work in progess)

[Glulx](http://en.wikipedia.org/wiki/Glulx) is a specification for a 32-bit virtual machine that runs Inform 6 and [Inform 7 story files](http://inform7.com).

This project is an attempt to implement Glulx in TypeScript.

It is based heavily on the [FyreVM](https://github.com/ChicagoDave/FyreVM) (a C# implementation). In particular, it also makes use of the contextual Channel IO layer introduced in FyreVM.

### Playing a game image

If you have a Glulx game image (a .ulx file), you can try if it works... this is all still very much under construction, games that target FyreVM work best, Inform6-compiled Glulx games seem to work okay, Inform7 not so much.

#### in your terminal

You can compile a simple Node.js and readline based command line tool.

    $ cd examples/node
    $ tsc
    $ node runGameImage.js yourGameImageFile.ulx
    
 Note that no command line arguments are required for `tsc`. All compiler configuration is contained in [tsconfig.json](tsconfig.json). If you are actively editing the files, you may want to add a `-w` ("watch") flag to the command, though, to have it recompile when the files are updated.   

#### in your browser

There is a simple HTML page that can load and run a game image. You need to load it through a web server (even though all files are local, no Internet connection required). The easiest way to do that is to `npm install -g http-server` and use that to serve the page:

    $ cd examples/web
    $ tsc
    $ http-server
    $ open http://0.0.0.0:8080/webworker.html
    
Select a game image (ULX file) from your local file system to press START. 


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
 