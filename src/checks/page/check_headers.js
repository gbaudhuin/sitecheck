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
const CONSTANTS = require("../../constants.js");

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

                if(!res.headers['x-content-type-options']){
                    self._raiseIssue("x_content_type_options_missing.xml", null, "Url was '" + res.request.uri.href + "'", true);
                } 
                
                if(res.headers['x-content-type-options'] && (res.headers['x-content-type-options']).toLowerCase() !== 'nosniff'){
                    self._raiseIssue("x_content_type_options_missing.xml", null, "X-Content-Type-Options found but value is no nosniff, consider changing that '" + res.request.uri.href + "'", true);
                }
                done();
            });
    }
};