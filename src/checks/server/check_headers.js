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
var winston = require('winston');
const CONSTANTS = require("../../constants.js");

module.exports = class CheckHeaders extends Check {
    constructor() {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true);
    }

    _check() {
        var self = this;
        var timeout = 1000;
        return new Promise(function (resolve, reject) {
            request.get({ url: self.target.uri, timeout: timeout }, function (err, res, body) {
                if (err) {
                    if (err.code === "ESOCKETTIMEDOUT") {
                        winston.warn("CheckHeaders : no response from '" + self.target.uri + "'. Timeout occured (" + timeout + "ms)");
                    } else {
                        winston.warn("CheckHeaders : no response from '" + self.target.uri + "'. Unknown error (" + err.code + "ms)");
                    }
                } else {
                    if (!res.headers['x-frame-options']) {
                        self._raiseIssue("x_frame_options_missing.xml", null, "Url was '" + res.url + "'", true);
                    }
                }
                
                resolve(); // checks always call resolve
            });
        });
    }
};