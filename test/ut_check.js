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
var Check = require('../src/check');
const CONSTANTS = require("../src/constants.js");
var CancellationToken = require('../src/cancellationToken.js');

describe('Check class', function () {
    it('does not raise issue on empty check', function (done) {
        var c = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, false, true);

        var ct = new CancellationToken();
        c.check(ct).then((issues) => {
            assert(!issues);
            done();
        });
    });

    it('rejects invalid target types', function () {
        new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true); // working case

        assert.throws(function () {
            new Check(null, CONSTANTS.CHECKFAMILY.NONE, true, true);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(undefined, CONSTANTS.CHECKFAMILY.NONE, true, true);
        }, Error, "Error thrown on case 2");

        assert.throws(function () {
            new Check(9999, CONSTANTS.CHECKFAMILY.NONE, true, true);
        }, Error, "Error thrown on case 3");
    });

    it('rejects invalid check family', function () {
        new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true); // working case

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, null, true, true);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, undefined, true, true);
        }, Error, "Error thrown on case 2");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, 9999, true, true);
        }, Error, "Error thrown on case 3");
    });

    it('ensures ctor parameters correctly', function () {
        new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true); // working case

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, null, true);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, null);
        }, Error, "Error thrown on case 2");
    });
});