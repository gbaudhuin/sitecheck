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

/* jshint expr:true */ // no jshint warnings on chai 'expect' expressions

const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
var fs = require('fs-extra');
var expect = require('chai').expect;
var winston = require('winston');
var randomstring = require("randomstring");
 
var server = http.createServer(function (req, res) {
    if (req.url == '/xframeoptions_ok') {
        res.writeHead(200, { 'X-Frame-Options': 'SAMEORIGIN' });
        res.end();
    } else if (req.url == '/xframeoptions_ko') {
        res.end();
    } else if (req.url == '/timeout') {
        setTimeout(function () {
            res.end();
        }, 2000);
    }else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_headers.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('detects missing X-Frame-Options headers', function (done) {
        var check_headers = require('../../../src/checks/server/check_headers.js');
        var check = new check_headers();
        var issueRaised = false;
        check.setHook("OnRaiseIssue", function (ref, positionIdentifier, errorContent, maybeFalsePositive) {
            issueRaised = true;
        });

        check.check(new Target('http://localhost:8000/xframeoptions_ok', "", CONSTANTS.TARGETTYPE.SERVER))
            .then(() => {
                expect(issueRaised).to.be.false;
                issueRaised = false;
                return check.check(new Target('http://localhost:8000/xframeoptions_ko', "", CONSTANTS.TARGETTYPE.SERVER));
            })
            .then(() => {
                expect(issueRaised).to.be.true;
                done();
            })
            .catch((err) => {
                done(err);
            })
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