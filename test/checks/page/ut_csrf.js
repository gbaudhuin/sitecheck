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
var inputVector = require('../../../src/inputVector.js');

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
    } else if (req.url == '/empty_body') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('');
    } else if (req.url == '/empty_body_2') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
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
        // Form enctype is "multipart/form-data"

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd" enctype="multipart/form-data">' +
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
    } else if (req.url == '/constantToken') {
        // A form only accessible in connected mode, with a constant token

        var constantCsrfToken = "ojiod5ef894e9:dzsfzf5f4";

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd" enctype="multipart/form-data">' +
                '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="blabla" value="blabla"/> ' +
                '<input type="hidden" name="csrf" value="' + constantCsrfToken + '"/> ' +
                '</form>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else if (req.url == '/uncheckedToken') {
        // A page only accessible in connected mode. Form's action url does not check token validity

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/actionpage">' +
                '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="' + fields.csrf + '" value="' + csrfToken + '"/> ' +
                '</form>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else if (req.url == '/actionpage') {
        // An action page that does not check csrf token

        res.writeHead(302, { "Content-Type": "text/html" });
        res.end('<html><body>' +
            '<div>hello</div>' +
            '</body></html>');
    } else if (req.url == '/formless') {
        // A page with no form

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<div>hello</div>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else if (req.url == '/falsepositive') {
        // A well known false positive ajax form

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="/abcd">' +
                '<input type="text" name="stripe-card-number"/>' +  // Stripe-like form
                '<input type="text" name="comment"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="blabla" value="blabla"/> ' +
                '</form>' +
                '</body></html>');
        } else {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end('restricted access');
        }
    } else if (req.url == '/unreachableaction') {
        // A form with an unreachable action url

        if (sessionHelper.isValidSession(req)) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<html><body>' +
                '<form action="http://zz9e79ge7t9g78e89eg486erg86erg8.com">' +
                '<input type="text" name="comment"/>' +
                '<input type="hidden" name="' + fields.csrf + '" value="' + csrfToken + '"/>' +
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
    this.timeout(50000);

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

    it('passes csrf protected forms', (done) => {
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

    it('detects unprotected forms', (done) => {
        let target = new Target('http://localhost:8000/no_token', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done(new Error("Expected issue not raised"));
        }).catch((value) => {
            done();
        });
    });

    it('detects unchecked cross session tokens', (done) => {
        let target = new Target('http://localhost:8000/uncheckedToken', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done(new Error("Expected issue not raised"));
        }).catch((value) => {
            done();
        });
    });

    it('detects constant csrf tokens', (done) => {
        let target = new Target('http://localhost:8000/constantToken', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done(new Error("Expected issue not raised"));
        }).catch((value) => {
            if (value && value.length && value[0].errorContent.indexOf("same accross") !== -1) {
                done();
            } else {
                done(new Error("Unexpected error"));
            }
        });
    });

    it('passes form-less pages', (done) => {
        let target = new Target('http://localhost:8000/formless', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done();
        }).catch((value) => {
            done(new Error("Unexpected issue raised"));
        });
    });

    it('passes unreachable pages', (done) => {
        let target = new Target('http://localhost:8001/unreachable', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done();
        }).catch((value) => {
            done(new Error("Unexpected issue raised"));
        });
    });

    it('passes false positives', (done) => {
        let target = new Target('http://localhost:8000/falsepositive', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done();
        }).catch((value) => {
            done(new Error("Unexpected issue raised"));
        });
    });

    it('passes a form with an unreachable action url', (done) => {
        // check_csrf must remain silent on this type of issue. It's SEO checks responsibility to raise this kind of issue.
        let target = new Target('http://localhost:8000/unreachableaction', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.check(ct).then((value) => {
            done();
        }).catch((value) => {
            done(new Error("Unexpected issue raised"));
        });
    });

    it('gets an error when getting another Token', (done) => {
        let target = new Target('http://localhost:8000/unreachableaction', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        let ct = new cancellationToken();
        check.getAnotherToken(ct, (err, data) => {
            if (err) {
                done();
            } else {
                done(new Error("Expected error not raised"));
            }
        });
        ct.cancel();
    });

    it('tries to access an inexistant URL', (done) => {
        let target = new Target('http://localhost:8000/not_a_login_url', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.getAnotherToken(ct, (err, data) => {
            if (err) {
                done(new Error("Expected error not raised"));
            } else {
                done();
            }
        });
    });

    it('is called with empty body', (done) => {
        let target = new Target('http://localhost:8000/empty_body', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.getAnotherToken(ct, (err, data) => {
            if (err) {
                done(new Error("Expected error not raised"));
            } else {
                done();
            }
        });
    });

    it('is called with empty inputVector', (done) => {
        let target = new Target('http://localhost:8000/empty_body', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.getCsrfField(null);
        done();
    });

    it('is called with no field in inputVector', (done) => {
        let target = new Target('http://localhost:8000/empty_body', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.getCsrfField({fields: ''});
        done();
    });

    it('is does not have an obvious token name', (done) => {
        var iv = new inputVector.InputVector('http://localhost:8000/no_token', 'not_obvious', 'get', [{type: 'hidden', name: 'token_not_obvious'}, {type: 'hidden', name: 'token_not_obvious'}], null);
        let target = new Target('http://localhost:8000/no_token', CONSTANTS.TARGETTYPE.PAGE);
        let check = new CheckCsrf(target);
        check.getCsrfField(iv);
        done();
    });

    it.skip('hacks Concrete5 < v5.7.3.2', (done) => {
        params.loginPage = 'https://progressive-sports.co.uk/login';
        params.user = 'sitecheck.ut@gmail.com';
        params.password = 'sitechec';

        // get a connected session
        autoLogin.login(params.loginPage, params.user, params.password, ct, (err, data) => {
            if (err) {
                done(new Error("login failed."));
            } else {
                if (!data) done(new Error("No data"));
                if (!data.cookieJar) done(new Error("No data.cookieJar"));

                // we're logged in, preserve cookies for all subsequent requests
                request.sessionJar = data.cookieJar;

                let target = new Target('https://progressive-sports.co.uk/profile/edit/', CONSTANTS.TARGETTYPE.PAGE);
                let check = new CheckCsrf(target);
                check.check(ct).then((value) => {
                    done(new Error("Expected issue not raised"));
                }).catch((value) => {
                    done();
                });
            }
        });
    });

    it.skip(' is able to check a woocommerce.com form is correctly protected', (done) => {
        params.loginPage = 'https://woocommerce.com/my-account/';
        params.user = 'sitecheck.ut@gmail.com';
        params.password = 'sitechec';

        // get a connected session
        autoLogin.login(params.loginPage, params.user, params.password, ct, (err, data) => {
            if (err) {
                done(err);
            } else {
                if (!data) done(new Error("No data"));
                if (!data.cookieJar) done(new Error("No data.cookieJar"));

                // we're logged in, preserve cookies for all subsequent requests
                request.sessionJar = data.cookieJar;

                let target = new Target('https://woocommerce.com/my-account/', CONSTANTS.TARGETTYPE.PAGE);
                let check = new CheckCsrf(target);
                check.check(ct).then((value) => {
                    done();
                }).catch((value) => {
                    done(new Error("Unexpected issue raised"));
                });
            }
        });
    });

    after(() => {
        server.close();
    });
});