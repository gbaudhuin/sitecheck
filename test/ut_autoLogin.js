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
var autoLogin = require('../src/autoLogin.js');
var tough = require('tough-cookie');
var async = require('async');
var server = http.createServer(function (req, res) {
    if (req.url == '/login') {
        var contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/login.html", 'utf8');
        var fields = {
            action: 'session.html',
            username: 'user123',
            password: 'password',
            csrf: 'authenticity_token',
            csrf_value: 'zfz4f4zf94zf9zf94zf'
        };

        contents = contents.replace(/{{action_field}}/g, fields.action);
        contents = contents.replace(/{{username_field}}/g, fields.username);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        var cookiejar = new tough.CookieJar();
        var c = new tough.Cookie({ key: 'sess_id', value: 'BAh7CSIKZmxhc2hJQzonQWN0aW9uQ29udHJvbGxlcjo6Rmxhc2g6OkZsYXNo', maxAge: "86400" });
        cookiejar.setCookieSync(c, 'http://localhost:8000' + req.url);
        var cookieStr = cookiejar.getCookiesSync('http://localhost:8000' + req.url);
        res.setHeader('set-cookie', cookieStr);
        res.end(contents);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('AutoLogin module', function () {
    before(function () {
        server.listen(8000);
    });

    
    it('is able to log into various real world websites', function (done) {
        this.timeout(10000);

        // GOOGLE
        // sitecheck.ut@gmail.com
        // sitechec

        // TWITTER
        // sitecheck.ut@gmail.com
        // sitechec

        var accounts = [
            { name: 'Twitter', url: 'https://twitter.com/', user: 'sitecheck.ut@gmail.com', password: 'sitechec', loggedInCheckurl: 'https://twitter.com/', loggedInCheckRegex: /class=\"DashboardProfileCard/i },
            { name: 'Github', url: 'https://github.com/login', user: 'sitecheck.ut@gmail.com', password: 'sitechec1', loggedInCheckurl: 'https://github.com', loggedInCheckRegex: /aria-label=\"Create new/ },
            { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?title=Special:UserLogin', user: 'SitecheckUt', password: 'sitechec1', loggedInCheckurl: 'https://en.wikipedia.org/wiki/Main_Page', loggedInCheckRegex: /pt-userpage/ },
            { name: 'LinkedIn', url: 'https://www.linkedin.com/uas/login', user: 'sitecheck.ut@gmail.com', password: 'sitechec', loggedInCheckurl: 'https://www.linkedin.com/', loggedInCheckRegex: /ozidentity-container/ },
         //   { name: 'Amazon', url: 'https://www.amazon.fr/ap/signin?_encoding=UTF8&openid.assoc_handle=frflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.fr%2F%3Fref_%3Dnav_ya_signin', user: 'sitecheck.ut@gmail.com', password: 'Sitechec', loggedInCheckurl: 'https://www.amazon.fr/?ref_=nav_ya_signin&', loggedInCheckRegex: /nav_youraccount_btn/ },
          //  { name: 'Facebook', url: 'https://www.facebook.com/', user: 'sitecheck.ut@gmail.com', password: 'sitechec', loggedInCheckurl: 'https://www.facebook.com/', loggedInCheckRegex: /id=\"stream_pagelet/i }
        ];

        async.each(accounts, function (account, callback) {
            autoLogin(account.url, account.user, account.password, account.loggedInCheckurl, account.loggedInCheckRegex, (err, data) => {
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