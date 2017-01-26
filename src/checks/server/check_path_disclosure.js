'use strict';

let Check = require('../../check');
const CONSTANTS = require("../../constants.js");
let request = require('request');
let cheerio = require('cheerio');

const COMMON_DIR = [
    "\\/bin\\/",
    "\/boot\/",
    "\/cdrom\/",
    "\/dev\/",
    "\/etc\/",
    "\/home\/",
    "\/initrd\/",
    "\/lib\/",
    "\/media\/",
    "\/mnt\/",
    "\/opt\/",
    "\/proc\/",
    "\/root\/",
    "\/sbin\/",
    "\/sys\/",
    "\/srv\/",
    "\/tmp\/",
    "\/usr\/",
    "\/var\/",
    "\/htdocs\/",
    "C:\\\\",
    "D:\\\\",
    "E:\\\\",
    "Z:\\\\",
    "C:\\\\windows\\\\",
    "C:\\\\winnt\\\\",
    "C:\\\\win32\\\\",
    "C:\\\\win\\\\system\\\\",
    "C:\\\\windows\\\\system\\\\",
    "C:\\\\winnt\\\\system\\\\",
    "C:\\\\win32\\\\system\\\\",
    "C:\\\\Program Files\\\\",
    "C:\\\\Documents and Settings\\\\"

];

let url_list = ['/home/foo/bar.jpg'];

module.exports = class CheckPathDisclosure extends Check {

    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    /** 
     * This check will check on every page if there is a path disclosure.
     * Path disclosure can be a critical security breach, it can help hacker by revealing your server architecture.
    */
    _check(cancellationToken, done) {
        let self = this;
        let timeout = 30000;
        let abnormal_url = [];
        self._cancellationToken = cancellationToken;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, (err, res, body) => {
            if (self._handleError(err)) {
                done();
                return;
            }
            for (let path of COMMON_DIR) {
                let regexString = path + '[A-Za-z0-9\\.\\_\\-\\\\\\/\\+\\~]*';
                let regex = new RegExp(regexString, 'gi');
                let match = body.match(regex);
                if (match) {
                    for (let matched of match) {
                        if (url_list.indexOf(matched) === -1) {
                            abnormal_url.push(matched);
                        }
                    }
                }
            }
            self.isAttribute(body, abnormal_url, (abnormalUrlArray) => {
                if (abnormalUrlArray.length > 0) {
                    let alertMessage = "The URL " + self.target.uri.href + " have a path disclosure vulnerability which discloses ";
                    for (let path of abnormalUrlArray) {
                        alertMessage += path + ' ';
                    }
                    self._raiseIssue('path_disclosure.xml', null, alertMessage);
                    console.log(alertMessage);
                }
                done();
            });
        });
    }

    isAttribute(body, abnormalUrlArray, callback) {
        let $ = cheerio.load(body);
        $('*').each(function () {
            for (let i = 0; i < abnormalUrlArray.length; i++) {
                let url = abnormalUrlArray[i];
                for(let attrib of Object.values($(this)[0].attribs)){
                    if (attrib === url) {
                        abnormalUrlArray.splice(i, 1);
                    } 
                }
            }
        });
        callback(abnormalUrlArray);
    }
};




