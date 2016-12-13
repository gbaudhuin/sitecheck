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

var headers = {
    'content-type': 'application/x-www-form-urlencoded',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-encoding': 'gzip, deflate',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
};

/**
 * A module that automatically finds login form in a webpage and gets connection data to allow subsequent automatic login to a website
 */


/**
    * Tries to find login forms in a page.
    * The callbakc is called with (null, {inputVector, cookieJar}) on the first login form that is found. Corresponding InputVector is stored in the class along with session cookies.
    * A subsequent call to login() with the same AutoLogin instance will use these values.
    * If no login form is found, the callback is called with (null, null)
    * @param callback
    */
function findLoginInputVector(absoluteLoginFormUri, cookieJar, callback) {
    request.get({ url: absoluteLoginFormUri, headers: headers, timeout: 5000, cancellationToken: new CancellationToken(), jar: cookieJar }, (err, res, body) => {
        if (err && err.cancelled) {
            return;
        }

        // get the list of all forms of the page
        let ivs = inputVector.parseHtml(body);
        for (let iv of ivs) {
            for (let field of iv.fields) {
                let fieldNameLower = '';
                let fieldTypeLower = '';
                if (field.name) fieldNameLower = field.name.toLowerCase();
                if (field.type) fieldTypeLower = field.type.toLowerCase();
                // note : html default input type is "text" : if no type attribute is found, consider it text field.
                if ((fieldTypeLower == "" || fieldTypeLower == "text" || fieldTypeLower == "email" ) && (fieldNameLower.indexOf("user") !== -1 || fieldNameLower.indexOf("name") !== -1 || fieldNameLower.indexOf("mail") !== -1 || fieldNameLower.indexOf("key") !== -1 || fieldsUser.includes(fieldNameLower))) {
                    iv.userField = field.name;
                }
                else if (fieldTypeLower == "password") {
                    iv.passwordField = field.name;
                }
            }

            if (iv.url && iv.passwordField) {
                callback(null, { inputVector: iv, cookieJar: cookieJar });
                return;
            }
        }

        callback(null, null);
    });
}

function login(absoluteLoginFormUri, user, password, loggedInCheckUrl, loggedInCheckRegex, callback) {
    if (absoluteLoginFormUri && isRelativeUrl(absoluteLoginFormUri)) {
        callback(new Error("absoluteLoginFormUri cannot be relative. absoluteLoginFormUri must be absolute."));
    }
    var cookieJar = true;//request.jar();

    findLoginInputVector(absoluteLoginFormUri, cookieJar, (err, data) => {
        if (err) callback(err);
        else if (!data) {
            callback(new Error("Could not find a login form. Login operation canceled."));
        }
        else {
            var iv = data.inputVector;
            var f = {};
            for (let field of iv.fields) {
                if (field.name) {
                    if (field.value)
                        f[field.name] = field.value;
                    else
                        f[field.name] = '';
                }
            }
            if (iv.userField) f[iv.userField] = user;
            f[iv.passwordField] = password;

            var action = Url.resolve(absoluteLoginFormUri, iv.url);
            request({
                method: iv.method,
                url: action, timeout: 5000, cancellationToken: new CancellationToken(),
                headers: headers,
                form: f,
                jar: cookieJar,
                followRedirect:false
            }, (err, res, body) => {
                if (err) {
                    callback(err);
                    return;
                }
             //   if (res.statusCode == 302) {
                    request.get({
                        headers: headers,
                        url: loggedInCheckUrl,
                        timeout: 1000,
                        cancellationToken: new CancellationToken(),
                        jar: cookieJar,
                        gzip:true
                    }, function (err, res, body2) {
                        if (!err && res.statusCode == 200) {
                            var re = body2.match(loggedInCheckRegex);
                            if (re) {
                                callback(null, true);
                            }
                            else {
                                callback(new Error("not connected"), null);
                            }
                        }
                    });
              //  }
            });
        }
    });
}

module.exports = login;