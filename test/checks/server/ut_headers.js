/**
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
    } else if (req.url == '/cancel') {
        setTimeout(function () {
            res.end();
        }, 2000);
    } else if (req.url == '/everything_ok') {
        res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN'});
        res.end();
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_headers.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('detects missing X-Frame-Options, X-Content-Type-Options headers', function (done) {
        this.timeout(2000);
        var check_headers = require('../../../src/checks/server/check_headers.js');

        var ct = new CancellationToken();

        let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));

        let p1 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p2 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/xframeoptions_ko', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p3 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_ok', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p4 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_ko', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p5 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/everything_ok', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p6 = new Promise(function (resolve, reject) {
            let check = new check_headers(new Target('http://localhost:8000/xcontenttypeoptions_partial', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        Promise.all([p1, p2, p3, p4, p5, p6])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
    });

    it('is cancellable', function (done) {
        var check_headers = require('../../../src/checks/server/check_headers.js');
        var check = new check_headers(new Target('http://localhost:8000/cancel', CONSTANTS.TARGETTYPE.SERVER));
        var ct = new CancellationToken();
        let p1 = new Promise(function (resolve, reject) {
            check.check(ct)
                .then(() => {
                    reject();
                })
                .catch((e) => {
                    if (e.cancelled) resolve();
                });
        });
        Promise.all([p1])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
        ct.cancel();
    });
    /*
    it('handles connection errors', function (done) {
        this.timeout(10000);
        var check_headers = require('../../../src/checks/server/check_headers.js');
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