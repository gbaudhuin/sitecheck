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
const CONSTANTS = require("./constants.js");

/**
 * Base class of checks; All checks classes must derive from this class.
 */
class Check {
    /**
     * Constructor. Derived classes must create a unique parameter-less constructor which calls this ctor with hard values.
     * @param {Number} targetType - Type of Target. TargetType defines the scan phase and the kind of resources that are checked.
     * @param {CheckFamily} checkFamily - SECURITY or SEO.
     * @param {Boolean} requiresAuthorization - True if the check cannot be run without website authors authorization. Authorization key file must be present in the site.
     *                                           False otherwise.
     * @param {Boolean} canRunDuringCrawling - Some checks need to analyse all known targets to get the information they need to run.
     *                                           E.G. : is a particular URI referenced in the site ? are there pages with .php5 extension ?
     *                                           If a check does not need to access full crawling results, this property is set to true so it can be run during crawling.
     *                                           This has 2 advantages : scan will be faster and the user will get more feedback during crawl.
     *                                           Advice : if a check never uses Scan.Targets, this value should be True.
     */
    constructor(targetType, checkFamily, requiresAuthorization, canRunDuringCrawling) {
        this.hooks = [];
        this.hooks.OnRaiseIssue = [];

        // targetType
        for (let t in CONSTANTS.TARGETTYPE) {
            /* istanbul ignore else */
            if (CONSTANTS.TARGETTYPE.hasOwnProperty(t)) {
                if (CONSTANTS.TARGETTYPE[t] == targetType) {
                    this.targetType = targetType;
                }
            }
        }
        if (this.targetType === undefined || this.targetType === null) {
            throw new Error("Check : Invalid targetype '" + targetType + "'");
        }

        // CheckFamily
        for (let t in CONSTANTS.CHECKFAMILY) {
            /* istanbul ignore else */
            if (CONSTANTS.CHECKFAMILY.hasOwnProperty(t)) {
                if (CONSTANTS.CHECKFAMILY[t] == checkFamily) {
                    this.checkFamily = checkFamily;
                }
            }
        }
        if (this.checkFamily === undefined || this.checkFamily === null) {
            throw new Error("Check : Invalid checkFamily '" + checkFamily + "'");
        }

        // requiresAuthorization
        if (requiresAuthorization !== false && requiresAuthorization !== true) {
            throw new Error("Check : requiresAuthorization must be set and must be a boolean.");
        }
        this.requiresAuthorization = requiresAuthorization;

        // canRunDuringCrawling
        if (canRunDuringCrawling !== false && canRunDuringCrawling !== true) {
            throw new Error("Check : canRunDuringCrawling must be set and must be a boolean.");
        }
        this.canRunDuringCrawling = canRunDuringCrawling;
    }

    setHook(_CheckHookEnum, callback) {
        if (_CheckHookEnum == "OnRaiseIssue") {
            this.hooks.OnRaiseIssue.push(callback);
        }
    }

    /**
     * Helper function used by checks to raise an issue.
     * @access protected
     * @param {String} ref - An arbitrary string that identifies the kind of Issue. Usually the xml name. The string must be unique among checks. Reference is used to link the instance with an IssueInfo.
     * @param {String} positionIdentifier - A string that describes the location of the issue. e.g : line number, url, html fragment, etc.
                                            positionIdentifier should be as precise as possible for 2 reasons :
                                            <ul>
                                            <li> this valus is used in Issue.Id construction and must help discriminate two issues that happen at two different places but that cannot be differenciated otherwise</li>
                                            <li> help user as much as possible to quickly localize the problem in his/her website server or source code</li>
                                            </ul>
                                            A good positionIdentifier is also as much long-lasting and stable as possible. e.g : in a web page, id of an html tag is often more stable than a line number.
     * @param {String} errorContent - The proof of the issue.<br>
                                    Most problems are detected in website content either obtained passively or from crafted requests made by checks. ErrorContent should contain the piece of content that "convinced" the check of the issue. This is the proof that will be given to the user to help him/her understand and solve the issue.
                                    ErrorContent is also helpful to help user detect false positives.
     * @param {Boolean} maybeFalsePositive - Some issues may be false positives. Checks must set this value to true if any doubt exists or if any objection may be found by the user, whatever his/her context.
                                            Only checks that are 100% sure to be true positives  in any case should set this value to false.
     */
    _raiseIssue(ref, positionIdentifier, errorContent, maybeFalsePositive) {
        for (var i = 0; i < this.hooks.OnRaiseIssue.length; i++) {
            let callback = this.hooks.OnRaiseIssue[i];
            callback(ref, positionIdentifier, errorContent, maybeFalsePositive);
        }
    }

    /**
     * Return a Promise.
     * Promises should never reject or the app will shutdown. (The only case where reject is used is when a critical error occurs)
     * @param {Target} target - The target to scan
     */
    check(target) {
        this.target = target;
        return this._check();
    }

    /**
     * Inner check function to override in sub classes. These functions contain the actual check logic.
     */
    _check() {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }
}

module.exports = Check;