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

/*jshint expr: true*/

'use strict';

let request = require('request');
var http = require('http');
var cancellationToken = require('../../../src/cancellationToken.js');

var server = http.createServer(function (req, res) {
    if (req.url == '/rejected') {
        setTimeout(() => {
            res.end();
        }, 2500)
    }
    else {
        res.end('wrong request');
    }
});

describe('checks/server/check_cancel.js', function () {
    var ct = new cancellationToken();
    this.timeout(3000);
    before(() => {
        server.listen(8000);
    });
    it('Cancel request', (done) => {
        let r = request.get({ url: "http://localhost:8000/rejected", timeout: 2000 }, function (err, res, body) {
            if (!err) {
                console.log('iae');
            }
        });
        if (ct) {
                ct.register(() => {
                    r.abort();
                    done();
                });
            }
         ct.cancel();
    });
    after(() => {
        server.close();
    });
});