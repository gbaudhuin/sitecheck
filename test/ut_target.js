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
var Target = require('../src/target.js');
const CONSTANTS = require('../src/constants.js');

describe('Target class', function () {
    it('rejects relative urls', function () {
        assert.throws(function () {
            new Target("lorem", "scanid", CONSTANTS.TARGETTYPE.NONE);
        }, Error, "Error thrown on case 1");

        assert.throws(function () {
            new Target("lorem.php?var=1", "scanid", CONSTANTS.TARGETTYPE.NONE);
        }, Error, "Error thrown on case 2");

        assert.throws(function () {
            new Target("/lorem", "scanid", CONSTANTS.TARGETTYPE.NONE);
        }, Error, "Error thrown on case 3");

        assert.throws(function () {
            new Target("lorem.com/ipsum", "scanid", CONSTANTS.TARGETTYPE.NONE);
        }, Error, "Error thrown on case 4");

        assert.throws(function () {
            new Target("//lorem", "scanid", CONSTANTS.TARGETTYPE.NONE);
        }, Error, "Error thrown on case 5");
    });
});