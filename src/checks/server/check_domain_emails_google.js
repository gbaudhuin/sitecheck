"use strict";

var Check = require('../../check');
const CONSTANTS = require("../../constants.js");
var request = require('request');
var querystring = require('querystring');
var util = require('util');

let emailList = [];
let finalEmailList = [];

var URLBing = '%s://www.bing.%s/search?&q=%s';


let resultsPerPageBing = 0;
let tldBing = 'com';
let requestOptionsGlobalBing = {};
let protocolBing = 'http';

var URLGoogle = '%s://www.google.%s/search?hl=%s&q=%s';

let resultsPerPageGoogle = 100;
let tldGoogle = 'com';
let langGoogle = 'en';
let requestOptionsGlobalGoogle = {};
let protocolGoogle = 'http';
let winston = require('winston');

class CheckDomainEmailGoogle extends Check {

    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    /** 
     * This check tries to request google.
     * A large number of request may be block so be careful when scrapping google.
    */
    _check(cancellationToken, done) {
        let self = this;
        let timeout = 30000;
        self._cancellationToken = cancellationToken;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, (err, res, body) => {
            if (self._handleError(err)) {
                done();
                return;
            }
            let host = "";
            if(self.target.uri.host.indexOf("www.") !== -1){
                host = self.target.uri.host.replace('www.', '');
            } else{
                host = self.target.uri.host;
            }
            let queryString = "@" + host;
            requestOptionsGlobalGoogle.url = 'http://www.google.com/search?num=100&start=0&hl=en&ie=UTF-8&oe=UTF-8&q=' + queryString;
            requestOptionsGlobalGoogle.cancellationToken = cancellationToken;
            requestOptionsGlobalGoogle.timeout = timeout;
            requestOptionsGlobalBing.url = 'https://www.bing.com/search?first=' + resultsPerPageBing + '&q=' + queryString;
            requestOptionsGlobalBing.cancellationToken = cancellationToken;
            requestOptionsGlobalBing.timeout = timeout;
            self.queryGoogle(cancellationToken, queryString, (err, emailArray) => {
                if (emailArray !== null && emailList.length > 0) {
                    finalEmailList = self.trimArray(emailList);
                    console.log(self.removeDuplicates(finalEmailList));
                }
                self.queryBing(cancellationToken, queryString, (err, emailArray) => {
                    if (emailArray !== null && emailList.length > 0) {
                        finalEmailList = self.trimArray(emailList);
                        console.log(self.removeDuplicates(finalEmailList));
                    }
                    done();
                });
            });
        });
    }

    /**
     * This function will scrap google with a given query string
     * @param cancellationToken
     * @param queryString
     */
    queryGoogle(cancellationToken, queryString, callback) {
        let self = this;
        self.isPrivateWebsite(cancellationToken, queryString, (isPrivate) => {
            if (isPrivate) {
                callback(null, null);
                return;
            } else {
                var nextCounter = 0;

                self.google(queryString, function (err, res) {

                    /* istanbul ignore else */
                    if (res) {

                        if (nextCounter < 2) {
                            nextCounter++;
                            res.next();
                        }
                        else {
                            callback(null, emailList);
                        }
                    } else {
                        winston.log('warn', 'Cannot fetch Google results. This can be due to the fact that too many requests were sent');
                        callback(null, null);
                    }
                });
            }
        });
    }

    /**
     * This function will scrap Bing with a given query string
     * @param cancellationToken
     * @param queryString
     */
    queryBing(cancellationToken, queryString, callback) {
        let self = this;
        self.isPrivateWebsite(cancellationToken, queryString, (isPrivate) => {
            if (isPrivate) {
                callback(null, null);
                return;
            }
            else {
                var nextCounter = 0;

                self.bing(queryString, 1, function (err, res) {

                    if (nextCounter < 4) {
                        nextCounter++;
                        res.next();
                    }
                    else {
                        callback(null, emailList);
                    }
                });
            }
        });
    }

    isPrivateWebsite(cancellationToken, queryString, callback) {
        if (/(10\.\d?\d?\d?\.\d?\d?\d?\.\d?\d?\d?)/.test(queryString) ||
            /(172\.[1-3]\d?\d?\.\d?\d?\d?\.\d?\d?\d?)/.test(queryString) ||
            /(192\.168\.\d?\d?\d?\.\d?\d?\d?)/.test(queryString) ||
            /(127\.\d?\d?\d?\.\d?\d?\d?\.\d?\d?\d?)/.test(queryString)) {
            callback(true);
        }
        else {
            callback(false);
        }
    }

    // start parameter is optional
    google(query, start, callback) {
        let self = this;
        var startIndex = 0;
        callback = start;
        self.igoogle(query, startIndex, callback);
    }


    igoogle(query, start, callback) {
        let self = this;
        self.google.resultsPerPageGoogle = resultsPerPageGoogle;

        var newUrl = util.format(URLGoogle, protocolGoogle, tldGoogle, langGoogle, querystring.escape(query));
        var requestOptions = {
            url: newUrl,
            timeout: 10000,
            cancellationToken: null,
            resultsPerPageGoogle: resultsPerPageGoogle,
            headers: {
                'User-Agent': "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.51 Safari/537.36"
            }
        };

        for (var k in requestOptions) {
            if (requestOptionsGlobalGoogle[k]) {
                requestOptions[k] = requestOptionsGlobalGoogle[k];
            }
        }
        if (start !== 0) {
            requestOptions.url = requestOptions.url.replace('start=0', 'start=' + start);
        }
        request.get(requestOptions, function (err, resp, body) {
            /* istanbul ignore else */
            if ((err === null) && resp.statusCode === 200) {
                let b = body.replace(/<strong>/g, '')
                    .replace(/ <strong>/g, '')
                    .replace(/<em>/g, '')
                    .replace(/<\/em>/g, '')
                    .replace(/%40/g, '@')
                    .replace(/<\/strong>/g, '')
                    .replace(/ <\/strong>/g, '')
                    .replace(/   /g, '')
                    .replace(/  /g, '')
                    .replace(/x3d/g, '=')
                    .replace(/x22/g, '"')
                    .replace(/ @/g, '@');
                /* body = body.replace(' @', '@');
                 body = body.replace(' @', '@');
                 body = body.replace(' @', '@');
 */

                let queryRegex = query.replace('.', '\\.');
                queryRegex = query.replace('@', '');
                var regx = new RegExp('(?![=:+/*-<>]|[\\s])[a-zA-Z0-9._%-]+@' + queryRegex, 'g');
                let match = b.match(regx);///[a-zA-Z0-9\._\%+-]+@[a-zA-Z0-9\.-]+\.[a-zA-Z]{2,64}/g);
                for (let m = 0; m < match.length; m++) {
                    let regex = new RegExp('for@' + queryRegex, 'gi');
                    if (match[m].indexOf('%') !== -1 || regex.test(match[m])) {
                        match.splice(m, 1);
                    } else {
                        emailList.push(match[m].toLowerCase());
                    }
                }

                emailList.pop();
                console.log(emailList);

                var res = {};
                res.next = function () {
                    setTimeout(function () {
                        self.igoogle(query, parseInt(start + resultsPerPageGoogle), callback);
                    }, 2000);
                };

                callback(null, res);
            }
            else {
                callback(null, null);
            }
        });
    }

    // start parameter is optional
    bing(query, start, callback) {
        let self = this;
        var startIndex = 0;
        startIndex = start;
        self.ibing(query, startIndex, callback);
    }


    ibing(query, start, callback) {
        let self = this;

        var newUrl = util.format(URLBing, protocolBing, tldBing, querystring.escape(query));
        var requestOptions = {
            url: newUrl,
            timeout: 10000,
            cancellationToken: null,
            resultsPerPageBing: resultsPerPageBing,
            headers: {
                'User-Agent': "Mozilla/5.0 (X11; Windows x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.51 Safari/537.36"
            }
        };

        for (var k in requestOptions) {
            if (requestOptionsGlobalBing[k]) {
                requestOptions[k] = requestOptionsGlobalBing[k];
            }
        }

        requestOptions.url = requestOptions.url.replace('first=0', 'first=' + start);
        resultsPerPageBing += 10;

        request.get(requestOptions, function (err, resp, body) {
            /* istanbul ignore else */
            if ((err === null) && resp.statusCode === 200) {
                let b = body.replace(/<strong>/g, '')
                    .replace(/ <strong>/g, '')
                    .replace(/<em>/g, '')
                    .replace(/<\/em>/g, '')
                    .replace(/%40/g, '@')
                    .replace(/<\/strong>/g, '')
                    .replace(/ <\/strong>/g, '')
                    .replace(/   /g, '')
                    .replace(/  /g, '')
                    .replace(/ @/g, '@');
                /* body = body.replace(' @', '@');
                 body = body.replace(' @', '@');
                 body = body.replace(' @', '@');
 */

                let queryRegex = query.replace('.', '\\.');
                queryRegex = query.replace('@', '');
                var regx = new RegExp('(?![=:+/*-<>]|[\\s])[a-zA-Z0-9._%+-]+@' + queryRegex, 'g');
                console.log(regx);
                let match = b.match(regx);///[a-zA-Z0-9\._\%+-]+@[a-zA-Z0-9\.-]+\.[a-zA-Z]{2,64}/g);
                for (let m = 0; m < match.length; m++) {
                    if (match[m].indexOf('%') !== -1) {
                        match.splice(m, 1);
                    } else {
                        emailList.push(match[m].toLowerCase());
                    }
                }

                emailList.pop();
                console.log(emailList);

                var res = {};

                res.next = function () {
                    setTimeout(function () {
                        if (start === 1) {
                            self.ibing(query, start + 9, callback);
                        }
                        else {
                            self.ibing(query, start + 10, callback);
                        }
                    }, 2000);
                };

                callback(null, res);
            }
            else {
                winston.log('warn', 'Cannot fetch Bing results. This can be due to the fact that too many requests were sent');
                callback(null, null);
            }
        });
    }

    /**
     * Function used to remove duplicate results in the array of email adresses found while scrapping Google and Bing.
     * @param EmailAddressesArray
     */
    removeDuplicates(EmailAddressesArray) {
        return Array.from(new Set(EmailAddressesArray));
    }

    /**
     * Function used to remove useless spaces in the array of email adresses found while scrapping Google and Bing.
     * @param EmailAddressesArray
     */
    trimArray(EmailAddressesArray) {
        for (let email of EmailAddressesArray) {
            email = email.trim();
        }
        return EmailAddressesArray;
    }

}

