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
//var fs = require('fs-extra');
//var winston = require('winston');
//var randomstring = require("randomstring");
var CancellationToken = require('../../../src/cancellationToken.js');

var server = http.createServer(function (req, res) {
     if (req.url == '/php_tag') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('<?php this is a php tag ?>');
    } else if (req.url == '/asp_jsp_code_tag') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('<% test %>');
    }
    else if (req.url == '/aspx_code_tag') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('<%@ test %>');
    }    
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_code_disclosure.js', function () {
    before(function () {
        server.listen(8000);
    });

    it.only('detects code disclosure', function (done) {
        this.timeout(2000);
        var check_code_disclosure = require('../../../src/checks/server/check_code_disclosure.js');

        var ct = new CancellationToken();


        let p1 = new Promise(function (resolve, reject) {
            let check = new check_code_disclosure(new Target('http://localhost:8000/php_tag', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p2 = new Promise(function (resolve, reject) {
            let check = new check_code_disclosure(new Target('http://localhost:8000/asp_jsp_code_tag', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

         let p3 = new Promise(function (resolve, reject) {
            let check = new check_code_disclosure(new Target('http://localhost:8000/aspx_code_tag', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        Promise.all([p1, p2, p3])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
    });

    after(function () {
        server.close();
    });
});