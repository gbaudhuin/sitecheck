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
    if (req.url == '/basic_auth') {
        if (req.headers.authorization !== "QmFzaWMgOiBCb2I6OTk5OTk=") {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="example"');
            res.end('Access denied');
        } else {
            res.statusCode = 200;
            res.end('Access granted');
        }
    }
    else if (req.url == '/get_form') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000/post_form"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="authenticity_token" value="' + Token() + '"/></form>');
    }
    else if (req.url == '/post_form') {
        var body = [];
        req.on('error', function (err) {
            console.error(err);
        }).on('data', function (chunk) {
            body.push(chunk);
        }).on('end', function () {
            body = Buffer.concat(body).toString();
            if (body.indexOf("username=Bob&password=99999999") !== -1) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end('done');
            }
            else {
                res.writeHead(401, { "Content-Type": "text/html" });
                res.end('Access denied');
            }
        });
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

describe('checks/server/check_bruteforce.js', function () {
    this.timeout(50000);
    before(() => {
        server.listen(8000);
    });
    it('detects if bruteforce by basic auth works', function (done) {
        this.timeout(50000);
        var check_bruteforce = require('../../../src/checks/server/check_bruteforce.js');

        var ct = new cancellationToken();

        var check1 = new check_bruteforce(new Target('http://localhost:8000/basic_auth', CONSTANTS.TARGETTYPE.SERVER));

        let p1 = new Promise(function (resolve, reject) {
            check1.check(ct).then((issues) => {
                if (!issues) {
                    reject(new Error("unexpected issue(s) raised"));
                }
                else
                    resolve();
            });
        });

        Promise.all([p1])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
    });

    it.only('detects if bruteforce by form works', function (done) {
        this.timeout(50000);
        var check_bruteforce = require('../../../src/checks/server/check_bruteforce.js');

        var ct = new cancellationToken();

        var check1 = new check_bruteforce(new Target('http://localhost:8000/get_form', CONSTANTS.TARGETTYPE.SERVER));

        let p1 = new Promise(function (resolve, reject) {
            check1.check(ct).then((issues) => {
                if (issues) {
                    reject(new Error("unexpected issue(s) raised"));
                }
                else
                    resolve();
            });
        });

        Promise.all([p1])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
    });

    it('is cancellable', function (done) {
        this.timeout(2000);
        var check_bruteforce = require('../../../src/checks/server/check_bruteforce.js');

        var ct = new cancellationToken();

        var check1 = new check_bruteforce(new Target('http://localhost:8000/get_form', CONSTANTS.TARGETTYPE.SERVER));

        let p1 = new Promise(function (resolve, reject) {
            check1.check(ct).then((issues) => {
                if (issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
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
    after(() => {
        server.close();
    });
});