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

var cheerio = require('cheerio');

/**
 * An input vector : a set of data that can interract with the application via an url
 * An input vector can be a form action, a restful api call, an url with a query part, etc.
 */
class InputVector {

    /**
     * Constructor
     * @param {string} uri - action uri to pass the input data to.
     * @param {string} method - 'get', 'post', 'header', put, delete, patch. upper case chars are automatically lowercased
     * @param {Object} fields - an array fields. Fields are literals defined this way : {name:'', type:'', value:''}
     */
    constructor(url, name, method, fields) {
        this.url = url; // action url
        this.method = method; // http method : get, post, header, put, delete, patch
        this.fields = fields;
    }

    /**
     * Returns true if the object maps a login form
     */
    isLoginForm() {
        if (this.url && this.fields.password) return true;
        return false;
    }
}

/**
 * Returns an array of input vectors found in html
 * @param {string} html - Html text to parse
 */
function parseHtml(html) {
    var ret = []; // array of InputVectors

    var $ = cheerio.load(html);
    $('form').each((i, el) => {
        var $form = $(el);

        let f = {};

        f.fields = [];
        f.name = $form.attr('name');
        f.action = $form.attr('action');
        f.method = $form.attr('method');
        if (f.method) f.method = f.method.toLowerCase();
        
        $form.find('input').each((i, elem) => {
            let o = {};
            if ($(elem).attr('name')) o.name = $(elem).attr('name');
            if ($(elem).attr('type')) {
                o.type = $(elem).attr('type').toLowerCase();
            }
            if ($(elem).attr('value')) o.value = $(elem).attr('value');
            if ($(elem).attr('value')) o.checked = $(elem).attr('value');
            f.fields.push(o);
        });

        var iv = new InputVector(f.action, f.name, f.method, f.fields);
        ret.push(iv);
    });

    return ret;
}

module.exports = { InputVector, parseHtml };