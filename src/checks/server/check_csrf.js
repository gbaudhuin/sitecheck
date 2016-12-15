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
const CONSTANTS = require("../../constants.js");
let inputVector = require('../../inputVector.js');
//var autoLogin = require("../../autoLogin.js");

let ivs, ivsNotConnected;


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
        // this._entropy = 0;
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
        let arrayOfConnectedOnlyForms = [];
        return new Promise((resolve, reject) => {
            request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken, jar: request.sessionJar }, (err, res, body) => {
                if (err) {
                    self._raiseIssue("warning_csrf.xml", null, "Url '" + self.target.uri + "' is not reachable", true);
                    reject(err);
                    return;
                }
                // list forms
                else {
                    ivs = inputVector.parseHtml(body);
                    if (ivs.length > 0) {
                        //console.log(ivs);
                        // if forms : 
                        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken, jar: null }, (err, res, body) => {
                            if (err) {
                                self._raiseIssue("warning_csrf.xml", null, "Url '" + self.target.uri + "' is not reachable", true);
                                reject(err);
                                return;
                            }
                            ivsNotConnected = inputVector.parseHtml(body);
                            for (let formConnected of ivs) {
                                let found = false;
                                for (let formNonConnected of ivsNotConnected) {
                                    if (formConnected.isSameVector(formNonConnected)) {
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    arrayOfConnectedOnlyForms.push(formConnected);
                                }
                            }
                            for (let form of arrayOfConnectedOnlyForms) {
                                let hidden = self.getHidden(form);
                                if (hidden) {
                                    if (!self.isInArray(hidden.name)) {
                                        self._raiseIssue("warning_csrf.xml", null, "Token not found or not present in our database at Url '" + res.request.uri.href + "'", true);
                                        //TODO
                                        //self.checkIfTokenChanges(token.value)
                                        //.then(self.checkEntropy());
                                    }
                                }
                                else {
                                    self._raiseIssue("warning_csrf.xml", null, "No hidden input found at Url '" + res.request.uri.href + "'", true);
                                }
                            }

                            // list forms
                            // pour les forms qui existent uniquement en connecté
                            // check si existe token csrf
                            // check si token changes
                            // check entropy
                            resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                }
            });
        });

        /*.then(self.checkIfTokenChanges.bind(self))
        .then(self.checkEntropy.bind(self))*/
    }

    getHidden(vector) {
        vector = JSON.parse(JSON.stringify(vector));
        for (let field of vector.fields) {
            if (field.type == 'hidden') {
                return field;
            }
        }
        return false;
    }

    isInArray(tokenName) {
        return (this._COMMON_CSRF_NAMES.indexOf(tokenName) != -1);
    }

    /*checkIfTokenChanges(token) {
        let self = this;
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
    }*/

    /*checkEntropy() {
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
    }*/

};
