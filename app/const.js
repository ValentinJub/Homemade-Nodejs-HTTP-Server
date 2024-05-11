'use strict'

const CRLF = '\r\n';
const HTTPResponse = {
    200: `HTTP/1.1 200 OK${CRLF}`,
    201: `HTTP/1.1 201 Created${CRLF}`,
    404: `HTTP/1.1 404 Not Found${CRLF}`
}

const HTTPMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'CONNECT', 'TRACE'];

const ValidEnconding = [
    'gzip', 'zip'
]

const RegexPaths = {
    'root': /^\/$/,
    'echo': /^\/echo\/(.+)/i,
    'user_agent': /^\/user-agent$/i,
    'files': /^\/files\/(.+)/i,
    'bad': /^\/\w+/
}

module.exports = {
    CRLF,
    HTTPResponse,
    HTTPMethods,
    ValidEnconding,
    RegexPaths
}