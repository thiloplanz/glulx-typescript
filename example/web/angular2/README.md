## Angular2 Demo Application

This is a demonstration of how to present an interactive fiction game in a web browser.

The UI is written using the Angular2 framework, the [game engine is running as a Web Worker](../../../web/WebWorker.md) (the exact same code as in the minimal HTML example).

### Setting up the build environment

You need to install the TypeScript bindings for Angular2. This can be done via the `tsd` tool.

    $ npm install -g tsd
    $ cd examples/web/angular2
    $ tsd install angular2 -v 2.0.0-alpha.28 --resolve
    
### Compile the game engine and the application
    
Then you can compile the Web Worker with the game engine

    $ tsc -d --out ../webworker.js ../../../web/WebWorker.ts 
    
and the Angular2 application

    $ tsc
    
### Go play!
   
You need to load it through a web server (even though all files are local, no Internet connection required). The easiest way to do that is to `npm install -g http-server` and use that to serve the page:

    $ http-server ..
    $ open http://127.0.0.1:8080/angular2/  
    
    
    
