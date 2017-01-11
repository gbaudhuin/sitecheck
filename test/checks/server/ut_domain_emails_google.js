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

'use strict';
var Target = require('../../../src/target.js');
var CancellationToken = require('../../../src/cancellationToken.js');
var CheckDomainEmailGoogle = require('../../../src/checks/server/check_domain_emails_google');
const CONSTANTS = require('../../../src/constants.js');


describe('checks/server/check_domain_emails_(google/bing).js', function () {
    this.timeout(60000);

    it.only('check Google and Bing', (done) => {
        let check = new CheckDomainEmailGoogle(new Target('https://www.google.com/#safe=off&q=@peoleo.fr', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((value) => {
            done(value);
        });
    });

    it.only('check private address', (done) => {
        let check = new CheckDomainEmailGoogle(new Target('https://www.google.com/#safe=off&q=@192.168.0.1', CONSTANTS.TARGETTYPE.SERVER));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((value) => {
            done(value);
        });
    });

    it.only('check if cancellable', (done) => {
        let ct = new CancellationToken();
        let check = new CheckDomainEmailGoogle(new Target('https://www.google.com/#safe=off&q=@peoleo.fr', CONSTANTS.TARGETTYPE.SERVER));
        check.check(ct).then(() => {
            done(new Error('Expected error was not send'));
        }).catch((value) => {
            done();
        });
        ct.cancel();
    });

});