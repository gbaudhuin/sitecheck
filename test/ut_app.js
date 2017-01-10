﻿/**
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

/**
* Test src/app.js
*/
describe('app.js', function () {
    it('doesn\'t raise exceptions', function () {
        assert.doesNotThrow(() => {
            require('../src/app.js');
        });
    });

    it('can start a scan', function () {
        assert.doesNotThrow(() => {
            try {
                let app = require('../src/app.js');
                app.scan({ url: "http://www.example.com", checks: ["headers"], log: true });
            } catch (ex) {
                console.log(ex);
                throw ex;
            }
        });
    });
});