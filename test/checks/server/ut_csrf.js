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
const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
var cancellationToken = require('../../../src/cancellationToken.js');
var autoLogin = require('../../../src/autoLogin.js');
var qs = require('querystring');
var tough = require('tough-cookie');
var request = require('../../../src/requestwrapper.js');

var ut_user = "SitecheckUt";
var ut_password = "sitechec";
var sessid = Token();
var csrftoken = Token();

var server = http.createServer(function (req, res) {
    if (req.url == '/login') {
        var cookiejar = new tough.CookieJar();
        var c = new tough.Cookie({ key: 'sessid', value: sessid, maxAge: "86400" });
        cookiejar.setCookieSync(c, 'http://localhost:8000' + req.url);
        var cookieStr = cookiejar.getCookiesSync('http://localhost:8000' + req.url);
        res.writeHead(200, { "Content-Type": "text/html", 'set-cookie': cookieStr });

        res.end('<form action="/session" method="POST"><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="tok" value="' + Token() + '"/></form>');
    } else if (req.url == '/session') {
        let cookies = parseCookies(req);
        if (cookies.sessid && cookies.sessid == sessid) {
            var body = '';

            req.on('data', function (data) {
                body += data;

                // Prevent malicious flooding
                if (body.length > 1e6) req.connection.destroy();
            });

            req.on('end', function () {
                var post = qs.parse(body);
                if (post.password == ut_password && post.username == ut_user) {
                    res.writeHead(302, { 'Location': '/content' });
                    res.end('bad request : wrong sessid');
                } else {
                    res.writeHead(403);
                    res.end('bad request : wrong sessid');
                }
            });
        } else {
            res.writeHead(403);
            res.end('bad request : wrong sessid');
        }
    } else if (req.url == '/content') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><head><body>content<body></head></html>');
    } else if (req.url == '/csrf_ok') {
        let cookies = parseCookies(req);
        if (cookies.sessid && cookies.sessid == sessid) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
                '<input type="submit" value="submit"/><input type="hidden" name="yii_anticsrf" value="' + csrftoken + '"/></form>');
        } else {
            res.writeHead(403);
            res.end('Restricted access');
        }
    } else {
        res.writeHead(404);
        res.end('wrong request');
    }
    /*if (req.url == '/csrf_ok') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="yii_anticsrf" value="' + Token() + '"/></form>');
    } else if (req.url == '/no_form') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<li></li>');
    } else if (req.url == '/no_connection_form') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form></form>');
    } else if (req.url == '/no_hidden') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/></form>');
    } else if (req.url == '/no_csrf_token') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="not_found" value="' + Token() + '"/></form>');
    } else if (req.url == '/timeout_occured') {
        setTimeout(() => {
            res.end();
        }, 3000);
    }
    else if (req.url == '/crsf_doesnt_change') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end('<form><input type="text" name="username"/><input type="password" name="password"/>' +
            '<input type="submit" value="submit"/><input type="hidden" name="not_found" value="a5E984JYunG95Ip1WSc6"/></form>');
    }
    else {
        res.end('wrong request');
    }*/
});

function Token() {
    var rand = function () {
        return Math.random().toString(36).substr(2); // remove `0.`
    };

    var token = function () {
        return rand() + rand(); // to make it longer
    };

    return token();
}

function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });// jshint ignore:line

    return list;
}

describe('checks/server/check_csrf.js', function () {
    this.timeout(15000);
    before(() => {
        server.listen(8000);
    });
    it('detects missing CSRF token', (done) => {
        var ct = new cancellationToken();
        var check_csrf = require('../../../src/checks/server/check_csrf.js');

        var loginData = {
            url: 'http://localhost:8000/login',
            user: ut_user,
            password: ut_password,
            loggedInCheckurl: 'http://localhost:8000/content',
            loggedInCheckRegex: /content/
        };

        autoLogin(loginData.url, loginData.user, loginData.password, loginData.loggedInCheckurl, loginData.loggedInCheckRegex, (err, data) => {
            if (err) {
                done(new Error(loginData.name + " login failed."));
            } else {
                if (!data) done(new Error("No data"));
                if (!data.cookieJar) done(new Error("No data.cookieJar"));

                // we're logged in, preserve cookies for all subsequent requests
                request.sessionJar = data.cookieJar;

                var check = new check_csrf(new Target('http://localhost:8000/csrf_ok', CONSTANTS.TARGETTYPE.SERVER));
                let p1 = new Promise(function (resolve, reject) {
                    check.check(ct)
                        .then((issues) => {
                            if (issues) {
                                reject(new Error('Unexpected issue happened'));
                            }
                            else {
                                resolve();
                            }
                        })
                        .catch((e) => {
                            reject(e);
                        });
                });


                Promise.all([p1])
                    .then(() => {
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            }
        });

        /*
        check_csrf.authData = { url: 'https://www.reddit.com/', user: 'SitecheckUt', password: 'sitechec', loggedInCheckurl: 'https://www.reddit.com/', loggedInCheckRegex: /reddit.com\/\logout/ };
        var check = new check_csrf(new Target('http://localhost:8000/csrf_ok', CONSTANTS.TARGETTYPE.SERVER));
        let p1 = new Promise(function (resolve, reject) {
            check.check(ct)
                .then((issues) => {
                    if (issues) {
                        reject(new Error('Unexpected issue happened'));
                    }
                    else {
                        resolve();
                    }
                })
                .catch((e) => {
                    reject(e);
                });
        });

        Promise.all([p1])
            .then(() => {
                console.log(123);
                done();
            })
            .catch((e) => {
                console.log(456);
                done(e);
            });
        */
    });
    
    after(() => {
        server.close();
    });
});