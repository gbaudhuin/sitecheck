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

var http = require('http');
var fs = require('fs-extra');
var AutoLogin = require('../src/autoLogin.js');
var tough = require('tough-cookie');

var server = http.createServer(function (req, res) {
    if (req.url == '/login') {
        var contents = fs.readFileSync(__dirname + "/ut_data/ut_autoLogin/login.html", 'utf8');
        var fields = {
            action: 'session.html',
            username: 'user123',
            password: 'password',
            csrf: 'authenticity_token',
            csrf_value: 'zfz4f4zf94zf9zf94zf'
        };

        contents = contents.replace(/{{action_field}}/g, fields.action);
        contents = contents.replace(/{{username_field}}/g, fields.username);
        contents = contents.replace(/{{password_field}}/g, fields.password);
        contents = contents.replace(/{{csrf_field}}/g, fields.csrf);
        contents = contents.replace(/{{csrf_value}}/g, fields.csrf_value);

        var cookiejar = new tough.CookieJar();
        var c = new tough.Cookie({ key: 'sess_id', value: 'BAh7CSIKZmxhc2hJQzonQWN0aW9uQ29udHJvbGxlcjo6Rmxhc2g6OkZsYXNo', maxAge: "86400" });
        cookiejar.setCookieSync(c, 'http://localhost:8000' + req.url);
        var cookieStr = cookiejar.getCookiesSync('http://localhost:8000' + req.url);
        res.setHeader('set-cookie', cookieStr);
        res.end(contents);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('wrong request');
    }
});

describe('AutoLogin class', function () {
    before(function () {
        server.listen(8000);
    });

    it('#findFormData', function (done) {
        this.timeout(5000);

        //var autoLogin = new AutoLogin('http://localhost:8000/login');
        var autoLogin = new AutoLogin('https://twitter.com/');
        autoLogin.findLoginInputVector((err, data) => {
         //   if (data.fields.user == "user123") done();
          //  else done(new Error("user field no found"));

            autoLogin.login((err, data) => {
                done(err);
            });
        });


    });
    
    after(function () {
        server.close();
    });
});