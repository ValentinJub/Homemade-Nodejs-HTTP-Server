'use strict'

const CRLF = '\r\n';
const HTTPResponse = {
    200: `HTTP/1.1 200 OK${CRLF}`,
    201: `HTTP/1.1 201 OK${CRLF}`,
    404: `HTTP/1.1 404 Not Found${CRLF}`
}

module.exports = {
    CRLF,
    HTTPResponse
}