'use strict'

function formatDate(date) {

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
    const yy = String(date.getFullYear()).substring(2);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');

    return `${dd}/${mm}/${yy} ${hh}:${min}:${sec}`;
}

function writeLog(message) {
    const timestamp = formatDate(new Date());
    if (typeof message !== 'string') {
        throw new Error('Message must be a string');
    }
    console.log(`${timestamp} ${message}`);
}

// from Nick Ivanov on: https://stackoverflow.com/questions/45053624/convert-hex-to-binary-in-javascript
function hex2bin(hex){
    hex = hex.replace("0x", "").toLowerCase();
    var out = "";
    for(var c of hex) {
        switch(c) {
            case '0': out += "0000"; break;
            case '1': out += "0001"; break;
            case '2': out += "0010"; break;
            case '3': out += "0011"; break;
            case '4': out += "0100"; break;
            case '5': out += "0101"; break;
            case '6': out += "0110"; break;
            case '7': out += "0111"; break;
            case '8': out += "1000"; break;
            case '9': out += "1001"; break;
            case 'a': out += "1010"; break;
            case 'b': out += "1011"; break;
            case 'c': out += "1100"; break;
            case 'd': out += "1101"; break;
            case 'e': out += "1110"; break;
            case 'f': out += "1111"; break;
            default: return "";
        }
    }

    return out;
}


module.exports = {
    formatDate,
    writeLog,
    hex2bin
};