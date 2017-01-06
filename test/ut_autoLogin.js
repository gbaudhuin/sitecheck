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

var http = require('http');
var fs = require('fs-extra');
var request = require('../src/requestwrapper.js');
var async = require('async');
var qs = require('querystring');
var AutoLogin = require('../src/autoLogin.js');
var helpers = require('../src/helpers.js');
var CancellationToken = require('../src/cancellationToken.js');
var SessionHelper = require('./helpers/sessionHelper.js');

var sessionHelper = new SessionHelper();
var autoLogin = new AutoLogin();
var ctReq2 = new CancellationToken();
var countReq2 = 0;

var fields = {
    action: 'connect',
    user: 'user',
    password: 'password',
    csrf: 'authenticity_token',
    csrf_value: helpers.token()
};

var account = {
    name: 'local form page',
    url: 'http://localhost:8000/formlogin',
    user: "SitecheckUt",
    password: "sitechec"
};

let bodyError = '<form action="' + fields.action + '" method="get"><input type="text" name="username" value="value"/><input type="password" name="password" value="value"/><input type="submit" name="submit"/></form>';
let bodyFirstRequestBug = '<form action="http://localhost:8001/" method="get"><input type="text" name="username"/><input type="password" name="password"/>' +
    '<button type="submit" value="submit"/></form>';

function shiftRand() {
    var r = 0;
    var raw = 0;
    var maxint = Math.pow(2, 32);
    for (var i = 1000000; i > 0; i--) {
        raw = parseInt(Math.random() * maxint);
        for (var j = 0; j < 15; j++) {
            r = raw & 90;
            raw = raw >> 1;
            i--;
        }
    }
    return r * raw;
}

/*let nodata = '<form action="http://localhost:8000' + fields.action + '" method="POST">' +
            '<input value="submit"/></form>';*/

var server = http.createServer(function (req, res) {
    // page with a login form and a session cookie
    if (req.url == '/formlogin') {
        sessionHelper.manageSession(req, res);

        let contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/formlogin.html", 'utf8');

        contents = contents.replace(/{{action_field}}/g, fields.action);
        contents = contents.replace(/{{username_field}}/g, fields.user);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(contents);
    }

    else if (req.url == '/formloginFail') {
        sessionHelper.manageSession(req, res);

        let contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/formlogin.html", 'utf8');

        contents = contents.replace(/{{action_field}}/g, 'http://localhost:8000/connectFail');
        contents = contents.replace(/{{username_field}}/g, fields.user);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(contents);
    }

    else if (req.url == '/urlIsHost') {
        sessionHelper.manageSession(req, res);

        let contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/formlogin.html", 'utf8');

        contents = contents.replace(/{{action_field}}/g, '');
        contents = contents.replace(/{{username_field}}/g, fields.user);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(contents);
    }

    else if (req.url == '/crashReq2') {
        sessionHelper.manageSession(req, res);

        let contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/formlogin.html", 'utf8');

        contents = contents.replace(/{{action_field}}/g, 'http://localhost:8000/crashWhenNoPassword');
        contents = contents.replace(/{{username_field}}/g, fields.user);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(contents);
    }

    else if (req.url == '/noBody') {
        sessionHelper.manageSession(req, res);

        let contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/formlogin.html", 'utf8');

        contents = contents.replace(/{{action_field}}/g, 'no_body');
        contents = contents.replace(/{{username_field}}/g, fields.user);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(contents);
    }

    else if (req.url == '/nodata') {
        res.writeHead(403, { "Content-Type": "text/html" });
        res.end(bodyError);
    }

    else if (req.url == '/firstRequestBug') {
        sessionHelper.manageSession(req, res);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(bodyFirstRequestBug);
    }

    else if (req.url == "/no_action") {
        res.writeHead(200);
        res.end(bodyError);
    }

    else if (req.url == "/no_action_no_code") {
        res.writeHead(402, { "Content-Type": "text/html" });
        res.end(bodyError);
    }

    // action url of login form.
    // Returns 302 if 'user', 'password', and sessid cookie match.
    // Returns 403 else.
    else if (req.url == '/connect') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid' + shiftRand());
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
            if (post.password == account.password && post.user == account.user) {
                res.writeHead(302, { 'Location': '/content' });
                sessionHelper.connectSession(req);
                res.end();
            } else {
                res.writeHead(403);
                res.end('bad request : wrong credentials ' + shiftRand());
            }
        });
    }

    else if (req.url == '/connectFail') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid' + shiftRand());
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
            if (post.password == account.password && post.user == account.user) {
                res.writeHead(403, { 'Location': '/content' });
                sessionHelper.connectSession(req);
                res.end('Connected ! ' + shiftRand());
            }
            else {
                res.writeHead(403);
                res.end('bad request : wrong credentials ' + shiftRand());
            }
        });
    }

    else if (req.url == '/crashWhenNoPassword') {
        sessionHelper.manageSession(req, res);
        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid' + shiftRand());
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
            if (post.password == account.password && post.user == account.user) {
                res.writeHead(302, { 'Location': '/content' });
                res.end('Connected ! ' + shiftRand());
            }
            else if (post.password === "") {
                countReq2 = 1;
                res.writeHead(500);
                res.end('Server error ' + shiftRand());
            }
            else {
                res.writeHead(403);
                res.end('bad request : wrong credentials' + shiftRand());
            }
        });
    }

    else if (req.url == '/no_body') {
        sessionHelper.manageSession(req, res);
        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid' + shiftRand());
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
            if (post.password == account.password && post.user == account.user) {
                res.writeHead(302, { 'Location': '/content' });
                res.end('Connected ! ' + shiftRand());
            }
            else if (post.password === "") {
                res.end(null);
            }
            else {
                res.writeHead(403);
                res.end('bad request' + shiftRand());
            }
        });
    }

    else if (req.url == '/doesnotexists') {
        sessionHelper.manageSession(req, res);

        // user must have a valid existing sessid to connect
        if (!sessionHelper.isValidSession(req)) {
            res.writeHead(403);
            res.end('bad request : invalid sessid' + shiftRand());
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
            if (post.password == account.password && post.user == account.user) {
                res.writeHead(404);
                sessionHelper.connectSession(req);
                res.end();
            } else {
                res.writeHead(403);
                res.end('bad request : wrong credentials ' + shiftRand());
            }
        });
    }

    // 404
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request' + shiftRand());
    }
});

