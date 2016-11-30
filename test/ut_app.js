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
var assert = require('assert');
var winston = require('winston');
var fs = require('fs-extra');

/**
* Test src/app.js
*/
describe('app.js', function () {
    it('doesn\'t raise exceptions', function () {
        var exceptionRaised = false;
        try {
            require('../src/app.js');
        } catch (err) {
            exceptionRaised = true;
        }

        assert.equal(exceptionRaised, false);
    });

    describe('#scan', function () {
        beforeEach(function () {
            try {
                // app adds a transports.File each time it runs : we need to reset winston transports each time
                winston.remove(winston.transports.File);
            } catch (err){ }
        });
        /*
        */
        it('verify check names correctly', function (done) {
            var scan = require('../src/app.js');

            // invalid check name
            var params = { url: "http://www.example.com", checks: ["headers", "b*"], log: true }; // log=true because winston.stream needs a file transport to work
            scan(params);

            var winston_stream = winston.stream({ start: -1 });
            winston_stream.on('log', function (log) {
                var index = log.message.indexOf("Invalid check name 'b*'");
                if (index !== -1) {
                    winston_stream.destroy();
                    done();
                }
            });
        });

        it('generates log directory if it does not exist', function (done) {
            var scan = require('../src/app.js');
            // remove unit tests logs 
            try {
                fs.removeSync('./log');
            } catch (err) { }
            // invalid check name
            var params = { url: "http://www.example.com", checks: ["headers", "b*"], log: true };
            var opts = scan(params);

            var winston_stream = winston.stream({ start: -1 });
            winston_stream.on('log', function (log) {
                // at this point the file is supposed to created
                winston_stream.destroy();
                if (fs.existsSync(opts.logFile)) {
                    done();
                }
            });
        });
        
        it('converts single check to array', function () {
            var scan = require('../src/app.js');

            // single check name as string
            var params = { url: "http://www.example.com", checks: "headers"};
            var opts = scan(params);

            assert(Array.isArray(opts.checks)); // string must be converted to array
        });

        it('throw error when no checks', function () {
            var scan = require('../src/app.js');

            // single check name as string
            var params = { url: "http://www.example.com", checks : null };
            assert.throws(function () {
                scan(params);
            }, Error, "Error thrown");

            // checks are an object
            params = { url: "http://www.example.com", checks: {} };
            assert.throws(function () {
                scan(params);
            }, Error, "Error thrown");

            // empty checks array
            params = { url: "http://www.example.com", checks: [] };
            assert.throws(function () {
                scan(params);
            }, Error, "Error thrown");
        });

        it('rejects inexistant checks', function () {
            var scan = require('../src/app.js');

            // single check name as string
            var params = {
                url: "http://www.example.com", checks: ["headers", "inexistant"] };
            var opts = scan(params);

            assert(opts.checks.length == 1);
        });

        it('parses url param correctly', function () {
            var scan = require('../src/app.js');

            // 1st case : no url in config, no url in params
            var params = { url: null, checks: ["headers"] };
            assert.throws(function () {
                scan(params);
            }, Error, "Error thrown");

            // 2nd case : no url in config, url in params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            params = { url: "http://www.example.com", checks: ["headers"] };
            var opts = scan(params);
            assert.equal("http://www.example.com", opts.url);

            // 3rd case : url in config, no url in params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            var configfile = __dirname + "/ut_data/.sitecheckrc1";
            params = { checks: ["headers"], config: configfile };
            opts = scan(params);
            var json = JSON.parse(fs.readFileSync(configfile));
            assert.equal(json.url, opts.url);

            // 4th case : url in config and in params : should use the one in params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            configfile = __dirname + "/ut_data/.sitecheckrc1";
            params = { url: "http://www.example.com", checks: ["headers"], config: configfile };
            opts = scan(params);
            assert.equal("http://www.example.com", opts.url);

            // invalid url
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            configfile = __dirname + "/ut_data/.sitecheckrc1";
            params = { url: "http:/*www.example.com", checks: ["headers"], config: configfile };
            assert.throws(function () {
                scan(params);
            }, Error, "Invalid url");
        });
        
        it('works without log file', function () {
            var scan = require('../src/app.js');
            var params = { url: "http://www.example.com", checks: ["headers"], log: false };
            var opts = scan(params);
            assert.equal("http://www.example.com", opts.url);
        });

        it('handles invalid log level', function () {
            var scan = require('../src/app.js');
            var params = { url: "http://www.example.com", checks: ["headers"], log: true, loglevel: "zcee64c" };
            var opts = scan(params);
            assert.equal("debug", opts.loglevel);
        });
        
        afterEach(function () {
            // runs after each test in this block
        });

        after(function () {
            // remove unit tests logs 
            try {
                fs.removeSync('./log');
            } catch (err) { }
        });
    });
});