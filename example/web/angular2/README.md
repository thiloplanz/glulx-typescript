## Angular2 Demo Application

This is a demonstration of how to present an interactive fiction game in a web browser.

The UI is written using the Angular2 framework, the game engine is embedded into it using the Engine Wrapper interface.

### Setting up the build environment

The example includes a `package.json`, so `npm` should be able
to download everything you need.

    $ cd examples/web/angular2
    $ npm install
    
### Compile the game engine and the application
    
Then you can compile the game engine and the Angular2 application.

    $ npm run tsc 
    
Under the hood there are two compilation steps, first for the
Engine Wrapper, then for the Angular2 application, look at `package.json` for details.

    
### Go play!
   
You need to load it through a web server (even though all files are local, no Internet connection required). The easiest way to do that is to run it in developer mode

    $ npm start
    
    
    
