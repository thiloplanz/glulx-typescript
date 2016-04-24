/*

    node game2js {fyrevm story file.ux} {target js file}

    This will create a new file that loads a variable with the base64 encoded contents of the .ulx file.
    This file can be imported in the web page that will run the story.

    var FyreVM_StoryFileData = '...';
 */

/// <reference path='../../core/EngineWrapper.ts' />
/// <reference path='../../node/node-0.11.d.ts' />
/// <reference path='../../b64.ts' />

interface String {
    format(...replacements: string[]): string;
}

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

let fs = require('fs');

let imageFile = process.argv[2];
let outFile = process.argv[3];

let game = new FyreVM.MemoryAccess(0);
game.buffer = new Uint8Array(fs.readFileSync(imageFile));
game['maxSize'] = game.buffer.byteLength * 2;

console.info("Game Length: " + game.buffer.length);

let game64 = Base64.fromByteArray(game.buffer);

let template = "var FYREVM_StoryImageData=\"{0}\";".format(game64);

//console.info(template);

fs.writeFile(outFile, template);