function checkInHtml(uri, query, cancellationToken, callback) {
    let emailListHtmlPage = [];
    var requestOptions = {
        url: uri,
        timeout: 10000,
        cancellationToken: cancellationToken,
        headers: {
            'User-Agent': "Mozilla/5.0 (X11; Windows x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.51 Safari/537.36"
        }
    };

    request.get(requestOptions, function (err, resp, body) {
        if (!err && resp.statusCode === 200) {
            let b = body.replace(/<strong>/g, '')
                .replace(/ <strong>/g, '')
                .replace(/<em>/g, '')
                .replace(/<\/em>/g, '')
                .replace(/%40/g, '@')
                .replace(/&#64;/g, '@')
                .replace(/&#46;/g, '.')
                .replace(/<!--[^>]*-->/g, '')
                .replace(/\sAT\s/gi, '@')
                .replace(/\sDOT\s/gi, '.')
                .replace(/<\/strong>/g, '')
                .replace(/ <\/strong>/g, '')
                .replace(/   /g, '')
                .replace(/  /g, '')
                .replace(/ @/g, '@');

            let queryRegex = query.replace('.', '\\.');
            queryRegex = query.replace('@', '');
            var regx = new RegExp('(?![=:+/*-<>]|[\\s])[a-zA-Z0-9._%+-]+@' + queryRegex, 'g');
            let match = b.match(regx);///[a-zA-Z0-9\._\%+-]+@[a-zA-Z0-9\.-]+\.[a-zA-Z]{2,64}/g);
            if (match) {
                for (let m = 0; m < match.length; m++) {
                    emailListHtmlPage.push(match[m].toLowerCase());
                }
            }
            if (emailListHtmlPage.length > 0) {
                callback(null, emailListHtmlPage);
            }
            else {
                callback(null, null);
            }
        }
        else {
            callback(new Error('This page is not reachable'), null);
        }
    });
}

module.exports = { CheckDomainEmailGoogle, checkInHtml };
