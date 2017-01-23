﻿/**
 * @license Apache-2.0
 * Copyright (C) 2016 The Sitecheck Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
//var fs = require('fs-extra');
//var winston = require('winston');
//var randomstring = require("randomstring");
var CancellationToken = require('../../../src/cancellationToken.js');
var check_headers = require('../../../src/checks/page/check_headers.js');

var server = http.createServer(function (req, res) {
    if (req.url == '/xframeoptions_ok') {
        res.writeHead(200, { 'X-Frame-Options': 'SAMEORIGIN' });
        res.end();
    } else if (req.url == '/xframeoptions_ko') {
        res.end();
    } else if (req.url == '/xcontenttypeoptions_ok') {
        res.writeHead(200, { 'X-Content-Type-Options': 'nosniff' });
        res.end();
    } else if (req.url == '/xcontenttypeoptions_partial') {
        res.writeHead(200, { 'X-Content-Type-Options': 'sniff' });
        res.end();
    } else if (req.url == '/xcontenttypeoptions_ko') {
        res.end();
    } else if (req.url == '/timeout') {
        setTimeout(function () {
            res.end();
        }, 2000);
    } else if (req.url == '/cancelled') {
        setTimeout(function () {
            res.end();
        }, 2000);
    } else if (req.url == '/everything_ok') {
        res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN' });
        res.end();
    } else if (req.url == '/exotic_header') {
        res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Exotic-header-here': '5948715' });
        res.end();
    } else if (req.url == '/code_300') {
        res.writeHead(302, { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'content-location' : "some_url" });
        res.end();
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/page/check_headers.js', function () {
    before(function () {
        server.listen(8000);
    });

    this.timeout(2000);

    //let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));

    it.only('contains xframeoption header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('does not contains xframeoption header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ko', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('contains xcontenttypeoptions header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('does not contains xcontenttypeoptions header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_ko', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('works', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/everything_ok', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });
    
    it.only('have exotic header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/exotic_header', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('violates RFC', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/code_300', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('contains partial xcontenttypeoptions header', function (done) {
        let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_partial', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('is cancellable', function (done) {
        var ct = new CancellationToken();
        let check = new check_headers(new Target('http://localhost:8000/cancel', CONSTANTS.TARGETTYPE.SERVER));
        check.check(ct)
            .then(() => {
                done();
            })
            .catch((e) => {
                if (e.cancelled) done();
            });
            ct.cancel();
    });
    /*
    it('handles connection errors', function (done) {
        this.timeout(10000);
        var check_headers = require('../../../src/checks/page/check_headers.js');
        var check = new check_headers();
    
        // make sure no previous ut log file exists
        try {
            fs.unlinkSync("ut.log");
        } catch (e) { }
    
        // reset winston transports
        try {
            winston.remove(winston.transports.File);
        } catch (e) { }
    
        // add our file transport
        winston.add(winston.transports.File, {
            filename: "ut.log", handleExceptions: true, humanReadableUnhandledException: true, level: winston.level
        });
    
        var go_on = false;
        
        // check connection unknown error
        check.check(new Target('http://inexistantdomain' + randomstring.generate(5) + '.com/', "", CONSTANTS.TARGETTYPE.SERVER))
            .then(function () {
                // check connection timeout
                check.check(new Target('http://localhost:8000/timeout', "", CONSTANTS.TARGETTYPE.SERVER))
                    .then(function () {
                        console.log("a");
                        var winston_stream = winston.stream({ start: -1 });
                        winston_stream.on('log', function (log) {
                            if (log.message.indexOf("Unknown error") !== -1) {
                                go_on = true;
                                console.log("b");
                            } else if (go_on && log.message.indexOf("Timeout occured") !== -1) {
                                console.log("c");
                                // destroy stream to allow correct program termination
                                winston_stream.destroy();
    
                                // clean generated log file
                                try {
                                    fs.unlinkSync("ut.log");
                                } catch (e) { }
                            }
                        });
                        done();
                   // }).catch(function (e) {
                   //     done(e);
                    });
            });
        
    });
    */
    after(function () {
        server.close();
    });
});