describe('AutoLogin module', function () {
    before(function () {
        server.listen(8000);
    });

    it('Crash when req2', function (done) {
        this.timeout(15000);
        autoLogin.login('http://localhost:8000/crashReq2', account.user, account.password, ctReq2, (err, data) => {
        });
        done();
    });

    it('No body', function (done) {
        this.timeout(15000);
        autoLogin.login('http://localhost:8000/noBody', account.user, account.password, ctReq2, (err, data) => {
            done();
        });
    });

    it('Log in local form page', function (done) {
        autoLogin.login(account.url, account.user, account.password, new CancellationToken(), (err, data) => {
            if (err || data.user !== account.user || data.password !== account.password) {
                done(new Error(account.user + " login failed."));
            } else {
                done();
            }
        });
    });

    it('First request bug', function (done) {
        this.timeout(5000);
        let autoLogin = new AutoLogin();
        let liv = autoLogin.findLoginInputVectorInContent(bodyFirstRequestBug);
        autoLogin.getFailureIndicators('http://localhost:8000/firstRequestBug', liv, request.jar(), new CancellationToken(), (err, data) => {
            if (err) {
                done();
            } else {
                done(new Error("expected issue was not raised"));
            }
        });
    });

    it('Url is host', function (done) {
        autoLogin.login('http://localhost:8000/urlIsHost', account.user, account.password, new CancellationToken(), (err, data) => {
            if (err || data.user !== account.user || data.password !== account.password) {
                done();
            } else {
                done(new Error(account.user + " login failed."));
            }
        });
    });

    it('Log in local form page but fail', function (done) {
        autoLogin.login('http://localhost:8000/formloginFail', account.user, account.password, new CancellationToken(), (err, data) => {
            if (err || data.user !== account.user || data.password !== account.password) {
                done();
            } else {
                done();
            }
        });
    });

    it('No user/password fields', function (done) {
        autoLogin.getFormData({
            url: 'http://localhost:8000/connect',
            method: 'POST',
            fields:
            [{ name: 'username', type: 'text' },
            { name: 'password', type: 'password' },
            { type: 'submit', value: 'submit', checked: 'submit' }],
        }, 'user', 'password');
        done();
    });

    it('Contains relative URI', function (done) {
        autoLogin.login('/relativeURI', account.user, account.password, new CancellationToken(), (err, data) => {
            if (err && data === undefined) {
                done();
            }
        });
    });

    it('Is unreachable', function (done) {
        autoLogin.login("http://localhost:8000/fail", account.user, account.password, new CancellationToken(), (err, data) => {
            if (err && data === undefined) {
                done();
            }
        });
    });



    it('Has no action', function (done) {
        let liv = autoLogin.findLoginInputVectorInContent(bodyError);
        autoLogin.logInInputVector('http://localhost:8000/no_action', liv, account.user, account.password, request.jar(), new CancellationToken(), (err, data) => {
            if (err && data === undefined && liv.isLoginForm()) {
                done();
            }
            else {
                done(new Error('Expected error not thrown'));
            }
        });
    });

    it('No data', function (done) {
        let autoLogin = new AutoLogin();
        this.timeout(10000);
        let ct = new CancellationToken();
        autoLogin.getFailureIndicators('http://localhost:8000/nodata', [], request.jar(), ct, (err, data) => {
            done();
        });
        ct.cancel();
    });

    it('Has no action and no code', function (done) {
        let liv = autoLogin.findLoginInputVectorInContent(bodyError);
        liv.enctype = "multipart/form-data";
        autoLogin.logInInputVector('http://localhost:8000/no_action_no_code', liv, account.user, account.password, request.jar(), new CancellationToken(), (err, data) => {
            if (err && data === undefined) {
                done();
            }
        });
    });

    it('is cancellable', function (done) {
        let ct = new CancellationToken();
        autoLogin.login(account.url, account.user, account.password, ct, (err, data) => {
            if (err && data === undefined) {
                done();
            }
        });
        ct.cancel();
    });

    it.skip('is able to log into various real world websites', function (done) {
        this.timeout(60000);

        // GOOGLE
        // sitecheck.ut@gmail.com
        // sitechec
        var accounts = [
            //slow  { name: 'Reddit', url: 'https://www.reddit.com/', user: 'SitecheckUt', password: 'sitechec' },
            { name: 'WooCommerce', url: 'https://woocommerce.com/my-account/', user: 'sitecheck.ut@gmail.com', password: 'sitechec' },
            { name: 'Twitter', url: 'https://twitter.com/', user: 'sitecheck.ut@gmail.com', password: 'sitechec' },
            { name: 'Github', url: 'https://github.com/login', user: 'sitecheck.ut@gmail.com', password: 'sitechec1' },
            { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?title=Special:UserLogin', user: 'SitecheckUt', password: 'sitechec1' },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/uas/login', user: 'sitecheck.ut@gmail.com', password: 'sitechec' },

            // failed ones :
            // unknown cause (bad action url ?) : { name: 'Pinterest', url: 'https://fr.pinterest.com/', user: 'sitecheck.ut@gmail.com', password: 'sitechec', loggedInCheckurl: 'https://fr.pinterest.com/', loggedInCheckRegex: /usernameLink/},
            // unknown cause { name: 'Amazon', url: 'https://www.amazon.fr/ap/signin?_encoding=UTF8&openid.assoc_handle=frflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.fr%2F%3Fref_%3Dnav_ya_signin', user: 'sitecheck.ut@gmail.com', password: 'Sitechec', loggedInCheckurl: 'https://www.amazon.fr/?ref_=nav_ya_signin&', loggedInCheckRegex: /nav_youraccount_btn/ },
            // No js (seems to try to detect cookies via js) : { name: 'Facebook', url: 'https://www.facebook.com/', user: 'sitecheck.ut@gmail.com', password: 'sitechec', loggedInCheckurl: 'https://www.facebook.com/', loggedInCheckRegex: /id=\"stream_pagelet/i }
        ];

        async.each(accounts, function (account, callback) {
            autoLogin.login(account.url, account.user, account.password, new CancellationToken(), (err, data) => {
                if (err) {
                    callback(new Error(account.name + " login failed."));
                } else {
                    callback();
                }
            });
        }, function (err) {
            // if any of the accounts failed login, err would equal the login error
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    after(function () {
        server.close();
    });
});