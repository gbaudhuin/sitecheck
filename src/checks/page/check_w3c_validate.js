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

let fs = require('fs');
var Check = require('../../check');
const CONSTANTS = require("../../constants.js");
let md5 = require('md5');
let request = require('request');

module.exports = class CheckW3CValidator extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
        this._cancellationToken = null;
    }

    _check(cancellationToken, done) {

        let self = this;
        self._cancellationToken = cancellationToken;
        let timeout = 10000;
        let obj = {};

        request.get({
            url: self.target.uri.href,
            timeout: timeout,
            cancellationToken: cancellationToken
        }, function (err, res, body) {
            fs.writeFile('./W3C_validator_results/' + md5(self.target.uri.href) + '.html', body, (err) => {
                const spawn = require('child_process').spawn;
                const validator = spawn('java', [
                    '-jar',
                    'node_modules/vnu-jar/build/dist/vnu.jar',
                    '--format',
                    'json',
                    './W3C_validator_results/' + md5(self.target.uri.href) + '.html'
                ]);

                validator
                    .stderr
                    .on('data', (data) => {
                        obj = data.toString();
                    });

                validator
                    .stdout
                    .on('data', (data) => {
                        obj = data.toString();
                    });

                validator.on('close', function (code) {
                    try {
                        let json = JSON.parse(obj);
                        if (json.messages.length > 0) {
                            for (let error of json.messages) {
                                console.log(error.type.toUpperCase() + ' : ' + error.message);
                            }
                            self._raiseIssue("check_w3c_validate.xml", self.target.uri, "Webpage is not W3C compliant", true);
                            fs.unlinkSync('./W3C_validator_results/' + md5(self.target.uri.href) + '.html');
                            done();
                        } else {
                            fs.unlinkSync('./W3C_validator_results/' + md5(self.target.uri.href) + '.html');
                            done();
                        }
                    } catch (e) {
                        self._raiseIssue("check_w3c_validate.xml", self.target.uri, "Error happened", true);
                        try{
                            fs.unlinkSync('./W3C_validator_results/' + md5(self.target.uri.href) + '.html');
                            done();
                        } catch(e) {
                            done();
                        }
                    }
                });
            });
        });

    }
};