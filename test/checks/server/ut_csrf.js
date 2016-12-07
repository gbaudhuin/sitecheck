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

/*jshint expr: true*/
'use strict';
const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
var expect = require('chai').expect;

var server = http.createServer(function (req, res) {
    if (req.url == '/csrf_ok') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="yii_anticsrf" value="' + Token() + '"/></form>');
    } else if (req.url == '/no_form') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<li></li>');
    } else if (req.url == '/no_connection_form') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form></form>');
    } else if (req.url == '/no_hidden') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/></form>');
    } else if (req.url == '/no_csrf_token') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="not_found" value="' + Token() + '"/></form>');
    } else if (req.url == '/timeout_occured') {
        setTimeout(() => {
            res.end();
        }, 3000);
    }
    else {
        res.end('wrong request');
    }
});

function Token() {
    var rand = function () {
        return Math.random().toString(36).substr(2); // remove `0.`
    };

    var token = function () {
        return rand() + rand(); // to make it longer
    };

    return token();
}

describe('checks/server/check_csrf.js', function () {
    this.timeout(3000);
    before(() => {
        server.listen(8000);
    });
    it.skip('detects missing CSRF token', (done) => {
        var check_csrf = require('../../../src/checks/server/check_csrf.js');
        var check = new check_csrf();
        var issueRaised = false;
        check.setHook("OnRaiseIssue", function () {
            issueRaised = true;
        });
        check.check(new Target('http://localhost:8000/csrf_ok', "", CONSTANTS.TARGETTYPE.SERVER))
            .then(() => {
                expect(issueRaised).to.be.false;
                issueRaised = false;
                check = new check_csrf();
                check.setHook("OnRaiseIssue", function () {
                    issueRaised = true;
                });
                check.check(new Target('http://localhost:8000/no_form', "", CONSTANTS.TARGETTYPE.SERVER))
                    .then(() => {
                        expect(issueRaised).to.be.true;
                        check = new check_csrf();
                        check.setHook("OnRaiseIssue", function () {
                            issueRaised = true;
                        });
                        check.check(new Target('http://localhost:8000/no_connection_form', "", CONSTANTS.TARGETTYPE.SERVER))
                            .then(() => {
                                expect(issueRaised).to.be.true;
                                check = new check_csrf();
                                check.setHook("OnRaiseIssue", function () {
                                    issueRaised = true;
                                });
                                check.check(new Target('http://localhost:8000/no_hidden', "", CONSTANTS.TARGETTYPE.SERVER))
                                    .then(() => {
                                        expect(issueRaised).to.be.true;
                                        check = new check_csrf();
                                        check.setHook("OnRaiseIssue", function () {
                                            issueRaised = true;
                                        });
                                        check.check(new Target('http://localhost:8001/not_reachable', "", CONSTANTS.TARGETTYPE.SERVER))
                                            .then(() => {
                                                expect(issueRaised).to.be.true;
                                                check = new check_csrf();
                                                check.setHook("OnRaiseIssue", function () {
                                                    issueRaised = true;
                                                });
                                                check.check(new Target('http://localhost:8000/no_csrf_token', "", CONSTANTS.TARGETTYPE.SERVER))
                                                    .then(() => {
                                                        expect(issueRaised).to.be.true;
                                                        check = new check_csrf();
                                                        check.setHook("OnRaiseIssue", function () {
                                                            issueRaised = true;
                                                        });
                                                        check.check(new Target('http://localhost:8000/timeout_occured', "", CONSTANTS.TARGETTYPE.SERVER))
                                                            .then(() => {
                                                                expect(issueRaised).to.be.true;
                                                                done();
                                                            }).catch((err) => {
                                                                done(err);
                                                            });
                                                    }).catch((err) => {
                                                        done(err);
                                                    });
                                            }).catch((err) => {
                                                done(err);
                                            });
                                    }).catch((err) => {
                                        done(err);
                                    });
                            }).catch((err) => {
                                done(err);
                            });
                    }).catch((err) => {
                        done(err);
                    });
            }).catch((err) => {
                done(err);
            });
    });
    after(() => {
        server.close();
    });
});