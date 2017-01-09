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

/**
* Generates a random alphanumerical string
*/
exports.token = function() {
    var rand = function () {
        return Math.random().toString(36).substr(2); // remove `0.`
    };

    var token = function () {
        return rand() + rand(); // to make it longer
    };

    return token();
};

/**
 * Returns caller function triplet { name, fileName, line}
 */
exports.getCaller = function () {
    var stack = exports.getStack();

    let s = stack[1];
    let funcName = s.getFunctionName() || 'anonymous';
    let fileName = s.getFileName();
    let dirName = __dirname;

    // get relative path
    let index = 0;
    while (fileName[index] === dirName[index]) {
        index++;
    }
    fileName = fileName.substring(index);
    let line = s.getLineNumber();
    return { name: funcName, fileName: fileName, line: line };
};

/**
 * Returns current stack
 */
exports.getStack = function () {
    // Save original Error.prepareStackTrace
    var origPrepareStackTrace = Error.prepareStackTrace;

    // Override with function that just returns `stack`
    Error.prepareStackTrace = function (_, stack) {
        return stack;
    };

    // Create a new `Error`, which automatically gets `stack`
    var err = new Error();

    // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
    var stack = err.stack;

    // Restore original `Error.prepareStackTrace`
    Error.prepareStackTrace = origPrepareStackTrace;

    // Remove superfluous function call on stack
    stack.shift(); // getStack --> Error

    return stack;
};

/**
 * Gets an array of cookies from a request
 * The function is not currently used but is working
 */

/*exports.parseCookies = function (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function (cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });// jshint ignore:line

    return list;
};*/