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
var assert = require('assert');
const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
var request = require('request');
var expect = require('chai').expect;

var server = http.createServer(function (req, res) {
    if (req.url == '/xframeoptions_ok') {
        res.writeHead(200, { 'X-Frame-Options': 'SAMEORIGIN' });
        res.end();
    } else if (req.url == '/xframeoptions_ko') {
        res.end();
    } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    };
});

describe('checks/server/check_headers.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('detect missing X-Frame-Options headers', function (done) {
        var check_headers = require('../../../src/checks/server/check_headers.js');
        var check = new check_headers();
        var issueRaised = false;
        check.setHook("OnRaiseIssue", function () {
            issueRaised = true;
        });
        check.check(new Target('http://localhost:8000/xframeoptions_ok', "", CONSTANTS.TARGETTYPE.SERVER))
            .then(function () {
                expect(issueRaised).to.be.false;
                issueRaised = false;
                check.check(new Target('http://localhost:8000/xframeoptions_ko', "", CONSTANTS.TARGETTYPE.SERVER))
                    .then(function () {
                        expect(issueRaised).to.be.true;
                        done();
                    });
            });
    });

    after(function () {
        server.close();
    });
});