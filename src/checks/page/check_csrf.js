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
var async = require('async');
const CONSTANTS = require("../../constants.js");
let inputVector = require('../../inputVector.js');
var AutoLogin = require("../../autoLogin.js");
var params = require('../../params.js');

var falsePositives = ["stripe-card-number"]; // stripe.com ajax form

/**
* This class checks html forms CSRF securization.
* Checks the presence and robustness of CSRF tokens in "private" pages forms.
* Publicly accessible forms are not checked because they're probably never a CSRF menace (Found a counterexample ? please tell or contribute).
*/
module.exports = class CheckCSRF extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
        this.ivs = null;
        this.ivsNotConnected = null;
        this._cancellationToken = null;
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

                        // add form to elligible forms array "arrayOfConnectedOnlyForms"
                        if (!found) {
                            // filter out false positives with known relevant strings stored in falsePositives array.
                            // note : this method is weak and should be enhanced. An evolution would be to use phantomJs to execute js and be able to work with handlers, as explained next.
                            let falsePositive = false;
                            for (let f of formConnected.fields) {
                                for (let fp of falsePositives) {
                                    if (f.indexOf(fp) !== -1) {
                                        falsePositive = true;
                                        break;
                                    }
                                }
                            }
                            if (!falsePositive) arrayOfConnectedOnlyForms.push(formConnected);
                        }
                    }
                    for (let iv of arrayOfConnectedOnlyForms) {
                        let csrfField = self.getCsrfField(iv);

                        if (!csrfField) {
                            // Note : this check is prone to false positives in case of ajax forms which don't contain csrf token hidden input but where csrf protection is handled by js code. 
                            // A possibility could be to detect such forms with phantom js by detecting event handlers on forms or form buttons
                            self._raiseIssue("warning_csrf.xml", null, "Url '" + res.request.uri.href + "' contains a form with no CSRF protection. (This may be a false positive in case of an ajax form).", true);
                        }
                    }

                    // Now, we check if anti-csrf tokens are correctly generated and checked
                    // Inspired by https://blog.qualys.com/securitylabs/2015/01/14/do-your-anti-csrf-tokens-really-protect-your-applications-from-csrf-attack
                    self.getAnotherToken(cancellationToken, (ivs2) => {
                        if (typeof ivs2 === Error) {
                            done(ivs2);
                            return;
                        }

                        if (ivs2 && ivs2.length > 0) {
                            let goodCouples = [];
                            for (let iv1 of self.ivs) {
                                let csrfField1 = self.getCsrfField(iv1);

                                if (csrfField1) {
                                    for (let iv2 of ivs2) {
                                        if (iv1.isSameVector(iv2)) {
                                            let csrfField2 = self.getCsrfField(iv2);

                                            if (csrfField2) {
                                                if (csrfField1.value === csrfField2.value) {
                                                    // tokens are the same accross sessions
                                                    self._raiseIssue("warning_csrf.xml", null, "Url '" + res.request.uri.href + "' contains a form with a CSRF token that is the same accross different sessions.", true);
                                                } else {
                                                    // the form has different anti csrf tokens. Remember them to check they're correctly checked.
                                                    goodCouples.push([csrfField1, csrfField2, iv1]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            let headers = {
                                'content-type': 'application/x-www-form-urlencoded',
                                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'accept-encoding': 'gzip, deflate',
                                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
                                //  'referer': 'https://progressive-sports.co.uk/index.php/profile/edit/',
                                //   'origin': 'https://progressive-sports.co.uk'
                            };

                            // check if csrf tokens are checked properly against their respective session by trying to use the anti-csrf token of a session from another session
                            async.eachSeries(goodCouples, function (couple, callback) {
                                let csrfField1 = couple[0];
                                let csrfField2 = couple[1];
                                let iv = couple[2];

                                let formData = {};
                                var actionUrl = url.resolve(self.target.uri, iv.url);
                                var randomText = Math.random().toString(10).substr(2);
                                for (let field of iv.fields) {
                                    if (field.name) {
                                        if (field.name == "akID[227][value]" || field.name == "account_last_name") {
                                            formData[field.name] = randomText;
                                        } else if (field.value) {
                                            formData[field.name] = field.value;
                                        } else {
                                            formData[field.name] = '';
                                        }
                                    }
                                }

                                formData[csrfField1.name] = csrfField2.value; // switch csrf token

                                let req = {
                                    method: iv.method,
                                    url: actionUrl, timeout: 60000, cancellationToken: cancellationToken,
                                    headers: headers,
                                    form: formData,
                                    jar: request.sessionJar,
                                    followRedirect: false
                                };

                                if (iv.enctype == "multipart/form-data") {
                                    req.form = undefined;
                                    req.formData = formData;
                                }
                                request(req, (err, res, body) => {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }

                                    // woocommerce.com (WordPress) and progressive-sports.co.uk (Concrete 5) send a 302 on success and a 200 otherwise.
                                    // note : Must improve following lines to handle other sites possible behavior.
                                    if (res.statusCode == 302) {
                                        self._raiseIssue("warning_csrf.xml", null, 'Form "' + iv.name + '" at url "' + self.target.uri.href + '" does not correctly check anti csrf tokens. An anti CSRF token from a session was succesfuly used in another session.', true);
                                    }

                                    callback();
                                });

                                // TODO :
                                // - envoyer un referer dans les requetes pour passer sur les sites qui filtrent
                                // - test unitaire sur les csrf token qui ne changent pas entre les versions
                                //
                                // En dehors de check_csrf
                                // - reprendre les ut (hormis bruteforce, csrf et autologin) pour catcher les Issues dans catch et le bon déroulement dans then
                                // - reprendre les check (hormis bruteforce, csrf et autologin)  pour supprimer l'utilisation des Promise natives dans _check
                                // - vérifier les checks de Valerian : disclosure, cross_domain, error_page, headers
                                // - changer les types de check qd nécessaire : SERVER -> PAGE , etc.
                                // - code coverage 100%
                            }, function (err) {
                                if (err) {
                                    done(err);
                                } else {
                                    done();
                                    return;
                                }
                            });
                        } else {
                            done();
                            return;
                        }
                    });
                });
            }
            else {
                done();
                return;
            }
        });
    }

    /**
     * Opens a new session and get Input Vectors from this.target
     * @param cancellationToken
     * @param callback - called with and array of input vectors : callback(inputVectorArray)
     */
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

    /**
     * Finds and returns the anti csrf field of an input vector.
     * If no anti csrf token, returns null.
     * @param inputVector
     */
    getCsrfField(inputVector) {
        if (!inputVector) return null;
        if (inputVector.fields.length <= 0) return null;

        // obvious patterns
        // if a field matches, the field is returned without looking at other fields
        let regexTokens = [/csrf/i,
            /xsrf/i,
            /\[_token\]/,   // Symfony 2.x
            /form_key/,     // Magento 1.9
            /nonce/,     // e.g. WordPress
        ];

        for (let field of inputVector.fields) {
            if (field.type == 'hidden') {
                for (let r of regexTokens) {
                    if (field.name.match(r)) {
                        return field;
                    }
                }
            }
        }

        // not so obvious patterns
        // if a field is the only one to match, return it (if multiple fields match, we can't determine which one is the csrf token)
        let notObviousRegexTokens = [/^token/i, /token$/i];

        let fieldName = [];
        let ret = null;
        for (let field of inputVector.fields) {
            if (field.type == 'hidden') {
                for (let r of notObviousRegexTokens) {
                    if (field.name.match(r)) {
                        if (fieldName.indexOf(field.name) == -1) {
                            fieldName.push(field.name);
                            ret = field;
                        }
                    }
                }
            }
        }
        if (fieldName.length == 1) return ret;

        return null;
    }
};
