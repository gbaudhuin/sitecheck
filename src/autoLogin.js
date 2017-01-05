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
var Url = require('url');
var inputVector = require('./inputVector.js');

var typicalUserFields = ["user", "username", "name", "email", "log", "id", "login", "usr", "u"];

var headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-encoding': 'gzip, deflate',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
};

/**
 * A class that automatically finds login form in a webpage and gets connection data to allow subsequent automatic login to a website
 * This class may be used in 2 typical scenarii :
 * - crendentials are known and we want to check them : use login()
 * - crendentials are unknown or we need to make multiple login attempts. Use findLoginInputVector() once to get form data and then logInInputVector() for each connection attempt.
 */
class AutoLogin {

    /**
     * Constructror.
     */
    constructor() {
        this.failureIndicators = [];
    }

    /**
     * Tries to log into a login form on a web page.
     * An error is returned in case of failure.
     * user, password and cookieJar are returned in case of success.
     * @param absoluteLoginFormUri - Url of web page on which to find the login form
     * @param user - user name, email, id, etc
     * @param password - password
     * @param callback - function(err, data). data : { user, password, cookieJar }. data is undefined in case of failure.
     */
    login(absoluteLoginFormUri, user, password, cancellationToken, callback) {
        if (absoluteLoginFormUri && isRelativeUrl(absoluteLoginFormUri)) {
            callback(new Error("absoluteLoginFormUri cannot be relative. absoluteLoginFormUri must be absolute."));
        }
        else {
            var cookieJar = request.jar();

            this.findLoginInputVector(absoluteLoginFormUri, cookieJar, cancellationToken, (err, data) => {
                if (!data) {
                    callback(new Error("Could not find a login form. Login operation canceled."));
                }
                else {
                    this.logInInputVector(absoluteLoginFormUri, data.inputVector, user, password, data.cookieJar, cancellationToken, callback);
                }
            });
        }
    }

    /**
     * Tries to find login forms in a page.
     * Returns the first login form that is found as an InputVector.
     * If no login form is found, returns null.
     * @param body - html content
     */
    findLoginInputVectorInContent(body) {
        // get the list of all forms in the body
        let ivs = inputVector.parseHtml(body);
        if (ivs) {
            for (let iv of ivs) {
                let passwordFieldsCount = 0;
                for (let field of iv.fields) {
                    let fieldNameLower = '';
                    let fieldTypeLower = '';
                    if (field.name) fieldNameLower = field.name.toLowerCase();
                    if (field.type) fieldTypeLower = field.type.toLowerCase();
                    // note : html default input type is "text" : if no type attribute is found, consider a text field.
                    if ((fieldTypeLower === "" || fieldTypeLower == "text" || fieldTypeLower == "email") && (fieldNameLower.indexOf("user") !== -1 || fieldNameLower.indexOf("name") !== -1 || fieldNameLower.indexOf("mail") !== -1 || fieldNameLower.indexOf("key") !== -1 || typicalUserFields.includes(fieldNameLower))) {
                        iv.userField = field.name;
                    }
                    else if (fieldTypeLower == "password") {
                        iv.passwordField = field.name;
                        passwordFieldsCount++;
                    }
                }

                if (iv.passwordField && passwordFieldsCount == 1) { // if passwordFieldsCount == 2, we probably have an account creation form instead of a login form
                    return iv;
                }
            }
        }
        return null;
    }

    /**
    * Tries to find login forms in a page.
    * The callback is called with (null, {inputVector, cookieJar}) on the first login form that is found.
    * Action Url is always returned as an absolute url.
    * If no login form is found, the callback is called with (null, null)
    * @param callback
    */
    findLoginInputVector(absoluteLoginFormUri, cookieJar, cancellationToken, callback) {
        var self = this;
        request.get({ url: absoluteLoginFormUri, headers: headers, timeout: 10000, cancellationToken: cancellationToken, jar: cookieJar }, (err, res, body) => {
            if (err && err.cancelled) {
                callback(null, null);
                return;
            }

            let iv = self.findLoginInputVectorInContent(body);
            if (iv) {
                // make sure action url is absolute
                if (iv.url && !iv.url.host) {
                    iv.url = Url.resolve(absoluteLoginFormUri, iv.url);
                }

                callback(null, { inputVector: iv, cookieJar: cookieJar });
            } else {
                callback(null, null);
            }
        });
    }

    /**
     * Renders ready-to-submit login form data from an InputVector and credentials
     * @param inputVector
     * @param user
     * @param password
     */
    getFormData(inputVector, user, password) {
        var f = {};
        for (let field of inputVector.fields) {
            if (field.name) {
                if (field.value)
                    f[field.name] = field.value;
                else
                    f[field.name] = '';
            }
        }
        if (inputVector.userField) f[inputVector.userField] = user;
        if (inputVector.passwordField) f[inputVector.passwordField] = password;

        return f;
    }

