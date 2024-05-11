'use strict'

const net = require("net");
const fs = require('fs');
const zlib = require('zlib');
const { formatDate, writeLog } = require('./utils.js');
const { CRLF, HTTPResponse, HTTPMethods, ValidEnconding, RegexPaths } = require('./const');

function gzipString(inputString) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(inputString, 'utf-8');
        zlib.gzip(buffer, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

class HTTPServer {
    constructor(port, address, options = null) {
        this.address = address;
        this.port = port;
        this.directory = options && options['directory'] ? options['directory'] : './';
        this._start_server();
    }

    _start_server() {
        this.server = net.createServer((socket) => {
            socket.on('data', (data) => this._on_data(data, socket));
            socket.on('end', () => writeLog('Client disconnected'));
        }).listen(this.port, this.address);
        writeLog(`Server started on ${this.address}:${this.port}`);
    }

    async _on_data(data, socket) {
        let request = HTTP_request_handler(data);
        const verb = request.request.method;
        if (/^GET/.test(verb)) {
            try {
                let response = await this._get(request);
                writeLog('Sending Response: ' + response.slice(0, 100)); // Log only part of the response to avoid binary data corruption
                socket.write(response, 'binary'); // Ensure data is written as binary
            } catch (error) {
                console.error('An error occurred:', error);
            }
        } else if (/^POST/.test(verb)) {
            try {
                let response = await this._post(request);
                writeLog('Sending Response: ' + response.slice(0, 100));
                socket.write(response, 'binary');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        }
    }

    async _send200(data, content_type, encoding) {
        data = data || '';
        if (encoding && encoding[0] === 'gzip') {
            try {
                const gzippedData = await gzipString(data);
                const contentLength = gzippedData.length;
                const headers = `${HTTPResponse[200]}Content-Encoding: gzip${CRLF}Content-Type: ${content_type}${CRLF}Content-Length: ${contentLength}${CRLF}${CRLF}`;
                return Buffer.concat([Buffer.from(headers, 'utf-8'), gzippedData]);
            } catch (e) {
                console.error(e);
                return `${HTTPResponse[500]}Content-Type: text/plain${CRLF}Content-Length: 21${CRLF}${CRLF}Internal Server Error${CRLF}`;
            }
        } else {
            return `${HTTPResponse[200]}Content-Type: ${content_type}${CRLF}Content-Length: ${data.length}${CRLF}${CRLF}${data}${CRLF}`;
        }
    }

    _send201(data, content_type) {
        data = data ? data : ''
        return `${HTTPResponse[201]}Content-Type: ${content_type}${CRLF}Content-Length: ${data.length}${CRLF}${CRLF}${data}${CRLF}`
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

    async _post(request) {
        if(RegexPaths.files.test(request.request.path)) {
            const file_match = request.request.path.match(RegexPaths.files)
            writeLog(`file path: ${file_match[1]} & content ${request.content}`)
            if(file_match) {
                const file_full_path = `${this.directory}${file_match[1]}`
                writeLog(`file full path is: ${file_full_path}`)
                let file = await this._create_file(file_full_path)
                return this._write_to_file(file, request.content)
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


    _get(request) {
        if(RegexPaths.root.test(request.request.path)) {
            return `${HTTPResponse[200]}${CRLF}`
        }
        else if(RegexPaths.user_agent.test(request.request.path)) {
            const resp = this._send200(request.user_agent, 'text/plain')
            return resp
        }
        else if(RegexPaths.files.test(request.request.path)) {
            const file = request.request.path.match(RegexPaths.files)
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
        else if(RegexPaths.echo.test(request.request.path)) {
            const echo_res = request.request.path.match(RegexPaths.echo)
            if(echo_res) {
                let captured_path = echo_res[1]
                writeLog(`Extracted path ${captured_path}`)
                const resp = this._send200(captured_path, 'text/plain', request.encoding)
                return resp
            } else return 'Something bad happened while extracting the echo path'
        }
        else if(RegexPaths.bad.test(request.request.path)) {
            return `${HTTPResponse[404]}${CRLF}`
        }
    }
}
//split the data
function HTTP_request_spliter(data) {
    let str_data = data.toString();
    let split_data = str_data.split(CRLF);
    console.log('Parsed & Split Data; ', split_data)
    return split_data;
}

function HTTP_form_req(datum) {
    let data = datum.split(' ')
    return {
        'method': data[0],
        'path': data[1],
        'http_version': data[2]
    }
}

function HTTP_form_encoding(datum) {
    let data = datum.split(' ')
    let codes = []
    for(let i = 1; i < data.length; i++) {
        let code = data[i]
        if(/,$/.test(code)) {
            code = code.slice(0, code.length - 1)
        }
        if(ValidEnconding.indexOf(code) > -1) codes.push(code)
        else writeLog(`NOT adding bad encoding: ${code}`)
    }
    return codes.length > 0 ? codes : undefined
}

function HTTP_request_handler(d) {
    let data = HTTP_request_spliter(d)
    const request = {}
    for (let datum of data) {
        if (datum === '') continue;
        const datum_split = datum.split(' ')
        const verb = datum_split[0] // The verb is the first keyword of the header

        // Check if the verb is an HTTP method
        if(!(request.method)) {
            if(HTTPMethods.indexOf(verb) > -1) {
                request.request = HTTP_form_req(datum) ;
                continue; // Continue to the next iteration after setting the method
            }
        }
        // Match the header types using a switch statement
        switch (true) {
        case /^host:/i.test(verb):
            request.host = datum_split[1];
            break;
        case /^user-agent:/i.test(verb):
            request.user_agent = datum_split[1];
            break;
        case /^accept:/i.test(verb):
            request.accept = datum_split[1];
            break;
        case /^accept-encoding:/i.test(verb):
            let encoding_ar = HTTP_form_encoding(datum);
            if(encoding_ar !== undefined) {
                request.encoding = encoding_ar
            }
            else {
                request.encoding = ''
            }
            break;
        case /^content-length:/i.test(verb):
            request.content_length = datum_split[1]
            break;
        default:
            // If none of the headers match, consider it part of content (assuming 'content' handling logic is correct)
            if (request.content_length) {
                if(!(request.content)) {
                    request.content = datum
                }
                else request.content += datum;
            }
            break;
        }
    }
    return request
}

module.exports = HTTPServer