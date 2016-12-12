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

const PHP = 'PHP';
const ASP = 'ASP';
const JSP = 'JSP';
const ASPX = 'ASPX';
const UNKNOWN = 'Unknown';
const SHELL = 'Shell script';
const JAVA = 'Java';
const RUBY = 'Ruby';
const PYTHON = 'Python';
const GROOVY = 'Groovy';

const SOURCE_CODE = [
    { "regEx": '<\\?php .*?\\?>', "language": PHP },
    { "regEx": '<\\?php\n.*?\\?>', "language": PHP },
    { "regEx": '<\\?php\r.*?\\?>', "language": PHP },
    { "regEx": '<\\?php\n.*\n?\\?>', "language": PHP },
    { "regEx": '<\\?php\r.*\r?\\?>', "language": PHP },
    { "regEx": '<\\? .*?\\?>', "language": PHP },
    { "regEx": '<\\?\n.*?\\?>', "language": PHP },
    { "regEx": '<\\?\r.*?\\?>', "language": PHP },
    { "regEx": '<% .*?%>', "language": ASP + "/" + JSP },
    { "regEx": '<%\n.*?%>', "language": ASP + "/" + JSP },
    { "regEx": '<%\r.*?%>', "language": ASP + "/" + JSP },
    { "regEx": '<%@ .*?%>', "language": ASPX },
    { "regEx": '<%@\n.*?%>', "language": ASPX },
    { "regEx": '<%@\r.*?%>', "language": ASPX },
    { "regEx": '<asp:.*?%>', "language": ASPX },
    { "regEx": '<jsp:.*?>', "language": JSP },
    { "regEx": '<%! .*%>', "language": JSP },
    { "regEx": '<%!\n.*%>', "language": JSP },
    { "regEx": '<%!\r.*%>', "language": JSP },
    { "regEx": '<%=.*%>', "language": JSP + "/" + PHP + "/" + RUBY },
    { "regEx": '<!--\\s*%.*?%(--)?>', "language": PHP },
    { "regEx": '<!--\\s*\?.*?\\?(--)?>', "language": ASP + "/" + JSP },
    { "regEx": '<!--\s*jsp:.*?(--)?>', "language": JSP },
    { "regEx": '#include <', "language": UNKNOWN },
    { "regEx": '#!\/usr', "language": SHELL },
    { "regEx": '#!\/bin', "language": SHELL },
    { "regEx": 'import java\.', "language": JAVA },
    { "regEx": 'public class .+\{', "language": JAVA },
    { "regEx": 'package\s\w+\;', "language": JAVA },
    { "regEx": '<!--g:render', "language": GROOVY },
    { "regEx": 'def .*?\(.*?\):\n', "language": PYTHON },
    { "regEx": 'class .*?< .*?end', "language": RUBY }
]

module.exports = class CheckHeaders extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    _check(cancellationToken) {
        var self = this;
        var timeout = 3000;
        return new Promise(function (resolve, reject) {
            request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, function (err, res, body) {
                if (err && err.cancelled) {
                    reject(err);
                    return;
                }
                for (let reg in SOURCE_CODE) {
                    if (new RegExp(SOURCE_CODE[reg].regEx).test(body)) {
                        self._raiseIssue("code_disclosure.xml", null, SOURCE_CODE[reg].language+" tag non interpreted by browser at '" + res.request.uri.href + "'", true);
                    }
                }
                resolve();
            });
        });
    }
};