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
* Constants used in project
*/
module.exports = Object.freeze({
    /**
     * Represents a type of check. Different type of checks happen at different moments, potentially on different type of webresources (url, html, etc.)./>.
     */
    TARGETTYPE: {
        /**
       * Check is not to be used
       */
        NONE: 0,

        /**
        * Check is done before scan, everytime a scan starts or resumes.
        */
        PRESCAN_SYSTEMATIC: 1,

        /**
        * Check is done before scan starts.
        */
        PRESCAN: 2,

        /**
        * Check is done on the server network.
        */
        NETWORJ: 4,

        /**
        * Check is done on the server as a whole.
        */
        SERVER: 8,

        /**
        * Check is done after the crawl pass, on a page content
        */
        PAGE: 16,

        /**
        * Check is done after the crawl pass, on an url pointing to a directory
        */
        DIRECTORY: 32,

        /**
        * Check is done after the crawl pass, on a user input (get,post,header,cookie, etc.)
        */
        INPUTVECTOR: 64,

        /**
        * Check is done after the crawl pass, on common frameworks and cms
        */
        THIRDPARTY: 128,

        /**
        * Check is done at the end of the scan
        */
        POSTSCAN: 265,

        /**
        * Check is done with external sources : Google Hacking, etc.
        */
        EXTERNAL: 512,

        /**
        * Check is done before scan starts. Identifies technologies and versions used on application/server
        */
        WHATSBEHIND: 1024
    },

    /**
     * Check family : security or seo
     */
    CHECKFAMILY: {
        /**
        * none
        */
        NONE: 0,

        /**
        * security checks
        */
        SECURITY: 1,

        /**
        * seo checks
        */
        SEO: 2
    },

    /**
     * State of target
     */
    TARGETSTATE: {
        /**
        * Target not done yet. Waiting to be checked.
        */
        toBeDone: 0,

        /**
        * Crawl pass done.
        */
        crawlPassDone: 1,

        /**
        * Post crawl actions done (mostly checks)
        */
        postCrawlPassDone: 2
    }
});