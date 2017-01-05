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

    var check_cross_domain = require('../../../src/checks/server/check_cross_domain.js');

    it('is on an unsecured domain', function (done) {
        let check = new check_cross_domain(new Target('http://localhost:8000/cross_domain_script_unsecured', CONSTANTS.TARGETTYPE.SERVER));
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

    it('is on an secured domain', function (done) {
        let check = new check_cross_domain(new Target('http://localhost:8000/cross_domain_script_secured', CONSTANTS.TARGETTYPE.SERVER));
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

    it('is cancellable', function (done) {
        let ct = new CancellationToken();
        let check = new check_cross_domain(new Target('http://localhost:8000/cancelled', CONSTANTS.TARGETTYPE.SERVER));
        check.check(ct)
            .then(() => {
                done();
            })
            .catch((e) => {
                if (e.cancelled) done();
            });
        ct.cancel();
    });

    it('is on an secured domain', function (done) {
        let check = new check_cross_domain(new Target('http://localhost:8000/no_script', CONSTANTS.TARGETTYPE.SERVER));
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

    after(function () {
        server.close();
    });
});