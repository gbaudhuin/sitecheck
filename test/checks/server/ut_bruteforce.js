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

'use strict';
var http = require('http');
var qs = require('querystring');
var SessionHelper = require('../../helpers/sessionHelper.js');
var Target = require('../../../src/target.js');
var CancellationToken = require('../../../src/cancellationToken.js');
var CheckBruteforce = require('../../../src/checks/server/check_bruteforce.js');
var helpers = require('../../../src/helpers.js');
const CONSTANTS = require('../../../src/constants.js');

var sessionHelper = new SessionHelper();

var fields = {
    action: '/connect',
    username: 'admin',
    password: '1234',
    csrf: 'authenticity_token',
    csrf_value: helpers.token()
};

var fieldsFail = {
    action: '/connectFailed',
    username: 'wrong_username',
    password: 'wrong_password',
    csrf: 'authenticity_token',
    csrf_value: helpers.token()
};

var server = http.createServer(function (req, res) {
    if (req.url == '/basic_auth') {
        let authString = "Basic : " + new Buffer(fields.username + ":" + fields.password).toString('base64');
        if (req.headers.authorization !== authString) {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="example"');
            res.end('Access denied');
        } else {
            res.statusCode = 200;
            res.end('Access granted');
        }
    }

    else if (req.url == '/basic_auth_fail') {
        let authString = "Basic : " + new Buffer(fieldsFail.username + ":" + fieldsFail.password).toString('base64');
        if (req.headers.authorization !== authString) {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="example"');
            res.end('Access denied');
        } else {
            res.statusCode = 200;
            res.end('Access granted');
        }
    }

    // a page protected by an html login form
    else if (req.url == '/empty') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('');
    }

    // a page protected by an html login form
    else if (req.url == '/loginForm') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000' + fields.action + '" method="POST"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<button type="submit" formaction="http://localhost:8000' + fields.action + '" value="submit"/></form>');
    }

    /**
     *  Login form used with /connectRandomBody
     */
    else if (req.url == '/loginFormRnd') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000/connectRandomBody" method="POST"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<button type="submit" formaction="http://localhost:8000/connectRandomBody" value="submit"/></form>');
    }

    else if (req.url == '/notloginForm') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000' + fields.action + '" method="POST"><input type="text" name="comment"/>' +
            '<button type="not_submit" formaction="http://localhost:8000' + fields.action + '" value="submit"/></form>');
    }

    else if (req.url == '/no_button_formaction') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000' + fields.action + '" method="POST"><input type="text" name="comment"/>' +
            '<button type="not_submit" value="submit"/></form>');
    }

    // action url of login form.
    // Returns 302 if 'user', 'password', and sessid cookie match.
    // Returns 403 else.
    else if (req.url == '/connect') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid');
            return;
        }

        let body = '';

        req.on('data', function (data) {
            body += data;

            // Prevent malicious flooding
            if (body.length > 1e6) req.connection.destroy();
        });

        req.on('end', function () {
            var post = qs.parse(body);
            if (post.password == fields.password && post.username == fields.username) {
                res.writeHead(302, { 'Location': '/content' });
                sessionHelper.connectSession(req);
                res.end();
            } else {
                res.writeHead(403);
                res.end('bad request : wrong credentials' /*+ Math.floor(Math.random() * 2)*/);
            }
        });
    }

    /**
     * Use for testing 2 different body with a random String at the end.
     */
    else if (req.url == '/connectRandomBody') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid');
            return;
        }

        let body = '';

        req.on('data', function (data) {
            body += data;

            // Prevent malicious flooding
            if (body.length > 1e6) req.connection.destroy();
        });

        req.on('end', function () {
            var post = qs.parse(body);
            if (post.password == fields.password && post.username == fields.username) {
                res.writeHead(302, { 'Location': '/content' });
                sessionHelper.connectSession(req);
                res.end();
            } else {
                res.writeHead(403);
                res.end('bad request : wrong credentials' + Math.random() * Math.random());
            }
        });
    }

    // a page protected by an html login form
    else if (req.url == '/loginFormFailed') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="http://localhost:8000' + fieldsFail.action + '" method="POST"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<button type="submit" formaction="http://localhost:8000' + fieldsFail.action + '" value="submit"/></form>');
    }

    // action url of login form.
    // Returns 302 if 'user', 'password', and sessid cookie match.
    // Returns 403 else.
    else if (req.url == '/connectFailed') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid');
            return;
        }

        let body = '';

        req.on('data', function (data) {
            body += data;

            // Prevent malicious flooding
            if (body.length > 1e6) req.connection.destroy();
        });

        req.on('end', function () {
            var post = qs.parse(body);
            if (post.password == fieldsFail.password && post.username == fieldsFail.username) {
                res.writeHead(302, { 'Location': '/content' });
                sessionHelper.connectSession(req);
                res.end();
            } else {
                res.writeHead(403);
                res.end('bad request : wrong credentials');
            }
        });
    }

    // typical content page
    // if connected (valid sessid) : contains a log out link
    // if not connected : does not contain any log out link
    else if (req.url == '/content') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (sessionHelper.isConnected(req)) {
            res.end('<html><head><body><a href="/logout">disconnect</a><body></head></html>');
        } else {
            res.end('<html><head><body>loremipsum<body></head></html>');
        }
    }
});

