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

var Check = require('../../check');
var request = require('request');
const CONSTANTS = require("../../constants.js");

module.exports = class CheckHeaders extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
        this._action = "";
        this._cancellationToken = "";
        this._passwordList = [
            "dragon",
            "trustno1",
            "hello",
            "monkey",
            "master",
            "123pass",
            "123password",
            "abc",
            "abc1234",
            "abcd",
            "abcd1234",
            "abcde",
            "administration",
            "data",
            "db",
            "dbpass",
            "passdb",
            "123",
            "1234",
            "12345",
            "123456",
            "1234567",
            "12345678",
            "123456789",
            "1234567890",
            "123123",
            "12321",
            "123321",
            "123abc",
            "123qwe",
            "123asd",
            "1234abcd",
            "1234qwer",
            "1q2w3e",
            "a1b2c3",
            "admin",
            "Admin",
            "administrator",
            "nimda",
            "qwewq",
            "qweewq",
            "qwerty",
            "qweasd",
            "asdsa",
            "asddsa",
            "asdzxc",
            "asdfgh",
            "qweasdzxc",
            "q1w2e3",
            "qazwsx",
            "qazwsxedc",
            "zxcxz",
            "zxccxz",
            "zxcvb",
            "zxcvbn",
            "passwd",
            "password",
            "Password",
            "login",
            "Login",
            "pass",
            "mypass",
            "mypassword",
            "adminadmin",
            "root",
            "rootroot",
            "test",
            "testtest",
            "temp",
            "temptemp",
            "foofoo",
            "foobar",
            "default",
            "password1",
            "password12",
            "password123",
            "admin1",
            "admin12",
            "admin123",
            "pass1",
            "pass12",
            "pass123",
            "root123",
            "pw123",
            "abc123",
            "qwe123",
            "test123",
            "temp123",
            "mypc123",
            "home123",
            "work123",
            "boss123",
            "love123",
            "sample",
            "example",
            "internet",
            "Internet",
            "nopass",
            "nopassword",
            "nothing",
            "ihavenopass",
            "temporary",
            "manager",
            "business",
            "oracle",
            "lotus",
            "database",
            "backup",
            "owner",
            "computer",
            "server",
            "secret",
            "super",
            "share",
            "superuser",
            "supervisor",
            "office",
            "shadow",
            "system",
            "public",
            "secure",
            "security",
            "desktop",
            "changeme",
            "codename",
            "codeword",
            "nobody",
            "cluster",
            "customer",
            "exchange",
            "explorer",
            "campus",
            "money",
            "access",
            "domain",
            "letmein",
            "letitbe",
            "anything",
            "unknown",
            "monitor",
            "windows",
            "files",
            "academia",
            "account",
            "student",
            "freedom",
            "forever",
            "cookie",
            "coffee",
            "market",
            "private",
            "games",
            "killer",
            "controller",
            "intranet",
            "work",
            "home",
            "job",
            "foo",
            "web",
            "file",
            "sql",
            "aaa",
            "aaaa",
            "aaaaa",
            "qqq",
            "qqqq",
            "qqqqq",
            "xxx",
            "xxxx",
            "xxxxx",
            "zzz",
            "zzzz",
            "zzzzz",
            "fuck",
            "12",
            "21",
            "321",
            "4321",
            "54321",
            "654321",
            "7654321",
            "87654321",
            "987654321",
            "0987654321",
            "0",
            "00",
            "000",
            "0000",
            "00000",
            "00000",
            "0000000",
            "00000000",
            "1",
            "11",
            "111",
            "1111",
            "11111",
            "111111",
            "1111111",
            "11111111",
            "2",
            "22",
            "222",
            "2222",
            "22222",
            "222222",
            "2222222",
            "22222222",
            "3",
            "33",
            "333",
            "3333",
            "33333",
            "333333",
            "3333333",
            "33333333",
            "4",
            "44",
            "444",
            "4444",
            "44444",
            "444444",
            "4444444",
            "44444444",
            "5",
            "55",
            "555",
            "5555",
            "55555",
            "555555",
            "5555555",
            "55555555",
            "6",
            "66",
            "666",
            "6666",
            "66666",
            "666666",
            "6666666",
            "66666666",
            "7",
            "77",
            "777",
            "7777",
            "77777",
            "777777",
            "7777777",
            "77777777",
            "8",
            "88",
            "888",
            "8888",
            "88888",
            "888888",
            "8888888",
            "88888888",
            "9",
            "99",
            "999",
            "9999",
            "99999",
            "999999",
            "9999999",
            "99999999"
        ];
    }

/** 
 * In this module we will try to request a protected page (Protected either by basic authentication or by a form)
 * This test is a bruteforce (It will test many tuples of username/password), if you have a protection against that be careful that it doesn't blacklist us.
 * Even is the bruteforce against a basic authentication isn't passing, it's not a secured authentication, consider changing it.
*/

    _check(cancellationToken) {
        var self = this;
        var timeout = 30000;
        self._cancellationToken = cancellationToken;
        return new Promise(function (resolve, reject) {
            self._passwordList.forEach((name) => {
                request.post({
                    headers: {
                        "Authorization": new Buffer("Basic : Bob:" + name).toString('base64')
                    },
                    url: self.target.uri,
                    timeout: timeout,
                    cancellationToken: self._cancellationToken
                }, function (err, res, body) {
                    if (res.statusCode === 200) {
                        self._raiseIssue("Basic_Auth_Warning.xml", null, "Authentication is easily bruteforce at url '" + self.target.uri + "' be careful, consider change authenticating method", true);
                        resolve();
                    }
                });
            });
        });
    }
    //.then(self.login.bind(self));
    //.then(self.testBasic.bind(self));

    /*login() {
        let self = this;
        return new Promise((resolve, reject) => {
            self._passwordList.forEach((name) => {
                try {
                    request.post({
                        url: self._action,
                        form: {
                            "username": "Bob",
                            "password": name
                        },
                        timeout: 15000,
                        cancellationToken: self._cancellationToken,
                        jar: true, gzip: true
                    }, function (err, res, body) {
                        if (!err) {
                            if (res.statusCode !== 403) {
                                resolve();
                            }
                        }
                    });
                }
                catch (e) {
                    reject();
                    throw new Error();
                }
            });
        });
    }*/
};