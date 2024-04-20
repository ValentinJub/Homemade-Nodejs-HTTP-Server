'use strict'

const net = require("net");
const fs = require('fs')
const { formatDate, writeLog } = require('./utils.js');

const { CRLF, HTTPResponse } = require('./const')


class HTTPServer {
    constructor(port, address, options = null) {

        this.address = address;
        this.port = port;
        
        if(options) {
            if(options['directory']) {
                this.directory = options['directory']                
            }
        }
        this._start_server();
    }

    _start_server() {
        this.server = net.createServer((socket) => {
            socket.on('data', (data) => this._on_data(data, socket));
        
            socket.on('end', () => {
                writeLog('Client disconnected');
            });
        }).listen(this.port, this.address);
    }

    async _on_data(data, socket) {
        let split_data = HTTP_request_parser(data)
        if(/^GET/.test(split_data[0])) {
            try {
                let response = await this._get(split_data)
                writeLog(response)
                socket.write(response)
            } catch (error) {
                console.error('An error occurred:', error);
                // Handle the error appropriately here
            }
        }
        if(/^POST/.test(split_data[0])) {
            try {
               let response = await this._post(split_data) 
               writeLog(response)
               socket.write(response);
            } catch (error) {
                console.error('An error occured: ', error)
            }
        }
    }

    _send201(data, content_type) {
        data = data ? data : ''
        return `${HTTPResponse[201]}Content-Type: ${content_type}${CRLF}Content-Length: ${data.length}${CRLF}${CRLF}${data}${CRLF}`
    }

    _send200(data, content_type) {
        data = data ? data : ''
        return `${HTTPResponse[200]}Content-Type: ${content_type}${CRLF}Content-Length: ${data.length}${CRLF}${CRLF}${data}${CRLF}`
    }

    _send404(data, content_type) {
        data = data ? data : ''
        return `${HTTPResponse[404]}Content-Type: ${content_type}${CRLF}Content-Length: ${data.length}${CRLF}${CRLF}${data}${CRLF}`
    }

    _read_file(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.error('File does not exist');
                        reject('File does not exist');
                    } else {
                        console.error('An error occurred:', err);
                        reject('An error occurred');
                    }
                } else {
                    writeLog(`File content: ${data}`);
                    resolve(data);
                }
            });
        });
    }

    _create_file(path) {
        return new Promise((resolve, reject) => {
            fs.open(path, 'w', (err, file) => {
                if(err) {
                    console.error('An error occured creating a file: ', err)
                    reject(err)
                }
                else {
                    writeLog('Success creating a file')
                    resolve(file)
                }
            })
        })    
    }

    _write_to_file(file, content) {
        return new Promise((resolve, reject) => {
            fs.writeFile(file, content, (err) => {
                if(err) {
                    console.error('An error occured writing to file ', err)
                    reject(err)
                }
                else {
                    console.log('Successfully wrote to file')
                    resolve()
                }
            })
        })
    }

    async _post(data) {
        const files_path = /^\/files\/(.+)/ 
        let request = data[0].split(' ')
        const path = request[1]
        const content = data[data.length - 1] 
        writeLog(`file path: ${path} & content ${content}`)
        if(files_path.test(path)) {
            const file_match = path.match(files_path)
            console.log(file_match)
            if(file_match) {
                const file_full_path = `${this.directory}${file_match[1]}`
                writeLog(`file full path is: ${file_full_path}`)
                let file = await this._create_file(file_full_path)
                return this._write_to_file(file, content)
                    .then((data) => {
                        return this._send201(data, 'application/octet-stream')
                    })
                    .catch(e => {
                        console.error(e)
                        return this._send404('', 'application/octet-stream')
                    })
            }
        }
    }


    _get(data) {
        let request = data[0].split(' ')
        let [host_header, user_agent_header] = [data[1].split(' '), data[2].split(' ')]
        const path = request[1]
        const root_path = /^\/$/
        const echo_path = /^\/echo\/(.+)/
        const user_agent_path = /^\/user-agent$/
        const files_path = /^\/files\/(.+)/
        const bad_path = /^\/\w+/
        if(root_path.test(path)) {
            return `${HTTPResponse[200]}${CRLF}`
        }
        else if(user_agent_path.test(path)) {
            let user_agent = user_agent_header[1];
            const resp = this._send200(user_agent, 'text/plain')
            return resp
        }
        else if(files_path.test(path)) {
            const file = path.match(files_path)
            if(file) {
                const file_full_path = `${this.directory}${file[1]}`
                writeLog(`file full path is: ${file_full_path}`)
                return this._read_file(file_full_path)
                    .then((data) => {
                        return this._send200(data, 'application/octet-stream')
                    })
                    .catch(e => {
                        console.error(e)
                        return this._send404('', 'application/octet-stream')
                    })
            }
        }
        else if(echo_path.test(path)) {
            const echo_res = path.match(echo_path)
            if(echo_res) {
                let captured_path = echo_res[1]
                writeLog(`Extracted path ${captured_path}`)
                const resp = this._send200(captured_path, 'text/plain')
                return resp
            } else return 'Something bad happened while extracting the echo path'
        }
        else if(bad_path.test(path)) {
            return `${HTTPResponse[404]}${CRLF}`
        }
            // return `${HTTPResponse[200]}${CRLF}`
            // return `${HTTPResponse[404]}${CRLF}`
    }
}

function HTTP_request_parser(data) {
    let str_data = data.toString();
    let split_data = str_data.split(CRLF);
    console.log('Parsed & Split Data; ', split_data)
    return split_data;
}

module.exports = HTTPServer