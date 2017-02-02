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

var request = require('request');
var request = require('request');
let mailList = [];
const URL = require('url');

class getEmailWebsite {

    constructor() {
        this.url = "";
    }

    checkForEmails(url, cancellationToken, callback) {
        let self = this;
        var timeout = 15000;
        request.get({ url: url, timeout: timeout, cancellationToken: cancellationToken }, function (err, res, body) {
            if (err) {
                callback(null, err);
                return;
            }
            let host = URL.parse(url);
            let regex = /mailto:[\w.]*?@[\w.\-_]*/gi;
            let match = body.match(regex);
            if (match) {
                for (let item of match) {
                    if (item.indexOf(host.hostname) !== -1) {
                        mailList.push(item.replace('mailto:', ''));
                    }
                }
            }
            regex = /<.*?>/gi;
            body = body.replace(regex, '');
            body = body.replace('%40', '@');
            regex = /[\w.]*?@[\w.\-_]*/gi;
            match = body.match(regex);
            if (match) {
                for (let item of match) {
                    if (item.indexOf(host.hostname) !== -1) {
                        mailList.push(item);
                    }
                }
            }
            mailList = self.removeDuplicates(mailList);
            if (mailList.length > 0) {
                console.log(mailList);
                callback(mailList, null);
            } else {
                callback(null, null);
            }
        });
    }

    removeDuplicates(EmailAddressesArray) {
        return Array.from(new Set(EmailAddressesArray));
    }
}

module.exports = getEmailWebsite;