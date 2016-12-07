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

/**
* This module modifies 'request' module to extend some functionalities :
* - counts requests
* - activates gzip compression/decompression by default
* - logs requests
* - todo : cache system
* This module intercepts require('request') statements via nodejs's module cache system.
* Code using 'request' does not change and should still declare require('request').
*/
"use strict";

var mod = require('module'),
    request_orig = require('request'),
    extend = require('extend'),
    fs = require('fs'),
    winston = require('winston');

function request(uri, options, callback) {
    /* istanbul ignore next */ // not our code
    if (typeof uri === 'undefined') {
        throw new Error('undefined is not a valid uri or options object.')
    }

    var params = request_orig.initParams(uri, options, callback);
    params.starttime = process.hrtime();
    // override callback so we can log
    var cb = params.callback;
    params.callback = function (err, res, body) {
        if (!err) {
            winston.log('warn', res.statusCode + ' : ' + res.request.uri.href);
        } else {
            if (err.code) {
                winston.log('warn', err.code + ' : ' + err.message);
            } else {
                winston.log('warn', err.message);
            }
        }
        cb(err, res, body);
    }
    // change gzip param default behavior. Default is now true.
    
    if (params.gzip === false || params.gzip === 0) {
        params.gzip = false;
    } else {
        params.gzip = true;
    }

    /* istanbul ignore next */ // not our code
    if (params.method === 'HEAD' && paramsHaveRequestBody(params)) {
        throw new Error('HTTP HEAD requests MUST NOT include a request body.')
    }

    request.requestCount++;

    return new request_orig.Request(params);
}

/* istanbul ignore next */ // not our code
function verbFunc(verb) {
    var method = verb.toUpperCase()
    return function (uri, options, callback) {
        var params = request_orig.initParams(uri, options, callback);
        params.method = method
        return request(params, params.callback)
    }
}

// define like this to please codeintel/intellisense IDEs
request.get = verbFunc('get')
request.head = verbFunc('head')
request.post = verbFunc('post')
request.put = verbFunc('put')
request.patch = verbFunc('patch')
request.del = verbFunc('delete')
request['delete'] = verbFunc('delete')

// add a request counter
request.requestCount = 0;

/* istanbul ignore next */ // not our code
request.jar = function (store) {
    return cookies.jar(store)
}

/* istanbul ignore next */ // not our code
request.cookie = function (str) {
    return cookies.parse(str)
}

mod._cache[require.resolve('request')].exports = request;
request.Request = request_orig.Request;
request.initParams = request_orig.initParams;

module.exports = request;