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
var request = require('../../requestwrapper');
const CONSTANTS = require("../../constants.js");
var cheerio = require('cheerio');

const SECURED_DOMAINS = [
    ".akamai.net",
    ".akamaiedge.net",
    ".akamaihd.net",
    ".edgesuite.net",
    ".edgekey.net",
    ".srip.ne",
    ".akamaitechnologies.com",
    ".akamaitechnologies.fr",
    ".llnwd.net",
    "edgecastcdn.net",
    ".systemcdn.net",
    ".transactcdn.net",
    ".v1cdn.net",
    ".v2cdn.net",
    ".v3cdn.net",
    ".v4cdn.net",
    ".v5cdn.net",
    "hwcdn.net",
    ".simplecdn.net",
    ".instacontent.net",
    ".footprint.net",
    ".ay1.b.yahoo.com",
    ".yimg.",
    ".yahooapis.com",
    ".google.",
    "googlesyndication.",
    "youtube.",
    ".googleusercontent.com",
    "googlehosted.com",
    ".gstatic.com",
    ".insnw.net",
    ".inscname.net",
    ".internapcdn.net",
    ".cloudfront.net",
    ".netdna-cdn.com",
    ".netdna-ssl.com",
    ".netdna.com",
    ".cotcdn.net",
    ".cachefly.net",
    "bo.lt",
    ".cloudflare.com",
    ".afxcdn.net",
    ".lxdns.com",
    ".att-dsa.net",
    ".vo.msecnd.net",
    ".voxcdn.net",
    ".bluehatnetwork.com",
    ".swiftcdn1.com",
    ".cdngc.net",
    ".gccdn.net",
    ".panthercdn.com",
    ".fastly.net",
    ".nocookie.net",
    ".gslb.taobao.com",
    ".gslb.tbcache.com",
    ".mirror-image.net",
    ".yottaa.net",
    ".cubecdn.net",
    ".r.cdn77.net",
    ".incapdns.net",
    ".bitgravity.com",
    ".r.worldcdn.net",
    ".r.worldssl.net",
    "tbcdn.cn",
    ".taobaocdn.com",
    ".ngenix.net",
    ".pagerain.net",
    ".ccgslb.com",
    "cdn.sfr.net",
    ".azioncdn.net",
    ".azioncdn.com",
    ".azion.net",
    ".cdncloud.net.au",
    ".rncdn1.com",
    ".cdnsun.net",
    ".mncdn.com",
    ".mncdn.net",
    ".mncdn.org",
    "cdn.jsdelivr.net",
    ".nyiftw.net",
    ".nyiftw.com",
    ".resrc.it",
    ".zenedge.net",
    ".lswcdn.net",
    ".revcn.net",
    ".revdn.net",
    ".caspowa.com",
];

module.exports = class CheckHeaders extends Check {

    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    _check(cancellationToken) {
        let self = this;
        let timeout = 3000;
        let found = false;
        return new Promise(function (resolve, reject) {
            request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, function (err, res, body) {
                if (err && err.cancelled) {
                    reject(err);
                    return;
                }
                let $ = cheerio.load(body);
                $('script').each(function () {
                    for (let reg in SECURED_DOMAINS) {
                        let currentDomain = self.extractDomain(self.target.uri);
                        let matched = $(this).attr('src');
                        if (matched !== undefined) {
                            if (matched.indexOf(currentDomain) === -1 && matched.indexOf(SECURED_DOMAINS[reg]) !== -1) {
                                found = true;
                            }
                        }
                    }
                });
                if (!found) {
                    self._raiseIssue("warning_cross_domain.xml", null, "There is a script tag which contains potentially insecured Javascript source at url'" + res.request.uri.href + "' this is not recommanded to delegate security to a third party website.", true);
                }
                resolve();
            });
        });
    }

    extractDomain(url) {
        var domain;
        //find & remove protocol (http, ftp, etc.) and get domain
        domain = url.split('/')[2];
        //find & remove port number
        domain = domain.split(':')[0];

        return domain;
    }
};