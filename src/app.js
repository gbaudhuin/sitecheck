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

var fs = require("fs");
var valid_url = require("valid-url");
var winston = require("winston");
const url = require('url');

// Default parameters for sitecheck. defaults are merged, not replaced.
var defaultParams = {
    allPages: false,
    checks: [
        "headers"
    ],
    loglevel: "warn"
};

/**
 * Main function.
 * Starts a scan.
 * @param {Array} params - An array of scan parameters.
 *                  <ul>
 *                      <li>config : path to config file.</li>
 *                      <li>url : Url to scan. Mandatory unless defined in config file.</li>
 *                      <li>checks : An array of check names. Check names must match names of js files in src/checks/**, without ".js". Mandatory unless defined in config file.</li>
 *                      <li>allPages : true to scan all pages of website. Default is false.</li>
 *                  </ul>
 */
function scan(params) {
    var opts = require('rc')("sitecheck", defaultParams, params);
    // make sur "checks" field is an array
    if (opts.checks.constructor !== Array) {
        opts.checks = [opts.checks];
    }

    // check url
    if (!opts.url) {
        throw new Error("No Url. An url must be set. Operation canceled.");
    }

    if (!valid_url.isWebUri(opts.url)) {
        throw new Error("Invalid Url \"" + opts.url + "\". Please submit a valid url. Operation canceled.");
    }

    var uri = new url.parse(opts.url);

    // log system
    if (opts.log) {
        var logdir = './log/';
        if (!fs.existsSync(logdir)) {
            fs.mkdirSync(logdir);
        }
        var moment = require("moment");
        var logfilename = logdir + uri.hostname.replace(/\./, "_") + "_" + moment.utc().format('YYMMDDHHmmss') + ".log";
        winston.add(winston.transports.File, {
            filename: logfilename, handleExceptions: true
        });
    }
    var possibleLogLevels = ["error", "warn", "info", "verbose", "debug", "silly"];
    var foundLogLevel = false;
    for (let i = 0; i < possibleLogLevels.length; i++) {
        if (opts.loglevel === possibleLogLevels[i]) {
            winston.level = possibleLogLevels[i];
            foundLogLevel = true;
        }
    }
    if (!foundLogLevel) {
        winston.level = "debug";
        winston.warn("Incorrect log level \"" + opts.loglevel + "\" specified. Log level was set to 'debug'.");
    }

    winston.warn(opts.url);

    // checks
    if (!opts.checks) {
        throw new Error("No checks. At least one check must be set to start scan. Operation canceled.");
    }

    // verify check names
    var verified_checks = [];
    for (let i in opts.checks) {
        if (opts.checks.hasOwnProperty(i)) {
            let name = opts.checks[i];
            let name_filtered = name.replace(/[^a-zA-Z0-9_]/g, '');
            if (name_filtered !== name) {
                winston.warning("Invalid check name\"" + name + "\". This check won't be run.");
            }
            else {
                let found = false;
                var check_paths = ["checks/server/", "checks/"];

                for (let j in check_paths) if (!found && check_paths.hasOwnProperty(j)) {
                    var p = check_paths[j];

                    if (!found && fs.existsSync(__dirname + "/" + p + name + ".js")) {
                        verified_checks.push(name);
                        found = true;
                    }
                }
            }
        }
    }
    opts.checks = verified_checks;
}

module.exports = scan;