describe('checks/server/check_bruteforce.js', function () {
    this.timeout(50000);
    before(() => {
        server.listen(8000);
    });

    it('basic auth works', function (done) {
        this.timeout(2000);

        let check = new CheckBruteforce(new Target('http://localhost:8000/basic_auth', CONSTANTS.TARGETTYPE.SERVER));

        check.check(new CancellationToken()).then(() => {
            done(new Error("expected issue was not raised"));
        }).catch((issues) => {
            if (issues && issues.length > 0 &&
                issues[0].errorContent &&
                issues[0].errorContent.indexOf(fields.username) !== -1 &&
                issues[0].errorContent.indexOf(fields.password) !== -1) {
                done();
            }
            else
                done(new Error("expected issue was not raised"));
        });
    });

    it('basic auth failed', function (done) {
        this.timeout(5000);

        let check = new CheckBruteforce(new Target('http://localhost:8000/basic_auth_fail', CONSTANTS.TARGETTYPE.SERVER));

        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            done(new Error("expected issue was not raised"));
        });
    });

    it('form auth works', function (done) {
        this.timeout(10000);
        var check = new CheckBruteforce(new Target('http://localhost:8000/loginForm', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done(new Error("expected issue was not raised"));
        }).catch((issues) => {
            if (issues && issues.length > 0 &&
                issues[0].errorContent &&
                issues[0].errorContent.indexOf(fields.username) !== -1 &&
                issues[0].errorContent.indexOf(fields.password) !== -1) {
                done();
            }
            else {
                console.log(issues[0].errorContent);
                done(new Error("expected issue was not raised"));
            }
        });
    });

    it('form auth works but with random string at the end', function (done) {
        this.timeout(10000);
        var check = new CheckBruteforce(new Target('http://localhost:8000/loginFormRnd', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 &&
                issues[0].errorContent &&
                issues[0].errorContent.indexOf(fields.username) !== -1 &&
                issues[0].errorContent.indexOf(fields.password) !== -1) {
                done(new Error("expected issue was not raised"));
            }
            else {
                done();
            }
        });
    });

    it('form auth does not work', function (done) {
        this.timeout(10000);

        var check1 = new CheckBruteforce(new Target('http://localhost:8000/loginFormFailed', CONSTANTS.TARGETTYPE.SERVER));
        check1.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            done(new Error("expected issue was not raised"));
        });
    });

    it('not a login form', function (done) {
        this.timeout(10000);
        var check1 = new CheckBruteforce(new Target('http://localhost:8000/notloginForm', CONSTANTS.TARGETTYPE.SERVER));
        check1.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            done(new Error("expected issue was not raised"));
        });
    });

    it('no formaction', function (done) {
        this.timeout(10000);
        var check1 = new CheckBruteforce(new Target('http://localhost:8000/no_button_formaction', CONSTANTS.TARGETTYPE.SERVER));
        check1.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            done(new Error("expected issue was not raised"));
        });
    });

    it('is not html', function (done) {
        this.timeout(10000);
        var check1 = new CheckBruteforce(new Target('http://localhost:8000/empty', CONSTANTS.TARGETTYPE.SERVER));
        check1.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            done(new Error("expected issue was not raised"));
        });
    });

    it('is cancellable', function (done) {
        this.timeout(2000);
        var ct = new CancellationToken();

        var check1 = new CheckBruteforce(new Target('http://localhost:8000/get_form', CONSTANTS.TARGETTYPE.SERVER));

        check1.check(ct).then((issues) => {
            done(new Error('fail'));
        }).catch((e) => {
            if (e.cancelled) done();
        });
        ct.cancel();
    });

    after(() => {
        server.close();
    });
});