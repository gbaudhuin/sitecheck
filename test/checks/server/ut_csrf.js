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
//var expect = require('chai').expect;
var cancellationToken = require('../../../src/cancellationToken.js');

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
    else if (req.url == '/crsf_doesnt_change') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="not_found" value="a5E984JYunG95Ip1WSc6"/></form>');
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
    this.timeout(15000);
    before(() => {
        server.listen(8000);
    });
    it('detects missing CSRF token', (done) => {
        var ct = new cancellationToken();
        var check_csrf = require('../../../src/checks/server/check_csrf.js');
        var check = new check_csrf(new Target('http://localhost:8000/csrf_ok', CONSTANTS.TARGETTYPE.SERVER));
        let p1 = new Promise(function (resolve, reject) {
            check.check(ct)
                .then((issues) => {
                    if (issues) {
                        reject(new Error('Unexpected issue happened'));
                    }
                    else {
                        resolve();
                    }
                })
                .catch((e) => {
                    reject(e);
                });
        });
       /* let p2 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/no_form', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct)
                .then((issues) => {
                    if (issues) {
                        reject(new Error('Unexpected issue happened'));
                    }
                    else {
                        resolve();
                    }
                })
                .catch(() => {
                    console.log(123);
                    reject();
                });
        });*/
        /*
        let p3 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/no_connection_form', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.false;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
        let p4 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/no_hidden', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.true;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
        let p5 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8001/not_reachable', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.true;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
        let p6 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/crsf_doesnt_change', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.true;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
        let p7 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/no_csrf_token', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.true;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
        let p8 = new Promise(function (resolve, reject) {
            check = new check_csrf(new Target('http://localhost:8000/timeout_occured', CONSTANTS.TARGETTYPE.SERVER));
            check.setHook("OnRaiseIssue", function () {
                issueRaised = true;
            });
            check.check()
                .then(() => {
                    expect(issueRaised).to.be.true;
                    resolve();
                })
                .catch(() => {
                    reject();
                });
        });
*/
        Promise.all([p1/*, p3, p4, p5, p6, p7, p8*/])
            .then(() => {
                console.log(123);
                done();
            })
            .catch((e) => {
                console.log(456);
                done(e);
            });

    });
    
    after(() => {
        server.close();
    });
});