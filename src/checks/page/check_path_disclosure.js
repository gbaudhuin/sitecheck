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
    "C:\\\\windows\\\\",
    "C:\\\\winnt\\\\",
    "C:\\\\win32\\\\",
    "C:\\\\win\\\\system\\\\",
    "C:\\\\windows\\\\system\\\\",
    "C:\\\\winnt\\\\system\\\\",
    "C:\\\\win32\\\\system\\\\",
    "C:\\\\Program Files\\\\",
    "C:\\\\Documents and Settings\\\\",
    "C:\\\\Users\\\\",
    "C:\\\\wamp\\\\",
    "C:\\\\wamp64\\\\",
    "C:\\\\xampp\\\\"

];

let url_list = ['/home/foo/bar.jpg'];

module.exports = class CheckPathDisclosure extends Check {

    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
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
            self.filterHtmlComments(body, (filteredBody) => {
                let $ = cheerio.load(filteredBody);
                $('*').each(function () {
                    for (let elem of $(this)[0].children) {
                        if (elem.data && elem.data.length > 0) {
                            for (let path of COMMON_DIR) {
                                let regexString = path + '[A-Za-z0-9\\.\\_\\-\\\\\\/\\+\\~]*';
                                let regex = new RegExp(regexString, 'gi');
                                let match = elem.data.match(regex);
                                if (match) {
                                    for (let matched of match) {
                                        if (url_list.indexOf(matched) === -1) {
                                            abnormal_url.push(matched);
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                if (abnormal_url.length > 0) {
                    let alertMessage = "The URL " + self.target.uri.href + " have a path disclosure vulnerability which discloses ";
                    for (let path of abnormal_url) {
                        alertMessage += '\n' + path;
                    }
                    self._raiseIssue('path_disclosure.xml', null, alertMessage);
                }
                done();
            });
        });
    }

    filterHtmlComments(body, callback) {
        let regex = /<!--(.|\s)*?-->/gi;
        let filteredBody = body.replace(regex, '');
        regex = /<style>(.|\s)*?<\/style>/;
        filteredBody = filteredBody.replace(regex, '');
        callback(filteredBody);
    }
};



