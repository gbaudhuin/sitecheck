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
* - make request cancellable with new option "cancellationToken" (see cancellationToken.js)
* - todo : cache system
* This module intercepts require('request') statements via nodejs's module cache system.
* Code using 'request' does not change and should still declare require('request').
*/
"use strict";

var mod = require('module'),
    request_orig = require('request'),
    winston = require('winston');

/**
 * helper function. Cloned from request/lib/helpers.js.
 * @param params
 */
function paramsHaveRequestBody(params) {
    return (
        params.body ||
        params.requestBodyStream ||
        (params.json && typeof params.json !== 'boolean') ||
        params.multipart
    );
}

function request(uri, options, callback) {
    var params = request_orig.initParams(uri, options, callback);
    params.starttime = process.hrtime();
    // override callback so we can log
    var cb = params.callback;
    params.callback = function (err, res, body) {
        if (!err) {
            winston.log('debug', res.statusCode + ' : ' + res.request.uri.href);
        } else {
            if (err.code) {
                /** 
                 * Remove this when in production
                 * It disable logging for forced dev errors
                 */
                if(err.message.indexOf('127.0.0.1:8001') === -1){
                    winston.log('warn', err.code + ' : ' + err.message);
                }  
            } else {
                winston.log('warn', err.message);
            }
        }
        cb(err, res, body);
    };
    // change gzip param default behavior. Default is now true.

    if (params.gzip === false || params.gzip === 0) {
        params.gzip = false;
    } else {
        params.gzip = true;
    }

    if (params.method === 'HEAD' && paramsHaveRequestBody(params)) {
        throw new Error('HTTP HEAD requests MUST NOT include a request body.');
    }

    request.requestCount++;

    // if a cancellation token exists, register r.abort() to it.
    var r = new request_orig.Request(params);
    if (params.cancellationToken) {
        params.cancellationToken.register(() => {
            r.abort();
            var err = new Error("ECANCELED : request aborted");
            err.cancelled = true;
            err.code = "ECANCELED";
            params.callback(err);
        });
    }
    else{
        throw new Error('Mandatory cancellation token is missing from request options');
    }

    return r;
}

function verbFunc(verb) {
    var method = verb.toUpperCase();
    return function (uri, options, callback) {
        var params = request_orig.initParams(uri, options, callback);
        params.method = method;
        return request(params, params.callback);
    };
}

// define like this to please codeintel/intellisense IDEs
request.get = verbFunc('get');
request.head = verbFunc('head');
request.post = verbFunc('post');
request.put = verbFunc('put');
request.patch = verbFunc('patch');
request.del = verbFunc('delete');
request['delete'] = verbFunc('delete');

// add a request counter
request.requestCount = 0;

mod._cache[require.resolve('request')].exports = request;
request.Request = request_orig.Request;
request.initParams = request_orig.initParams;
request.cookie = request_orig.cookie;
request.jar = request_orig.jar;
request.defaults = request_orig.defaults;

module.exports = request;