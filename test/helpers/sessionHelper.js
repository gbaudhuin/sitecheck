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

var tough = require('tough-cookie');
var helpers = require('../../src/helpers.js');


class SessionHelper {
    /**
     * Constructor
     */
    constructor() {
        this.sessids = []; // all created session ids
        this.sessidsConnected = []; // session ids that are connected
    }


    /**
     * Returns true if req contains a header with a valid sessid cookie, even if the session is not a connected one.
     * @param req - http request object
     */
    isValidSession(req) {
        let cookies = [];
        if (req.headers.cookie instanceof Array)
            cookies = req.headers.cookie.map(tough.Cookie.parse);
        else if (req.headers.cookie)
            cookies = [tough.Cookie.parse(req.headers.cookie)];

        for (var c of cookies) {
            if (c.key == "sessid") {
                return true; // so far, any sessid is valid
            }
        }
        return false;
    }

    /**
     * Returns a CSRF token for the session
     * @param req
     */
    getCsrfToken(req) {
        let cookies = [];
        if (req.headers.cookie instanceof Array)
            cookies = req.headers.cookie.map(tough.Cookie.parse);
        else if (req.headers.cookie)
            cookies = [tough.Cookie.parse(req.headers.cookie)];

        for (var c of cookies) {
            if (c.key == "sessid") {
                var token = c.value.substring(0,12).split("").reverse().join(""); // derivating sessId is probably enough here
                return token;
            }
        }
        return null;
    }

    /**
     * Creates an new sessId, stores it and returns it.
     */
    generateSessId() {
        let sessid = helpers.token();
        this.sessids.push(sessid);
        return sessid;
    }

    /**
     * Tries to find a session cookie in req. If it exists, nothing is done. If none exists a new sessid is created and a session cookie is added to 'res' http headers.
     * @param req - http request object
     * @param res - http response object. 'set-cookie' header may be modified by this function.
     */
    manageSession(req, res) {
        let cookies = [];
        if (req.headers.cookie instanceof Array)
            cookies = req.headers.cookie.map(tough.Cookie.parse);
        else if (req.headers.cookie)
            cookies = [tough.Cookie.parse(req.headers.cookie)];

        if (!this.isValidSession(req)) {
            let sessid = this.generateSessId();
            let cookie = new tough.Cookie({ key: 'sessid', value: sessid });
            cookies.push(cookie);
        }

        res.setHeader('set-cookie', cookies.join('; '));
    }

    /**
     * Returns true if req contains a header with a valid connected sessid cookie. If the session id exists but is not connected, returns false.
     * @param req - http request object
     */
    isConnected(req) {
        let cookies = [];
        if (req.headers.cookie instanceof Array)
            cookies = req.headers.cookie.map(tough.Cookie.parse);
        else if (req.headers.cookie)
            cookies = [tough.Cookie.parse(req.headers.cookie)];

        for (var c of cookies) {
            if (c.key == "sessid") {
                if (this.sessidsConnected.includes(c.value)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Turns a valid sessid into a connected one
     * @param req - http request object
     */
    connectSession(req) {
        let cookies = [];
        if (req.headers.cookie instanceof Array)
            cookies = req.headers.cookie.map(tough.Cookie.parse);
        else if (req.headers.cookie)
            cookies = [tough.Cookie.parse(req.headers.cookie)];

        for (var c of cookies) {
            if (c.key == "sessid") {
                if (this.sessids.includes(c.value)) {
                    if (!this.sessidsConnected.includes(c.value)) this.sessidsConnected.push(c.value);
                    return true;
                }
            }
        }
        return false;
    }
}

module.exports = SessionHelper;