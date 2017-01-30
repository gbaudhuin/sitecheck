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

let Sitemap = require('../src/sitemap_robot-txt');
let CancellationToken = require('../src/cancellationToken.js');
let fs = require('fs');
let http = require('http');
let robot = fs.readFileSync(__dirname + "/ut_data/ut_sitemap/robots.txt");
let sitemap = fs.readFileSync(__dirname + "/ut_data/ut_sitemap/sitemap.xml");

var server = http.createServer(function (req, res) {
    // page with a login form and a session cookie
    if (req.url == '/robot') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(robot);
    } else if (req.url == '/sitemap') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(sitemap);
    }
});

describe('Target class', function () {
    this.timeout(60000);

    before(function () {
        server.listen(8000);
    });

    it.only('load sitemap', (done) => {
        let sitemap = new Sitemap('http://localhost:8000/sitemap');
        sitemap.getUrlsFromSitemap(new CancellationToken(), (itemList, err) => {
            if(!err){
                done();
            }
            else{
                done(new Error('Unexpected error was throwed'));
            }
        });
    });

    it.only('cannot access sitemap', (done) => {
        let sitemap = new Sitemap('http://localhost:8000/sitemap_not_found');
        sitemap.getUrlsFromSitemap(new CancellationToken(), (itemList, err) => {
            if(err){
                done();
            }
            else{
                done(new Error("Expected error was not throwed"));
            }
        });
    });

    it.only('load robots.txt then check a disallowed page', (done) => {
        let sitemap = new Sitemap("http://localhost:8000/robot");
        sitemap.initializeRobotParser(new CancellationToken(), (err) => {
            if(!err){
                sitemap.isAllowed('http://localhost:8000/', (allowed) => {
                if (!allowed) {
                    done();
                }
                else {
                    done(new Error('Expected error not throwed'));
                }
            });
            } else{
                done(new Error("Unexpected error was throwed"));
            }
        });
    });

    it.only('cannot access robots.txt', (done) => {
        let sitemap = new Sitemap("http://localhost:8000/robot_not_found");
        sitemap.initializeRobotParser(new CancellationToken(), (err) => {
            if(err){
                done();
            } else{
                done(new Error("Expected error was not throwed"));
            }
        });
    });

    it.only('load robots.txt then check an allowed page', (done) => {
        let sitemap = new Sitemap("http://localhost:8000/robot");
        sitemap.initializeRobotParser(new CancellationToken(), (itemList, err) => {
            sitemap.isAllowed('http://localhost:8000/allowed/test', (allowed) => {
                if (allowed) {
                    done();
                }
                else {
                    done(new Error('Unexpected error throwed'));
                }
            });
        });
    });

    it.only('load robots.txt then check another allowed page', (done) => {
        let sitemap = new Sitemap("http://localhost:8000/robot");
        sitemap.initializeRobotParser(new CancellationToken(), (itemList, err) => {
            sitemap.isAllowed('http://localhost:8000/test/', (allowed) => {
                if (allowed) {
                    done();
                }
                else {
                    done(new Error('Unexpected error throwed'));
                }
            });
        });
    });

    it.only('load robots.txt then check another disallowed page', (done) => {
        let sitemap = new Sitemap("http://localhost:8000/robot");
        sitemap.initializeRobotParser(new CancellationToken(), (itemList, err) => {
            sitemap.isAllowed('http://localhost:8000/test', (allowed) => {
                if (!allowed) {
                    done();
                }
                else {
                    done(new Error('Expected error not throwed'));
                }
            });
        });
    });

    after(function () {
        server.close();
    });
});

