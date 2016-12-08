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
var CancellationToken = require('../src/cancellationToken.js');

describe('CancellationToken class', function () {

    it('triggers registered cb on cancel', function (done) {
        var ct = CancellationToken();
        ct.register((value) => {
            assert(value.message == "test");
            done();
        });
        ct.cancel(new Error('test'));
    });

    it('triggers registered cb on parameterless cancel', function (done) {
        var ct = CancellationToken();
        ct.register((value) => {
            assert(value.message == "ECANCELED");
            done();
        });
        ct.cancel();
    });

    it('triggers child cancellation without triggering parent', function (done) {
        var ctParent = new CancellationToken();
        ctParent.register(() => {
            done(new Error("Parent token called"));
        });

        var ctChild = ctParent.createDependentToken();
        ctChild.register(() => {
            done();
        });

        ctChild.cancel();
    });
});