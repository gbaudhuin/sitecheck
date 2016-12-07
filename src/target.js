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
var isRelativeUrl = require('is-relative-url');

/**
 * An atomic scan target
 */
class Target {
    /**
     * Constructor
     * @param {String} uri - Url of target. Must be an absolute uri.
     * @param {TargetType} targetType
     */
    constructor(uri, targetType) {
        if (uri && isRelativeUrl(uri)) throw new Error("uri cannot be relative. Uri must be absolute.");
        this.uri = uri;
        this.targetType = targetType;
    }
}

module.exports = Target;