const assert = require('assert');
const HTTPServer = require('./httpserver')

console.log("Logs from your program will appear here!");
// console.log(process.argv)

let server;

if(process.argv.length > 2) {
    if(process.argv[2].match(/^--directory$/)) {
        assert(process.argv[3], new Error('You need to pass a directory path after the directory flag 🥹'))
        server = new HTTPServer(4221, 'localhost', {'directory': process.argv[3]})
    }
} else {
    server = new HTTPServer(4221, 'localhost')
}

assert(server)