    /**
     * Gets typical response data obtained from failed login attemps.
     * This data is intented to be compared with other login attempts responses to tell if they're successful.
     * Results of first call are memorized. Subsequent calls will use memorized results and are instantaneous.
     * @param absoluteLoginFormUri
     * @param inputVector
     * @param cookieJar
     * @param callback - (err, data) callback. data is an array of {response, body}
     */
    getFailureIndicators(absoluteLoginFormUri, inputVector, unconnectedCookieJar, cancellationToken, callback) {
        if (this.failureIndicators && this.failureIndicators.length > 0) {
            // if job has already been done, we can save time and requests by using last result. 
            callback(null, this.failureIndicators);
            return;
        }
        var self = this;

        // create a virgin cookie jar
        // we must be sure to work with an unconnected session
        let unconnectedCookieJar2 = request.jar();
        this.findLoginInputVector(absoluteLoginFormUri, unconnectedCookieJar2, cancellationToken, (err, data) => {
            if (!data) {
                callback(new Error("Could not find a login form. Login operation canceled."));
            }
            else {
                let req1 = {
                    method: inputVector.method,
                    url: inputVector.url, timeout: 10000, cancellationToken: cancellationToken,
                    headers: headers,
                    form: self.getFormData(inputVector, "z86f4d56e489er89", "ecf6er4f8c5.A6ez4"),
                    jar: data.cookieJar,
                    followRedirect: false // we need to get statusCode before any redirection
                };

                let req2 = {
                    method: inputVector.method,
                    url: inputVector.url, timeout: 10000, cancellationToken: cancellationToken,
                    headers: headers,
                    form: self.getFormData(inputVector, "z86f4d56e489er89", ""), // empty password
                    jar: data.cookieJar,
                    followRedirect: false // we need to get statusCode before any redirection
                };

                request(req1, (err, res, body) => {
                    if (err) {
                        console.log(123);
                        callback(err);
                        return;
                    }

                    var ret = [{ res, body }];
                    console.log(ret);
                    request(req2, (err, res, body) => {
                        console.log(234);
                        if (!err) {
                            ret.push({ res, body });

                            // finds the character index until which both body contents are identical.
                            // Store the result in ret[n].bodyIdenticalBeginningLength
                            if (ret[0].body && body) {
                                var maxLength = Math.min(body.length, ret[0].body.length);
                                ret[0].bodyIdenticalBeginningLength = maxLength;
                                ret[1].bodyIdenticalBeginningLength = maxLength;

                                for (var i = 0; i < maxLength; i++) {
                                    if (body[i] !== ret[0].body[i]) {
                                        ret[0].bodyIdenticalBeginningLength = i;
                                        ret[1].bodyIdenticalBeginningLength = i;
                                    }
                                }
                            }
                        }
                        else{
                            callback(err);
                            return;
                        }
                        self.failureIndicators = ret; // store result for quick further use
                        callback(null, ret);
                    });
                });
            }
        });
    }

    /**
     * Tries to log in with a triplet user,password,cookieJar. cookieJar contains eventual session id.
     * Returns an error on failure or data with an updated cookieJar on success.
     * @param absoluteLoginFormUri
     * @param inputVector
     * @param user
     * @param password
     * @param cookieJar
     * @param callback - function(err, data). data : { user, password, cookieJar }
     */
    logInInputVector(absoluteLoginFormUri, inputVector, user, password, cookieJar, cancellationToken, callback) {
        var f = this.getFormData(inputVector, user, password);

        this.getFailureIndicators(absoluteLoginFormUri, inputVector, cookieJar, cancellationToken, (err, failureIndicators) => {
            request({
                method: inputVector.method,
                url: inputVector.url, timeout: 10000, cancellationToken: cancellationToken,
                headers: headers,
                form: f,
                jar: cookieJar,
                followRedirect: false // we need to get statusCode before any redirection
            }, (err, res, body) => {
                if (err) {
                    callback(err);
                    return;
                }

                // if http status code is different from failed logins, consider we're logged in.
                let statusCodeisDifferent = true;
                for (let failures of failureIndicators) {
                    if (failures.res.statusCode == res.statusCode)
                        statusCodeisDifferent = false;
                }
                if (statusCodeisDifferent) {
                    callback(null, { user: user, password: password, cookieJar: cookieJar });
                    return;
                }

                // could not tell with statusCode, try to check with body content
                if (failureIndicators[0].bodyIdenticalBeginningLength) {
                    // If content beginning is different from failure cases beginning, consider we're logged in.
                    let maxLength = Math.min(body.length, failureIndicators[0].bodyIdenticalBeginningLength);
                    failureIndicators[0].body;
                    for (var i = 0; i < maxLength; i++) {
                        if (failureIndicators[0].body[i] != body[i]) {
                            callback(null, { user: user, password: password, cookieJar: cookieJar });
                            return;
                        }
                    }
                }

                callback(new Error("not connected"), null);
            });
        });
    }
}

module.exports = AutoLogin;