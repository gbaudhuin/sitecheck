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
var isRelativeUrl = require('is-relative-url');
var request = require('../src/requestwrapper.js');
var CancellationToken = require('./cancellationToken.js');
var Url = require('url');
var inputVector = require('./inputVector.js');

var fieldsUser = ["user", "username", "name", "email", "log", "id", "login", "usr", "u"];
var fieldsPassword = ["password", "pwd", "p", "pass"];
var fieldsCsrf = [
    'csrf_token',
    'csrfname',                   // OWASP CSRF_Guard
    'crsftoken',                  // OWASP CSRF_Guard
    'anticsrf',                   // AntiCsrfParam.java
    '_requestverificationtoken',  // AntiCsrfParam.java
    'token',
    'csrf',
    'yii_csrf_token',             // http://www.yiiframework.com//
    'yii_anticsrf',               // http://www.yiiframework.com//
    '[_token]',                   // Symfony 2.x
    '_csrf_token',                // Symfony 1.4
    'csrfmiddlewaretoken',        // Django 1.5
    'form_key',                   // Magento 1.9
    'authenticity_token'          // Twitter
];

/**
 * A class that automatically finds login form in a webpage and gets connection data to allow subsequent automatic login to a website
 */
class AutoLogin {
    /**
     * Constructor
     * @param {String} username - username
     * @param {String} password - password
     * @param {String} absoluteLoginFormUri - absolute uri that contains the login form
     */
    constructor(absoluteLoginFormUri) {
        if (absoluteLoginFormUri && isRelativeUrl(absoluteLoginFormUri)) throw new Error("Uri cannot be relative. Uri must be absolute.");
        this.loginFormUri = absoluteLoginFormUri;
        this.jar = request.jar();
        this.loginInputVector = {};
    }

    findLoginInputVector(callback) {
        var self = this;
        request.get({ url: self.loginFormUri, timeout: 5000, cancellationToken: new CancellationToken(), jar: self.jar }, (err, res, body) => {
            if (err && err.cancelled) {
                return;
            }
            let ivs = inputVector.parseHtml(body);
            for (let iv of ivs) {
                for (let field of iv.fields) {
                    let fieldNameLower = '';
                    if (field.name) fieldNameLower = field.name.toLowerCase();
                    if (fieldNameLower.indexOf("user") !== -1 || fieldsUser.includes(fieldNameLower)) {
                        iv.userField = field.name;
                    }
                    else if (fieldNameLower.indexOf("password") !== -1 || fieldsPassword.includes(fieldNameLower)) {
                        if (field.type.toLowerCase() == "password") {
                            iv.passwordField = field.name;
                        }
                    }
                    else if (fieldsCsrf.includes(fieldNameLower)) {
                        if (field.type.toLowerCase() == "hidden") {
                            if (field.value) {
                                iv.csrfField = field.name;
                                iv.csrfValue = field.value;
                            }
                        }
                    }
                }

                if (iv.url && iv.passwordField) {
                    self.loginInputVector = iv;
                    callback(null, { fields: self.fields, jar: self.jar });
                    return;
                }
            }

            callback(null, null);
        });
    }

    login(callback) {
        var self = this;
        var iv = this.loginInputVector;
        if (!iv.url || !iv.passwordField) throw new Error("this.loginInputVector.url or this.loginInputVector.passwordField are not set. Login operation aborted.");
        var req_func;
        if (iv.method && iv.method == "post") req_func = request.post;
        else req_func = request.get;

        var f = {};
        f[iv.userField] = 'v.crasnier@peoleo.fr';
        f[iv.passwordField] = 'azerty123';
        f[iv.csrfField] = iv.csrfValue;

        var action = Url.resolve(this.loginFormUri, iv.url);
        req_func({
            url: action, timeout: 5000, cancellationToken: new CancellationToken(),
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'accept-encoding': 'gzip, deflate, br',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
            },
            form: f,
            jar: self.jar
        }, (err, res, body) => {
            if (err && err.cancelled) {
                return;
            }

            if (res.statusCode == 302) {
                request.get({
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'accept-encoding': 'gzip, deflate, br',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
                    },
                    url: "https://twitter.com/",
                    timeout: 1000,
                    cancellationToken: new CancellationToken(),
                    jar : self.jar
                }, function (err, res, body2) {
                    if (!err && res.statusCode == 200) {
                        var re = body2.match(/class=\"DashboardProfileCard/i);
                        if (re) {
                            callback(null, true);
                        }
                        else {
                            callback(new Error("not connected"), null);
                        }
                    }
                });
            }
        });
    }
}

module.exports = AutoLogin;