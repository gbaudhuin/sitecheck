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
var fs = require('fs-extra');
var inputVector = require('../src/inputVector.js');

describe('InpuVector class', function () {
    it('#parseHtml', function () {
        var html = fs.readFileSync(__dirname + "/ut_data/ut_inputVector/twitter20161209.html", 'utf8');
        var out = inputVector.parseHtml(html);
        assert(out.length > 0);
    });
});