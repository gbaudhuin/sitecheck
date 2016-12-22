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

function Params() {
    // common options
    this.allPages = false; // if true crawls the entire site. If false, just one page.

    // log level
    this.loglevel = "warn";
    this.silent = false;
    this.logFile = undefined;

    // check list
    this.checks = [];

    // connection credentials
    this.loginPage = "/login";
    this.user = "root";
    this.password = "";

    /**
     * Build scan parameters from default params + config file + "manual" params
     * @param {Array} params - An array of scan parameters.
     *                  <ul>
     *                      <li>config : path to config file.</li>
     *                      <li>url : Url to scan. Mandatory unless defined in config file.</li>
     *                      <li>checks : An array of check names. Check names must match names of js files in src/checks/**, without ".js". Mandatory unless defined in config file.</li>
     *                      <li>allPages : true to scan all pages of website. Default is false.</li>
     *                      <li>log : true to activate log to file. Default is false.</li>
     *                      <li>silent : true to prevent console logs. Default is false.</li>
     *                      <li>loglevel : sets log level. Possible values are "error", "warn", "info", "verbose", "debug", "silly". Default is "warn".</li>
     *                  </ul>
     */
    this.gatherScanParams = function (params) {
        var opts = require('rc')("sitecheck", this, params);

        // make sure "checks" field is an array
        if (typeof opts.checks === 'string' || opts.checks instanceof String) {
            opts.checks = [opts.checks];
        } else {
            this.checks = opts.checks;
        }

        if (this.checks.constructor !== Array) {
            throw new Error("No checks. At least one check must be set to start scan. Operation canceled.");
        }

        // checks
        if (!this.checks || this.checks.length < 1) {
            throw new Error("No checks. At least one check must be set to start scan. Operation canceled.");
        }

        // check url
        this.url = opts.url;
        if (!this.url) {
            throw new Error("No Url. An url must be set. Operation canceled.");
        }

        if (!valid_url.isWebUri(this.url)) {
            throw new Error("Invalid Url \"" + this.url + "\". Please submit a valid url. Operation canceled.");
        }

        var uri = new url.parse(this.url);

        // log system
        this.loglevel = opts.loglevel;
        var possibleLogLevels = ["error", "warn", "info", "verbose", "debug", "silly"];
        var foundLogLevel = false;
        for (let i = 0; i < possibleLogLevels.length; i++) {
            if (this.loglevel === possibleLogLevels[i]) {
                winston.level = possibleLogLevels[i];
                foundLogLevel = true;
            }
        }
        if (!foundLogLevel) {
            winston.level = "debug";
            winston.warn("Incorrect log level \"" + this.loglevel + "\" specified. Log level was set to 'debug'.");
            this.loglevel = winston.level;
        }

        if (opts.log) {
            var logdir = './log/';
            if (!fs.existsSync(logdir)) {
                fs.mkdirSync(logdir);
            }
            var moment = require("moment");
            var logfilename = logdir + uri.hostname.replace(/\./, "_") + "_" + moment.utc().format('YYMMDDHHmmss') + ".log";
            winston.add(winston.transports.File, {
                filename: logfilename, handleExceptions: true, humanReadableUnhandledException: true, level: winston.level
            });
            this.logFile = logfilename;
        }

        /* istanbul ignore next */ // complex and useless to test
        this.silent = opts.silent;
        if (this.silent) {
            winston.remove(winston.transports.Console);
        }

        // verify check names
        var verified_checks = [];
        for (let i in opts.checks) {
            /* istanbul ignore else */
            if (opts.checks.hasOwnProperty(i)) {
                let name = opts.checks[i];
                let name_filtered = name.replace(/[^a-zA-Z0-9_]/g, '');
                if (name_filtered !== name) {
                    winston.warn("Invalid check name '" + name + "'. Check names can only contain [a-zA-Z0-9_] characters. Skipped.");
                }
                else {
                    let found = false;
                    var check_paths = ["checks/server/", "checks/page/", "checks/"];

                    for (let j in check_paths) if (!found && check_paths.hasOwnProperty(j)) {
                        var p = check_paths[j];
                        var fullpath = __dirname + "/" + p + "check_" + name + ".js";
                        if (!found && fs.existsSync(fullpath)) {
                            verified_checks.push(name);
                            checkMap.set(name, fullpath);
                            found = true;
                        }
                    }

                    if (!found) {
                        winston.warn("Invalid check name '" + name + "'. Could not find 'check_" + name + ".js'. Skipped.");
                    }
                }
            }
        }
        this.checks = verified_checks;
    }
}

var p = new Params();
module.exports = p;