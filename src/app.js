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

var winston = require("winston");
var promise = require("bluebird");
var Target = require('./target.js');
var params = require('./params.js');
var CancellationToken = require('./cancellationToken.js');
const CONSTANTS = require("./constants.js");

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    handleExceptions: true, humanReadableUnhandledException: true
});

var targets = [];

/**
 * Main function.
 * Starts a scan.
 * @param {Array} opts - An array of scan parameters.
 *                  <ul>
 *                      <li>config : path to config file.</li>
 *                      <li>url : Url to scan. Mandatory unless defined in config file.</li>
 *                      <li>checks : An array of check names. Check names must match names of js files in src/checks/**, without ".js". Mandatory unless defined in config file.</li>
 *                      <li>allPages : true to scan all pages of website. Default is false.</li>
 *                      <li>log : true to activate log to file. Default is false.</li>
 *                      <li>silent : true to prevent console logs. Default is false.</li>
 *                      <li>loglevel : sets log level. Possible values are "error", "warn", " ", "verbose", "debug", "silly". Default is "warn".</li>
 *                  </ul>
 */
function scan(opts) {
    params.gatherScanParams(opts);
    var scanId = "";

    targets.push(new Target(params.url, CONSTANTS.TARGETTYPE.PAGE));
    targets.push(new Target(params.url, CONSTANTS.TARGETTYPE.SERVER));

    var ct = new CancellationToken();
    for (let target of targets) {
        //console.log(target);
        checkTarget(target, ct);
    }
}

function checkTarget(target, cancellationToken) {
    var running_checks = [];
    for (let checkName of params.checks) {
        var fileName = params.checkMap.get(checkName);
        var Check = require(fileName);
        var check = new Check(target);
        if (check.targetType == target.targetType) {
            running_checks.push(check.check(cancellationToken));
        }
    }

    // Wait until all checks are done.
    // Concurrency level can be managed by request option "pool: {maxSockets: Infinity}" (https://github.com/request/request#requestoptions-callback)
    Promise.all(running_checks).then(() => {

    }).catch((err) => {

    });
}

module.exports = { scan: scan };