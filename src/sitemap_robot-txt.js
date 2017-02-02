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

let xmlParser = require('xml2js').parseString;
let request = require('request');
let robotsParser = require('robots-parser');

/**
 * A sitemap : XML file where the categories of the site are referenced
 */

class Sitemap_Robot {

    /**
     * Constructor
     * @param {string} url - Sitemap url to check
     */
    constructor(url) {
        this.url = url;
        this.sitemap_urls = [];
        this.robot = null;
        this.sitemapUrl = null;
    }

    /**
     * Tries to fetch the website sitemap.xml
     * When fetch is completed it will send all URLs found
     * If page send an error it will send the error
     * @param {string} cancellationToken: Token containing a cancel method (When cancel is called all subsequent request will be stopped)
     * @param {function} done: callback function
     */

    getUrlsFromSitemap(url, cancellationToken, done) {
        let self = this;
        if (self.sitemapUrl || url) {
            if (self.sitemapUrl == url) {
                request({ url: url, cancellationToken: cancellationToken, timeout: 5000 }, (err, res, body) => {
                    if (!err) {
                        xmlParser(body, (err, result) => {
                            for (let item of result.urlset.url) {
                                self.sitemap_urls.push(item.loc);
                            }
                            done(self.sitemap_urls, null);
                        });
                    } else {
                        done(null, err);
                    }
                });
            } else{
                request({ url: self.sitemapUrl[0], cancellationToken: cancellationToken, timeout: 5000 }, (err, res, body) => {
                    if (!err) {
                        xmlParser(body, (err, result) => {
                            for (let item of result.urlset.url) {
                                self.sitemap_urls.push(item.loc);
                            }
                            console.log(self.sitemap_urls.length + " URLs found");
                            done(self.sitemap_urls, null);
                        });
                    } else {
                        done(null, err);
                    }
                });
            }
        } else {
            done(null, null);
        }
    }

    /**
     * Initialize the robot with rules found in robots.txt
     * @param {string} cancellationToken: Token containing a cancel method (When cancel is called all subsequent request will be stopped)
     * @param {callback} done
     */

    initializeRobotParser(cancellationToken, done) {
        let self = this;
        let options = [];
        request({ url: self.url, cancellationToken: cancellationToken, timeout: 5000 }, (err, res, body) => {
            if (!err) {
                let match = body.match(/(Disallow: |Allow: |User-agent: |Crawl-delay: |Sitemap: |Host: )([A-Za-z0-9\\\/\-\\.\\&\\*\\?\\=\\$\\_\:]*)/gi);
                for (let matched of match) {
                    options.push(matched);
                }
                self.robot = robotsParser(self.url, options.join('\n'));
                self.sitemapUrl = self.robot.getSitemaps() !== undefined ? self.robot.getSitemaps() : null;
                done(null);
            } else {
                done(err);
            }
        });
    }

    /**
     * Check if the robot can crawl this page
     * It will send true or false depending of the case
     * @param {string} urlToCheck: Url to check
     * @param {callback} done
     */

    isAllowed(urlToCheck, done) {
        let self = this;
        let isAllowed = self.robot.isAllowed(urlToCheck, "SiteCheck");
        done(isAllowed);
    }
}

module.exports = Sitemap_Robot;