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
    if (req.url == '/php_error') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Stack trace:');
    }
    else if (req.url == '/asp_error') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('<h2> <i>Runtime Error</i> </h2></span>');
    }
    else if (req.url == '/aspx_error') {
        res.writeHead(428, { 'Content-Type': 'text/plain' });
        res.end('<b> Description: </b>An unhandled exception occurred during the execution of the current web request');
    }
    else if (req.url == '/java_error') {
        res.writeHead(512, { 'Content-Type': 'text/plain' });
        res.end('java.lang.NullPointerException');
    }
    else if (req.url == '/no_problem') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('<div> This is a div </div>');
    }
    else if (req.url == '/cancelled') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('');
    }
    else if (req.url == '/regex_found') {
        res.writeHead(430, { 'Content-Type': 'text/plain', 'Server': 'Apache/2.4.10 (Debian)' });
        res.end('<address>aeuaehjaieja</address>');
    }
    else if (req.url == '/exotic_code') {
        res.writeHead(810, { 'Content-Type': 'text/plain' });
        res.end('');
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('checks/server/check_error_pages.js', function () {
    before(function () {
        server.listen(8000);
    });

    it.only('detects error pages', function (done) {
        this.timeout(2000);
        var check_error_pages = require('../../../src/checks/server/check_error_pages.js');

        var ct = new CancellationToken();
        var ct2 = new CancellationToken();


        let p1 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/php_error', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p2 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/asp_error', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p3 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/aspx_error', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues) reject(new Error("expected issue not raised"));
                else resolve();
            });
        });

        let p4 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/java_error', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p5 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/cancelled', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct2)
                .then(() => {
                    reject();
                })
                .catch((e) => {
                    if (e.cancelled) resolve();
                });
        });

        let p6 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/no_problem', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p7 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/regex_found', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (!issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        let p8 = new Promise(function (resolve, reject) {
            let check = new check_error_pages(new Target('http://localhost:8000/exotic_code', CONSTANTS.TARGETTYPE.SERVER));
            check.check(ct).then((issues) => {
                if (issues)
                    reject(new Error("unexpected issue(s) raised"));
                else
                    resolve();
            });
        });

        Promise.all([p1, p2, p3, p4, p5, p6, p7, p8])
            .then(() => {
                done();
            })
            .catch(() => {
                done(new Error('fail'));
            });
        ct2.cancel();
    });

    after(function () {
        server.close();
    });
});