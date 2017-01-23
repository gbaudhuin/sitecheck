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
var request = require('../../requestwrapper');
var async = require('async');
const CONSTANTS = require("../../constants.js");
const COMMON_HEADERS = [
    'ACCEPT-RANGES', 'AGE', 'ALLOW', 'CONNECTION',
    'CONTENT-DISPOSITION', 'CONTENT-ENCODING',
    'CONTENT-LENGTH', 'CONTENT-TYPE', 'CONTENT-SCRIPT-TYPE',
    'CONTENT-STYLE-TYPE', 'CONTENT-SECURITY-POLICY',
    'CONTENT-SECURITY-POLICY-REPORT-ONLY', 'CONTENT-LANGUAGE',
    'CONTENT-LOCATION', 'CACHE-CONTROL', 'DATE', 'EXPIRES',
    'ETAG', 'FRAME-OPTIONS', 'KEEP-ALIVE', 'LAST-MODIFIED',
    'LOCATION', 'P3P', 'PUBLIC', 'PUBLIC-KEY-PINS',
    'PUBLIC-KEY-PINS-REPORT-ONLY', 'PRAGMA',
    'PROXY-CONNECTION', 'SET-COOKIE', 'SERVER',
    'STRICT-TRANSPORT-SECURITY', 'TRANSFER-ENCODING', 'VIA',
    'VARY', 'WWW-AUTHENTICATE', 'X-FRAME-OPTIONS',
    'X-CONTENT-TYPE-OPTIONS', 'X-POWERED-BY',
    'X-ASPNET-VERSION', 'X-CACHE', 'X-UA-COMPATIBLE', 'X-PAD',
    'X-XSS-PROTECTION', 'ACCESS-CONTROL-ALLOW-ORIGIN',
    'ACCESS-CONTROL-ALLOW-METHODS',
    'ACCESS-CONTROL-ALLOW-HEADERS',
    'ACCESS-CONTROL-MAX-AGE'
];

module.exports = class CheckHeaders extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    _check(cancellationToken, done) {
        var self = this;
        var timeout = 3000;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, function (err, res, body) {
            if (self._handleError(err)) {
                done();
                return;
            }

            if (!res.headers['x-frame-options']) {
                self._raiseIssue("x_frame_options_missing.xml", null, "Url was '" + res.request.uri.href + "'", true);
            }

            if (!res.headers['x-content-type-options']) {
                self._raiseIssue("x_content_type_options_missing.xml", null, "Url was '" + res.request.uri.href + "'", true);
            }

            if (res.headers['x-content-type-options'] && (res.headers['x-content-type-options']).toLowerCase() !== 'nosniff') {
                self._raiseIssue("x_content_type_options_missing.xml", null, "X-Content-Type-Options found but value is no nosniff, consider changing that '" + res.request.uri.href + "'", true);
            }

            else {
                /*async.eachSeries(self.COMMON_HEADERS, (x, callback) => {
                    console.log(x);
                });*/
                if(res.statusCode >= 300 && res.statusCode <= 310 && res.headers['content-location']){
                    self._raiseIssue('content-location_300.xml', null, "The URL " + res.request.uri.href + " sent HTTP header : 'content-location' with value " +
                    res.headers['content-location'] + " in an HTTP response with code " + 
                    res.statusCode + " which is a violation to the RFC");
                }
                async.forEachOf(res.headers, (value, key, callback) => {
                    let found = false;
                    for(let header of COMMON_HEADERS){
                        if(key.toUpperCase() === header){
                            found = true;
                        }
                    }
                    if(!found){
                        self._raiseIssue('exotic_header.xml', null, "Exotic header found in the response at url " + res.request.uri.href);
                    }
                    callback();
                });
                //console.log(res.headers);
            }

            done();
        });
    }
};