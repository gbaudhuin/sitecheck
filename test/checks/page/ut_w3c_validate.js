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

const CONSTANTS = require('../../../src/constants.js');
var Target = require('../../../src/target.js');
var http = require('http');
var CancellationToken = require('../../../src/cancellationToken.js');
var check_w3c_validate = require('../../../src/checks/page/check_w3c_validate.js');

var server = http.createServer(function (req, res) {
  if (req.url === '/validate') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Titre de l' +
        'a page</title><link rel="stylesheet" href="style.css"><script src="script.js"></script>' +
        '</head><body></body></html>');
  } else if (req.url === '/fail') {
    res.writeHead(403, {'Content-Type': 'text/html'});
    res.end('aeaea');
  }
   else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('wrong request');
  }
});

describe('checks/server/check_w3c_validate.js', function () {

  before(function () {
    server.listen(8000);
  });

  this.timeout(60000);

  it.only('is a valid page', function (done) {
    let check = new check_w3c_validate(new Target('http://localhost:8000/validate', CONSTANTS.TARGETTYPE.PAGE));
    check
      .check(new CancellationToken())
      .then(() => {
        done();
      })
      .catch((issues) => {
        if (issues && issues.length > 0 && issues[0].errorContent) {
          done();
        } else {
          done(new Error("unexpected issue(s) raised"));
        }
      });
  });

  it.only('is not a valid page', function (done) {
    let check = new check_w3c_validate(new Target('http://twitter.com', CONSTANTS.TARGETTYPE.PAGE));
    check
      .check(new CancellationToken())
      .then(() => {
        done();
      })
      .catch((issues) => {
        if (issues && issues.length > 0 && issues[0].errorContent) {
          console.log(issues[0].errorContent);
          done();
        } else {
          done(new Error("unexpected issue(s) raised"));
        }
      });
  });

  it.only('is not a valid page', function (done) {
    let check = new check_w3c_validate(new Target('http://tsoungui.fr', CONSTANTS.TARGETTYPE.PAGE));
    check
      .check(new CancellationToken())
      .then(() => {
        done();
      })
      .catch((issues) => {
        if (issues && issues.length > 0 && issues[0].errorContent) {
          console.log(issues[0].errorContent);
          done();
        } else {
          done(new Error("unexpected issue(s) raised"));
        }
      });
  });
  
  after(function () {
    server.close();
  });
});