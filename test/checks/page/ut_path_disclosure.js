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
var CancellationToken = require('../../../src/cancellationToken.js');
var check_path_disclosure = require('../../../src/checks/page/check_path_disclosure.js');

var server = http.createServer(function (req, res) {
    if (req.url == '/linux_path_disclosure') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('<head>' +
            '<script src="/home/foo/bar.js"></script>' +
            '</head>' +
            '<body>' +
            '<img src="/home/foo/bar.jpg" id="aea"/>' +
            '<a href="/home/foo/bar.html"/>' +
            '</body>');
    } else if (req.url == '/windows_path_disclosure') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('<head>' +
            '</head>' +
            '<body>' +
            '<div>File test was not found at C:\\test.html</div>'+
            '<img src="C:\\bar.jpg"/>' +
            '<a href="C:\\bar.html"/>' +
            '</body>');
    }
    else if (req.url == '/works') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('<head>' +
            '</head>' +
            '<body>' +
            '<img src="localhost:8000/assets/images/bar.jpg"/>' +
            '<a href="localhost:8000/bar.html"/>' +
            '</body>');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_code_disclosure.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('contains linux path disclosure', function (done) {
        let check = new check_path_disclosure(new Target('http://localhost:8000/linux_path_disclosure', CONSTANTS.TARGETTYPE.SERVER));
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

    it('contains windows path disclosure', function (done) {
        let check = new check_path_disclosure(new Target('http://localhost:8000/windows_path_disclosure', CONSTANTS.TARGETTYPE.SERVER));
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

    it('works', function (done) {
        let check = new check_path_disclosure(new Target('http://localhost:8000/works', CONSTANTS.TARGETTYPE.SERVER));
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

    it('check if cancellable', (done) => {
        let ct = new CancellationToken();
        let check = new check_path_disclosure(new Target('http://localhost:8000/cancellable', CONSTANTS.TARGETTYPE.SERVER));
        check.check(ct).then(() => {
            done(new Error('Expected error was not send'));
        }).catch((value) => {
            done();
        });
        ct.cancel();
    });

    after(function () {
        server.close();
    });
});