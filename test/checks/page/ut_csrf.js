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
//var tough = require('tough-cookie');
var Promise = require('bluebird');

var helpers = require('../../../src/helpers.js');
var Target = require('../../../src/target.js');
var cancellationToken = require('../../../src/cancellationToken.js');
var AutoLogin = require('../../../src/autoLogin.js');
var request = require('../../../src/requestwrapper.js');
var SessionHelper = require('../../helpers/sessionHelper.js');
var CheckCsrf = require('../../../src/checks/page/check_csrf.js');
const CONSTANTS = require('../../../src/constants.js');
var params = require('../../../src/params.js');

var autoLogin = new AutoLogin();
var sessionHelper = new SessionHelper();
var ct = new cancellationToken();

var fields = {
    action: '/connect',
    username: 'bob',
    password: 'passwd',
    csrf: 'authenticity_token',
    csrf_value: helpers.token()
};

var server = http.createServer(function (req, res) {
    let csrfToken = sessionHelper.getCsrfToken(req, res);

    if (req.url == '/login') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form action="/connect" method="POST"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/></form>');
    } else if (req.url == '/connect') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid');
            return;
        }

        var body = '';

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
                res.end('bad request : wrong credentials');
            }
        });
    } else if (req.url == '/content') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><head><body>content<body></head></html>');
    } else if (req.url == '/csrf_ok1') {
        // A page only accessible in connected mode

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd">' +
                    '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="' + fields.csrf + '" value="' + csrfToken + '"/> ' +
                '</form>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else if (req.url == '/csrf_ok2') {
        // A page with 1 or 2 forms. The second one only appears when connected

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd">' +
                '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="' + fields.csrf + '" value="' + csrfToken + '"/> ' +
                '</form>' +
                '<form><input type="text" name="comment2"/><input type="submit2" value="submit"/></form>' +
                '</body></html>');
        } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form><input type="text" name="comment2"/><input type="submit2" value="submit"/></form>' +
                '</body></html> ');
        }
    } else if (req.url == '/no_token') {
        // A form only accessible in connected mode, with no csrf token

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd">' +
                '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="blabla" value="blabla"/> ' +
                '</form>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else {
        res.writeHead(404);
        res.end('wrong request');
    }
});


describe('checks/server/check_csrf.js', function () {
    this.timeout(5000);

    before((done) => {
        server.listen(8000);

        params.loginPage = 'http://localhost:8000/login';
        params.user = fields.username;
        params.password = fields.password;

        // get a connected session
        autoLogin.login(params.loginPage, params.user, params.password, ct, (err, data) => {
            if (err) {
                done(new Error("login failed."));
            } else {
                if (!data) done(new Error("No data"));
                if (!data.cookieJar) done(new Error("No data.cookieJar"));

                // we're logged in, preserve cookies for all subsequent requests
                request.sessionJar = data.cookieJar;

                done();
            }
        });
    });

    it.only('passes csrf protected forms', (done) => {
        var urls = ['http://localhost:8000/csrf_ok1',
                    'http://localhost:8000/csrf_ok2'];

        Promise.each(urls, (item, index, length) => {
            let target = new Target(item, CONSTANTS.TARGETTYPE.PAGE);
            let check = new CheckCsrf(target);
            return check.check(ct);
        }).then((value) => {
            done();
        }).catch((value) => {
            done(new Error("Unexpected error"));
        });
    });

    it.only('detects unprotected forms', (done) => {
        let target = new Target('http://localhost:8000/no_token', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done(new Error("Expected issue not raised"));
        }).catch((value) => {
            done();
        });
    });
    
    after(() => {
        server.close();
    });
});