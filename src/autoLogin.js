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
var request = require('request');
var CancellationToken = require('./cancellationToken.js');
var cheerio = require('cheerio');

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
    constructor(username, password, absoluteLoginFormUri) {
        if (absoluteLoginFormUri && isRelativeUrl(absoluteLoginFormUri)) throw new Error("Uri cannot be relative. Uri must be absolute.");
        this.username = username;
        this.password = password;
        this.loginFormUri = absoluteLoginFormUri;
    }

    findFormFields(callback) {
        var self = this;
        var jar = request.jar();
        request.get({ url: self.loginFormUri, timeout: 5000, cancellationToken: new CancellationToken(), jar:jar }, (err, res, body) => {
            if (err && err.cancelled) {
                return;
            }

            var $ = cheerio.load(body);
            var fields = {};
            var $form = $('form');
            $form.find('input').each((i, elem) => {
                let inputName = $(elem).attr('name');
                if (inputName) {
                    let inputNameLower = inputName.toLowerCase();
                    if (inputNameLower.indexOf("user") !== -1 || fieldsUser.includes(inputNameLower)) {
                        fields.user = inputName;
                    } else {
                        if (inputNameLower.indexOf("password") !== -1 || fieldsPassword.includes(inputNameLower)) {
                            let attrType = $(elem).attr('type');
                            if (attrType == 'password') {
                                fields.password = inputName;
                                fields.action = $form.attr('action'); // this form is very probably a login form
                            }
                        } else {
                            if (fieldsCsrf.includes(inputNameLower)) {
                                let attrType = $(elem).attr('type');
                                if (attrType == 'hidden') {
                                    let attrValue = $(elem).attr('value');
                                    if (attrValue) {
                                        fields.csrf = inputName;
                                        fields.csrf_value = attrValue;
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (fields.action) {
                callback(null, { fields: fields, jar: jar });
            } else {
                callback(null, null);
            }
        });
    }
}

module.exports = AutoLogin;