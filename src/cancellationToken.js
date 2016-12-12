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

'use strict';

/**
 * A token used to cancel asynchronous operations.
 * Registered callbacks are called when cancel is called. Callbacks are in charge of interrupting pieces of async code. E.G : call .abort() on a request.
 * @param {CancellationToken} parentToken - Parent token. See CancellationToken.createDependentToken for further explanation.
 */
function CancellationToken(parentToken) {
    if (!(this instanceof CancellationToken)) {
        return new CancellationToken(parentToken);
    }
    this.isCancellationRequested = false;

    var cancellationPromise = new Promise(resolve => {

        /**
        * triggers cancellation.
        * @param {Error} e - optional Error object
        */
        this.cancel = e => {
            this.isCancellationRequested = true;
            if (e) {
                resolve(e);
            }
            else {
                var err = new Error("ECANCELED");
                err.cancelled = true;
                err.code = "ECANCELED";
                resolve(err);
            }
        };
    });

    /**
    * register a callback to be called when cancel() is called
    */
    this.register = (callback) => {
        cancellationPromise.then(callback);
    };

    /**
    * Creates a child token.
    * When a parent token triggers cancellation, child tokens are triggered too.
    * When a child token triggers cancellation, parent does not trigger cancellation.
    */
    this.createDependentToken = () => new CancellationToken(this);


    if (parentToken && parentToken instanceof CancellationToken) {
        parentToken.register(this.cancel);
    }
}

module.exports = CancellationToken;