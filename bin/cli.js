#!/usr/bin/env node
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

const meow = require('meow');
const cli = meow(`
    Usage
      $ sitecheck <url>
 
    Options
      -a, --allpages    Scan all pages of website (a preliminary crawl pass is run)
      -c, --check       Checks to pass. Multiple flags allowed : -c headers -c wordpress
      -h, --help        Display help  
      --config          config file in json format. Default : .sitecheckrc
      -l, --log         activate log to file. Default is false. logs are stored in : ./log/*HOSTNAME*_YYMMDDHHMMSS.log
      --loglevel        set log level. Possible values are "error", "warn", "info", "verbose", "debug", "silly". Default is "warn". 
    Examples
      $ sitecheck "http://www.example.com" --allPages
`, {
        alias: {
            a: 'allpages',
            c: ['check', 'checks'],
            l: 'log',
            h: 'help'
        },
        boolean: ["a"],
        string: ["c"]
});

if (cli.input.length > 0) {
    cli.flags.url = cli.input[0];
}

var scan = require("../src/app.js");

var params = {};
try {
    scan(cli.flags);
} catch (err) {
    console.error(err);
}