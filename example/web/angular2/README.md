## Angular2 Demo Application

This is a demonstration of how to present an interactive fiction game in a web browser, using the Angular2 framework.


You need to install the TypeScript bindings for Angular2. This can be done via the `tsd` tool.

    $ npm install -g tsd
    $ cd examples/web/angular2
    $ tsd install angular2/angular2 --resolve
    
Then you can compile the Angular2 application

    $ tsc
   
You need to load it through a web server (even though all files are local, no Internet connection required). The easiest way to do that is to `npm install -g http-server` and use that to serve the page:

    $ http-server
    $ open http://0.0.0.0:8080/index.html  
    
    
    