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

var Check = require('../../check');
var request = require('request');
var winston = require('winston');
var cheerio = require('cheerio');
const CONSTANTS = require("../../constants.js");

module.exports = class CheckCSRF extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
        this._token = "";
        this._form = "";
        this._body = "";
        this._tokenName = "";
        this._cancellationToken = "";
        this._token = "";
        this._token2 = "";
        this._body2 = "";
        this._form2 = "";
        this._usernameInput = "";
        this._submitButton = "";
        this._passwordInput = "";
        this._connectionUrl = "";
        this._COMMON_CSRF_NAMES = [
            'csrf_token',
            'CSRFName',                   // OWASP CSRF_Guard
            'CSRFToken',                  // OWASP CSRF_Guard
            'anticsrf',                   // AntiCsrfParam.java
            '_RequestVerificationToken',  // AntiCsrfParam.java
            'token',
            'csrf',
            'YII_CSRF_TOKEN',             // http://www.yiiframework.com//
            'yii_anticsrf',               // http://www.yiiframework.com//
            '[_token]',                   // Symfony 2.x
            '_csrf_token',                // Symfony 1.4
            'csrfmiddlewaretoken',        // Django 1.5
            'form_key',                   // Magento 1.9
            'authenticity_token'          // Twitter

        ];
        this._entropy = 0;
        this._conf = {
            "url": "https://twitter.com",
            "connectionUrl": "https://twitter.com/sessions",
            "IDS": {
                "username": "v.crasnier@peoleo.fr",
                "password": "azerty123"
            },
            "loginInputs": {
                "usernameInput": "",
                "passwordInput": ""
            },
            "connectionToken": "authenticity_token",
            "form": {
                'session[username_or_email]': "v.crasnier@peoleo.fr",
                'session[password]': "azerty123",
                'remember_me': '1',
                'return_to_ssl': 'true',
                'scribe_log': '',
                'redirect_after_login': '/',
                'authenticity_token': ""
            }
        };
    }

    _check(cancellationToken) {
        var self = this;
        self._cancellationToken = cancellationToken;
        var timeout = 3000;
        return new Promise((resolve, reject) => {
            request.get({ url: self._conf.url, timeout: timeout, cancellationToken: cancellationToken, jar: true }, (err, res, body) => {
                if (err && err.cancelled) {
                    reject(err);
                    return;
                }
                if (body.indexOf('<form') !== -1) {
                    let $ = cheerio.load(body);
                    $('form').each(function (f, elem) {
                        if ($(elem).attr('action') == self._conf.connectionUrl) {
                            self._conf.form.authenticity_token = ($(elem).find('input[name=' + self._conf.connectionToken + ']').attr('value'));
                        }
                        resolve();
                    });
                }
            });
            /*.then(self.checkIfPageHasAForm.bind(self))
            .then(self.checkIfFormIsAConnectionForm.bind(self))
            .then(self.checkIfFormHasAnHiddenInput.bind(self))
            .then(self.checkIfFormContainsToken.bind(self))
            .then(self.checkIfTokenChanges.bind(self))
            //.then(self.checkEntropy.bind(self))
            .then(self.testConnection.bind(self));*/
        })
            .then(self.login.bind(self));
    }

    login() {
        let self = this;
        return new Promise((resolve, reject) => {
            request.post({
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'accept-encoding': 'gzip, deflate, br',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
                },
                url: "https://twitter.com/sessions",
                form: self._conf.form,
                timeout: 1000,
                cancellationToken: self._cancellationToken,
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
                        cancellationToken: self._cancellationToken,
                        jar: true,
                        gzip: true
                    }, function (err, res, body2) {
                        if (!err && res.statusCode == 200) {
                            var re = body2.match(/class=\"DashboardProfileCard/);
                            if (re) {
                                console.log("connecté !");
                                resolve();
                            }
                        }
                    });
                }
            });
        });
    }

    checkIfPageHasAForm() {
        let self = this;
        if (self._body.indexOf('<form') !== -1) {
            let $ = cheerio.load(self._body);
            $('form').each(function () {
                if ($(this).find('input[type=submit],button[type=submit],button[type=button]').length > 0) {
                    self._form = $(this).html();
                    self._formAction = $(this).attr('action');
                }
            });
        }
    }

    checkIfFormHasAnHiddenInput() {
        let self = this;
        if (self._form !== '') {
            let $ = cheerio.load(self._form);
            let input = $('input[type="hidden"]');
            if (input.length === 0) {
                self._raiseIssue("CSRF_Token_Warning.xml", null, "The connection/inscription form at the Url '" + self.target.uri + "' does not have any hidden input", true);
            }
        }
    }

    checkIfFormContainsToken() {
        let self = this;
        if (self._form !== '') {
            let $ = cheerio.load(self._form);
            let found = false;
            $('input[type="hidden"]').each(function () {
                let input = $(this);
                self._COMMON_CSRF_NAMES.forEach((name) => {
                    if (input.attr('name') == name) {
                        self._token = input.prop('value');
                        self._tokenName = name;
                        found = true;
                    }
                });
                if (found === false) {
                    self._raiseIssue("CSRF_Token_Warning.xml", null, "The connection/inscription form at the Url '" + self.target.uri + "' does not have a CSRF Token", true);
                }
            });
        }
    }

    checkIfTokenChanges() {
        let self = this;
        if (self._token !== '') {
            request.get({ url: self.target.uri, timeout: 2000, cancellationToken: self._cancellationToken }, (err, res, body) => {
                self._body2 = body;
                let $ = cheerio.load(body);
                let form = $('form');
                self._form2 = form.html();
                let input = $('input[type="hidden"][name=' + self._tokenName + ']');
                if (self._token != input.attr('value') && input.attr('value') !== undefined) {
                    self._token2 = input.attr('value');
                }
                else {
                    self._raiseIssue("CSRF_Token_Warning.xml", null, "Token doesn\'t changes for each session at Url '" + self.target.uri + "' this may be a security issue", true);
                }

            });
        }
    }

    checkEntropy() {
        let self = this;
        if (self._form !== '') {
            let entropyFirstToken = 0;
            let entropySecondToken = 0;
            for (let x = 0; x < 256; x++) {
                let char = String.fromCharCode(x);
                let count = self._token.split(char).length - 1;
                if (self._token.length > 0) {
                    let p_x = parseFloat(count) / self._token.length;
                    if (p_x > 0) {
                        entropyFirstToken += - p_x * Math.log2(p_x);
                    }
                }
            }
            for (let x = 0; x < 256; x++) {
                let char = String.fromCharCode(x);
                let count = self._token2.split(char).length - 1;
                if (self._token2.length > 0) {
                    let p_x = parseFloat(count) / self._token2.length;
                    if (p_x > 0) {
                        entropySecondToken += - p_x * Math.log2(p_x);
                    }
                }
            }
            if (entropyFirstToken < 2.4 || entropySecondToken < 2.4) {
                self._raiseIssue("CSRF_Token_Warning.xml", null, "CSRF tokens aren\'t secured consider changing them to secured one at Url '" + self.target.uri + "'", true);
            }
        }
    }

    testConnection() {
        let self = this;
        request.get({ url: self._conf.url, timeout: 1000, cancellationToken: self._cancellationToken, jar: true }, function (err, res, body) {
            if (!err && res.statusCode == 200) {
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
                        'session[username_or_email]': 'v.crasnier@peoleo.fr',
                        'session[password]': 'azerty123',
                        'remember_me': '1',
                        'return_to_ssl': 'true',
                        'scribe_log': '',
                        'redirect_after_login': '/',
                        'authenticity_token': authenticity_token
                    },
                    timeout: 1000,
                    cancellationToken: self._cancellationToken,
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
                            cancellationToken: self._cancellationToken,
                            jar: true,
                            gzip: true
                        }, function (err, res, body2) {
                            if (!err && res.statusCode == 200) {
                                var re = body2.match(/class=\"DashboardProfileCard/);
                                if (re) {
                                    console.log("connecté !");
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    checkIfFormIsAConnectionForm() {
        let self = this;
        if (self._form !== '') {
            let $ = cheerio.load(this._form);
            if (($('input[type=text],input[type=email]').length > 0) && ($('input[type=password]').length > 0) && ($('input[type=submit],button[type=submit],button[type=button]').length > 0)) {
                self._usernameInput = $('input[type=text],input[type=email]').attr('name');
                self._passwordInput = $('input[type=password]').attr('name');
                self._submitButton = $('input[type=submit],button[type=submit]').attr('value');
            }
        }
    }
};
