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

/**
 * A scan issue
 */
class Issue {
    /**
     * Constructor
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
    constructor(ref, positionIdentifier, errorContent, maybeFalsePositive) {
        this.ref = ref;
        this.positionIdentifier = positionIdentifier;
        this.errorContent = errorContent;
        this.maybeFalsePositive = maybeFalsePositive;
    }
}

module.exports = Issue;