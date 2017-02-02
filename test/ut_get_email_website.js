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

let get_email_website = require('../src/get_email_website');
var CancellationToken = require('../src/cancellationToken.js');

describe('get Email from a website', function () {

    it('can grab email addresses', (done) => {
        let emails = new get_email_website();
        emails.checkForEmails('http://peoleo.fr/', new CancellationToken(), (emailList, err) => {
            if(emailList){
                done();
            }
            else{
                done(new Error('Unexpected error throwed'));
            }
        });
    });
});