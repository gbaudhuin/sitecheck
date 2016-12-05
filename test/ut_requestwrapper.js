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
var request = require('../src/requestwrapper.js');
var fs = require('fs-extra');
var randomstring = require("randomstring");
var http = require('http');
var server = http.createServer(function (req, res) {
    res.end("okay");
});

describe('requestwrapper.js', function () {
    before(function () {
        server.listen(8000);
    });

    it('is ok', function (done) {
        var c = request.requestCount;
        request.get({ url: "http://localhost:8000", timeout: 1000 }, function (err, res, body) {
            assert.equal(res.request.gzip, true, "gzip should be true");
            assert.equal(request.requestCount, c + 1, "bad requestCount");

            request.get({ url: "http://localhost:8000", timeout: 1000, gzip: false }, function (err, res, body) {
                assert.equal(res.request.gzip, false, "gzip should be false");
                assert.equal(request.requestCount, c + 2, "bad requestCount");

                request.get({ url: "http://localhost:8000", timeout: 1000, gzip: 0 }, function (err, res, body) {
                    assert.equal(res.request.gzip, false, "gzip should be false");
                    assert.equal(request.requestCount, c + 3, "bad requestCount");

                    request.get({ url: 'http*://inexistantdomain.com', timeout: 1000 }, function (err, res, body) {
                        assert(!err.code);
                        assert(err.message.indexOf("Invalid URI") !== -1);

                        request.get({ url: 'http://inexistantdomain' + randomstring.generate(5) + '.com/', timeout: 1000, gzip: false }, function (err, res, body) {
                            assert(err.code);
                            assert(err.message);
                            done();
                        });
                    });
                });
            });
        });
    });

    after(function () {
        server.close();
    });
});