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

describe('Check class', function () {
    it('Test OnRaiseIssue', function (done) {
        var c = new Check();

        c.setHook("OnRaiseIssue", function (ref, positionIdentifier, errorContent, maybeFalsePositive) {
            assert.ok(errorContent == "errorContent", "This shouldn't fail");
            done();
        });

        c.raiseIssue("ref", "positionIdentifier", "errorContent", "maybeFalsePositive");
    });

    it('does not allow bad labels on setHook function call', function () {
        var c = new Check();

        var hookCalled = false;
        c.setHook("OnRaiseIssue_badlabel", function (ref, positionIdentifier, errorContent, maybeFalsePositive) {
            hookCalled = true;
        });
        c.check();
        assert.equal(hookCalled, false);
    });

    it('Test check does not raise issue', function () {
        var c = new Check();

        var hookCalled = false;
        c.setHook("OnRaiseIssue", function (ref, positionIdentifier, errorContent, maybeFalsePositive) {
            hookCalled = true;
        });
        c.check();
        assert.equal(hookCalled, false);
    });

    /*
    it('Test 2', function() {
        assert.ok(1 === 1, "This shouldn't fail");
        assert.ok(false, "This should fail");
    });*/
});