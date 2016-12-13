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

    if (req.url == '/cross_domain_script_unsecured') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<html><head><script src="aeaeaE.com/eakeaok"></head></html>');
    }
    else if (req.url == '/cross_domain_script_secured') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<html><head><script src="eakeaok.akamai.net"></head></html>');
    }
    else if (req.url == '/cancelled') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('');
    }
    else if (req.url == '/no_script') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('<html><head><script/>/head></html>');
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_cross_domain.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('detects cross domain scripts', function (done) {
        this.timeout(2000);
        var check_cross_domain = require('../../../src/checks/server/check_cross_domain.js');

        var ct = new CancellationToken();
        var ct2 = new CancellationToken();


        let p1 = new Promise(function (resolve, reject) {
            let check = new check_cross_domain(new Target('http://localhost:8000/cross_domain_script_unsecured', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p2 = new Promise(function (resolve, reject) {
            let check = new check_cross_domain(new Target('http://localhost:8000/cross_domain_script_secured', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p3 = new Promise(function (resolve, reject) {
            let check = new check_cross_domain(new Target('http://localhost:8000/cancelled', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct2)
                .then(() => {
                    reject();
                })
                .catch((e) => {
                    if (e.cancelled) resolve();
                });
        });

        let p4 = new Promise(function (resolve, reject) {
            let check = new check_cross_domain(new Target('http://localhost:8000/no_script', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        Promise.all([p1, p2, p3, p4])
            .then(() => {
                done();
            })
            .catch((e) => {
                console.log(e);
                done(new Error('fail'));
            });
            ct2.cancel();
    });

    after(function () {
        server.close();
    });
});