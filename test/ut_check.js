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
var Target = require('../src/target.js');
var target = new Target("http://localhost:8000", "scanid", CONSTANTS.TARGETTYPE.NONE);

describe('Check class', function () {
    it('ensures a target is passed', function () {
        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, false, true);
        });
    });

    it('does not raise issue on empty check', function (done) {
        var c = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, false, true, target);

        var ct = new CancellationToken();
        c.check(ct).catch(() => {
            done();
        });
    });

    it('rejects invalid target types', function () {
        assert.doesNotThrow(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target); // working case
        });

        assert.throws(function () {
            new Check(null, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(undefined, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        }, Error, "Error thrown on case 2");

        assert.throws(function () {
            new Check(9999, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        }, Error, "Error thrown on case 3");
    });

    it('rejects invalid check family', function () {
        new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target); // working case

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, null, true, true, target);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, undefined, true, true, target);
        }, Error, "Error thrown on case 2");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, 9999, true, true, target);
        }, Error, "Error thrown on case 3");
    });

    it('ensures ctor parameters correctly', function () {
        new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target); // working case

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, null, true, target);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, null, target);
        }, Error, "Error thrown on case 2");
    });

    it('ensures a cancellation token is passed', function () {
        var check = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        assert.throws(() => {
            check.check();
        });
    });

    it("rejects check's Promise with Error('ECANCELED') when cancel is triggered", function (done) {
        var ct = CancellationToken();
        ct.register((value) => {
        });
        var check = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        check.check(ct).catch((e) => {
            done();
        });
        ct.cancel();
    });

    it("handles errors correctly", function () {
        var check = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        assert(check._handleError(new Error("Fake error (unit test)")));
    });

    it("handles non errors correctly", function () {
        var check = new Check(CONSTANTS.TARGETTYPE.NONE, CONSTANTS.CHECKFAMILY.NONE, true, true, target);
        assert(!check._handleError("Fake error (unit test)"));
    });
});