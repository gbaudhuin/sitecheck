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
var url = require('url');
const CONSTANTS = require("../../constants.js");
let inputVector = require('../../inputVector.js');
var AutoLogin = require("../../autoLogin.js");
var params = require('../../params.js');

/**
* This class checks html forms CSRF securization.
* Checks the presence and robustness of CSRF tokens in "private" pages forms.
* Publicly accessible forms are not checked because they're probably never a CSRF menace (Found a counterexample ? please tell or contribute).
*/
module.exports = class CheckCSRF extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
        this.ivs;
        this.ivsNotConnected;
        this._cancellationToken = "";
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
    }

    /**
     * 
     * Procedure :
     * - Get list of forms given in the page when connected
     * - Get list of forms given in the same page when not connected
     * - for each form that exist when connected but not when unconnected, look for the existence of a CSRF token
     * - if csrf token does not exist or is note secure, raise an issue.
     * @param cancellationToken
     */
    _check(cancellationToken, done) {
        var self = this;
        self._cancellationToken = cancellationToken;
        var timeout = 3000;
        let arrayOfConnectedOnlyForms = [];

        // access url with a connected user
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken, jar: request.sessionJar }, (err, res, body) => {
            if (err) {
                self._raiseIssue("warning_csrf.xml", null, "Url '" + self.target.uri.href + "' is not reachable", true);
                done(err);
                return;
            }

            if (res.statusCode !== 200) {
                done(); // nothing to do
                return;
            }

            self.ivs = inputVector.parseHtml(body); // list forms
            if (self.ivs.length > 0) {
                // access url with an unconnected user
                request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken, jar: null }, (err, res, body) => {
                    if (err) {
                        self._raiseIssue("warning_csrf.xml", null, "Url '" + self.target.uri.href + "' is not reachable", true);
                        done(err);
                        return;
                    }
                    self.ivsNotConnected = inputVector.parseHtml(body);
                    for (let formConnected of self.ivs) {
                        let found = false;
                        for (let formNonConnected of self.ivsNotConnected) {
                            if (formConnected.isSameVector(formNonConnected)) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            arrayOfConnectedOnlyForms.push(formConnected);
                        }
                    }
                    for (let iv of arrayOfConnectedOnlyForms) {
                        let foundCSRF = false;
                        for (let field of iv.fields) {
                            if (field.type == 'hidden' && this._COMMON_CSRF_NAMES.indexOf(field.name) != -1) {
                                foundCSRF = true;
                            }
                        }

                        if (!foundCSRF) {
                            self._raiseIssue("warning_csrf.xml", null, "Url '" + res.request.uri.href + "' contains a form with no CSRF protection", true);
                        }
                    }
                    self.getAnotherToken(cancellationToken, (ivs2) => {
                        if (typeof ivs2 === 'error') {
                            done(ivs2);
                            return;
                        }

                        if (ivs2 && ivs2.length > 0) {
                            for (let iv1 of self.ivs) {

                                var csrfValue1 = null;
                                for (let field of iv1.fields) {
                                    if (field.type == 'hidden' && this._COMMON_CSRF_NAMES.indexOf(field.name) != -1) {
                                        csrfValue1 = field.value;
                                    }
                                }

                                if (csrfValue1) {
                                    for (let iv2 of ivs2) {
                                        if (iv1.isSameVector(iv2)) {
                                            var csrfValue2 = null;
                                            for (let field of iv2.fields) {
                                                if (field.type == 'hidden' && this._COMMON_CSRF_NAMES.indexOf(field.name) != -1) {
                                                    csrfValue2 = field.value;
                                                }
                                            }

                                            if (csrfValue1 === csrfValue2) {
                                                self._raiseIssue("warning_csrf.xml", null, "Url '" + res.request.uri.href + "' contains a form with a CSRF token that is the same accross different sessions.", true);
                                            }

                                            // TODO : que fait-on s'il y a plusieurs champs qui ressemblent à des token CSF ?
                                        }
                                    }
                                }

                                 TODO :
                                // - envoyer un referer dans les requetes pour passer sur les sites qui filtrent
                                // - test unitaire sur les csrf token qui ne changent pas entre les versions
                                // - nouvelle étape de check : vérifier qu'une session ne peut pas utiliser le token csrf d'une autre session : https://blog.qualys.com/securitylabs/2015/01/14/do-your-anti-csrf-tokens-really-protect-your-applications-from-csrf-attack
                                //
                                // En dehors de check_csrf
                                // - reprendre les ut (hormis bruteforce, csrf et autologin) pour catcher les Issues dans catch et le bon déroulement dans then
                                // - reprendre les check (hormis bruteforce, csrf et autologin)  pour supprimer l'utilisation des Promise natives dans _check
                                // - vérifier les checks de Valerian : disclosure, cross_domain, error_page, headers
                                // - changer les types de check qd nécessaire : SERVER -> PAGE , etc.
                                // - code coverage 100%
                            }
                            done();
                        } else {
                            done(new Error('No forms found on session 2 in check_csrf'));
                        }
                    });
                });
            }
            else {
                done();
            }
        });
    }

    getAnotherToken(cancellationToken, callback) {
        let autoLogin = new AutoLogin();
        var self = this;
        var loginPage = url.resolve(this.target.uri, params.loginPage);
        autoLogin.login(loginPage, params.user, params.password, cancellationToken, (err, data) => {
            if (err) {
                callback(err);
                return;
            }

            if (!data) {
                callback(new Error("getAnotherToken() : No data"));
                return;
            }

            request.get({ url: self.target.uri, timeout: 10000, cancellationToken: cancellationToken, jar: data.cookieJar }, (err, res, body) => {
                if (err) {
                    self._raiseIssue("warning_csrf.xml", null, "Url '" + self.target.uri.href + "' is not reachable", true);
                    callback(err);
                    return;
                }

                if (res.statusCode !== 200) {
                    callback(); // nothing to do
                    return;
                }

                let ivs = inputVector.parseHtml(body); // list of forms
                callback(ivs);
            });
        });
    }
};
