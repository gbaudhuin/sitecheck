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
var params = require('../src/params.js');
/**
* Test src/Params.js
*/
describe('Params.js', function () {
    it('doesn\'t raise exceptions', function () {
        var exceptionRaised = false;
        try {
            require('../src/params.js');
        } catch (err) {
            exceptionRaised = true;
        }

        assert.equal(exceptionRaised, false);
    });

    describe('#gatherScanParams', function () {
        beforeEach(function () {
            try {
                // app adds a transports.File each time it runs : we need to reset winston transports each time
                winston.remove(winston.transports.File);
            } catch (err) { }
        });
        /*
        */
        it('verifies check names correctly', function (done) {
            // invalid check name
            var p = { url: "http://www.example.com", checks: ["headers", "b*"], log: true }; // log=true because winston.stream needs a file transport to work
            params.gatherScanParams(p);

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
            // remove unit tests logs 
            try {
                fs.removeSync('./log');
            } catch (err) { }
            // invalid check name
            var p = { url: "http://www.example.com", checks: ["headers", "b*"], log: true };
            params.gatherScanParams(p);
            var winston_stream = winston.stream({ start: -1 });
            winston_stream.on('log', function (log) {
                // at this point the file is supposed to be created
                winston_stream.destroy();
                if (fs.existsSync(params.logFile)) {
                    done();
                }
            });
        });

        it('converts single check to array', function () {
            // single check name as string
            var p = { url: "http://www.example.com", checks: "headers" };
            params.gatherScanParams(p);

            assert(Array.isArray(params.checks)); // string must be converted to array
        });

        it('throw error when no checks', function () { 

            // single check name as string
            var p = { url: "http://www.example.com", checks: null };
            assert.throws(function () {
                params.gatherScanParams(p);
            }, Error, "Error thrown");

            // checks are an object
            p = { url: "http://www.example.com", checks: {} };
            assert.throws(function () {
                params.gatherScanParams(p);
            }, Error, "Error thrown");

            // empty checks array
            p = { url: "http://www.example.com", checks: [] };
            assert.throws(function () {
                params.gatherScanParams(p);
            }, Error, "Error thrown");
        });

        it('rejects inexistant checks', function () {
            // single check name as string
            var p = {
                url: "http://www.example.com", checks: ["headers", "inexistant"]
            };
             params.gatherScanParams(p);

            assert(params.checks.length == 1);
        });

        it('parses url param correctly', function () {
            

            // 1st case : no url in config, no url in Params
            var p = { url: null, checks: ["headers"] };
            assert.throws(function () {
                params.gatherScanParams(p);
            }, Error, "Error thrown");

            // 2nd case : no url in config, url in Params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            p = { url: "http://www.example.com", checks: ["headers"] };
            params.gatherScanParams(p);
            assert.equal("http://www.example.com", params.url);

            // 3rd case : url in config, no url in Params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            var configfile = __dirname + "/ut_data/.sitecheckrc1";
            p = { checks: ["headers"], config: configfile };
            params.gatherScanParams(p);
            var json = JSON.parse(fs.readFileSync(configfile));
            assert.equal(json.url, params.url);

            // 4th case : url in config and in Params : should use the one in Params
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            configfile = __dirname + "/ut_data/.sitecheckrc1";
            p = { url: "http://www.example.com", checks: ["headers"], config: configfile };
            params.gatherScanParams(p);
            assert.equal("http://www.example.com", params.url);

            // invalid url
            try {
                winston.remove(winston.transports.File); // reset winston transports
            } catch (err) { }
            configfile = __dirname + "/ut_data/.sitecheckrc1";
            p = { url: "http:/*www.example.com", checks: ["headers"], config: configfile };
            assert.throws(function () {
                params.gatherScanParams(p);
            }, Error, "Invalid url");
        });

        it('works without log file', function () {           
            var p = { url: "http://www.example.com", checks: ["headers"], log: false };
            params.gatherScanParams(p);
            assert.equal("http://www.example.com", params.url);
        });

        it('handles invalid log level', function () {   
            var p = { url: "http://www.example.com", checks: ["headers"], log: true, loglevel: "zcee64c" };
            params.gatherScanParams(p);
            assert.equal("debug", params.loglevel);
            
        });

        afterEach(function () {
            // runs after each test in this block
            
        });

        after(function () {
            // remove unit tests logs 
            winston.remove(winston.transports.File);
            params.gatherScanParams({ url: "http://www.example.com", checks: ["headers"], log: true, loglevel: "info" });
            try {
                fs.removeSync('./log');
            } catch (err) { }
        });
    });
});