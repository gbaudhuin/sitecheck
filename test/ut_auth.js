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

var assert = require('assert');
//var request = require('../src/requestwrapper.js');
var request = require('request');
var fs = require('fs-extra');
var randomstring = require("randomstring");
//request = request.defaults({ jar: true })
describe('auth', function () {
    it.only('is ok', function (done) {
        this.timeout(15000);
        request.get({ url: "https://twitter.com/", timeout: 1000, jar : true }, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var cookies = res.headers['set-cookie'];
                var a = 99;
                var r = body.match(/value=\"([0123456789abcdef]+)\" name=\"authenticity_token\"/i);
                var authenticity_token = r[1];
                request.post({
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'accept-encoding': 'gzip, deflate, br',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
                    },
                    url: "https://twitter.com/sessions",
                    form: {
                        'session[username_or_email]': '',
                        'session[password]': '',
                        'remember_me': '1',
                        'return_to_ssl': 'true',
                        'scribe_log': '',
                        'redirect_after_login': '/',
                        'authenticity_token': authenticity_token
                    },
                    timeout: 1000,
                    jar: true, gzip: true
                }, function (err, res, body) {
                    if (!err && res.statusCode == 302) {
                        request.get({
                            headers: {
                                'content-type': 'application/x-www-form-urlencoded',
                                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'accept-encoding': 'gzip, deflate, br',
                                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
                            },
                            url: "https://twitter.com/",
                            timeout: 1000,
                            jar: true,
                            gzip: true
                        }, function (err, res, body2) {
                            if (!err && res.statusCode == 200) {
                                var re = body2.match(/class=\"DashboardProfileCard-b/i);
                                if (re) {
                                    console.log("connecté !");
                                    done();
                                }
                            }
                            
                        });
                        var re = body.match(/value=\"([0123456789abcdef]+)\" name=\"authenticity_token\"/i);
                        var r = 9;
                    }
                });
            }
        });
    });
});