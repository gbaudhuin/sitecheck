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

const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
//var fs = require('fs-extra');
//var winston = require('winston');
//var randomstring = require("randomstring");
var CancellationToken = require('../../../src/cancellationToken.js');
let check_code_disclosure = require('../../../src/checks/server/check_code_disclosure.js');
let check_path_disclosure = require('../../../src/checks/page/check_path_disclosure.js');
let check_header = require('../../../src/checks/page/check_headers');
let check_CORS = require('../../../src/checks/server/check_cross_domain');
let check_error_page = require('../../../src/checks/server/check_error_pages');
let check_google_bing = require('../../../src/checks/server/check_domain_emails_google');
let get_email_website = require('../../../src/get_email_website');
let check_sitemap_robot = require("../../../src/sitemap_robot-txt");

describe('checks all modules', function () {
    this.timeout(60000);

    it.only('test code disclosure', (done) => {
        let check = new check_code_disclosure(new Target('http://www.w3schools.com/Php/php_error.asp', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('test path disclosure', (done) => {
        let check = new check_path_disclosure(new Target('https://www.owasp.org/index.php/Full_Path_Disclosure', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('test headers', (done) => {
        let check = new check_header(new Target('http://tsoungui.fr/', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('test CORS', (done) => {
        let check = new check_CORS(new Target('https://www.owasp.org/index.php/CORS_OriginHeaderScrutiny', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('test error pages', (done) => {
        let check = new check_error_page(new Target('http://valerian.crasnier.estiamstudents.com/not_found', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.skip('test google and bing', (done) => {
        let check = new check_google_bing.CheckDomainEmailGoogle(new Target('http://peoleo.fr/', CONSTANTS.TARGETTYPE.PAGE));
        check.check(new CancellationToken()).then(() => {
            done();
        }).catch((issues) => {
            if (issues && issues.length > 0 && issues[0].errorContent) {
                done();
            } else {
                done(new Error("unexpected issue(s) raised"));
            }
        });
    });

    it.only('can grab email addresses', (done) => {
        let emails = new get_email_website();
        emails.checkForEmails('http://peoleo.fr/', new CancellationToken(), (emailList, err) => {
            if (emailList) {
                done();
            }
            else {
                done(new Error('Unexpected error throwed'));
            }
        });
    });

    it.only('can fetch robots.txt and load sitemap', (done) => {
        let robottxt = new check_sitemap_robot('http://peoleo.fr/robots.txt');
        robottxt.initializeRobotParser(new CancellationToken(), (err) => {
            if (!err) {
                robottxt.getUrlsFromSitemap('', new CancellationToken(), (urlList, err) => {
                    if (err) { 
                        console.log('Err');
                        done(new Error('Unexpected error thrown'));
                     }
                    else{
                        if(urlList){
                            done();
                        } else{
                            console.log('Empty urlList');
                            done(new Error('Unexpected error thrown'));
                        }
                    }
                });
            }
            else {
                done(new Error('Unexpected error throwed'));
            }
        });
    });
});
