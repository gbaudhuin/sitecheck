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

var Check = require('../../check');
var request = require('../../requestwrapper');
const CONSTANTS = require("../../constants.js");

const ERROR_PAGES = [
    '<H1>Error page exception</H1>',
    '<span><H1>Server Error in ',
    '<h2> <i>Runtime Error</i> </h2></span>',
    '<h2> <i>Access is denied</i> </h2></span>',
    '<H3>Original Exception: </H3>',
    'Server object error',
    'invalid literal for int()',
    'exceptions.ValueError',
    '<font face="Arial" size=2>Type mismatch: ',
    '[an error occurred while processing this directive]',
    '<HTML><HEAD><TITLE>Error Occurred While Processing Request</TITLE>',
    '</HEAD><BODY><HR><H3>Error Occurred While Processing Request</H3><P>',
    '<p>Microsoft VBScript runtime </font>',
    "<font face=\"Arial\" size=2>error '800a000d'</font>",
    '<TITLE>nwwcgi Error',
    '<font face="Arial" size=2>error \'800a0005\'</font>',
    '<h2> <i>Runtime Error</i> </h2></span>',
    'Operation is not allowed when the object is closed.',
    '<p>Active Server Pages</font> <font face="Arial" size=2>error \'ASP 0126\'</font>',
    '<b> Description: </b>An unhandled exception occurred during the execution of the current web request',
    '] does not contain handler parameter named',
    '<b>Warning</b>: ',
    'No row with the given identifier',
    'open_basedir restriction in effect',
    "eval()'d code</b> on line <b>",
    "Cannot execute a blank command in",
    "Fatal error</b>:  preg_replace",
    "thrown in <b>",
    "#0 {main}",
    "Stack trace:",
    "</b> on line <b>",
    "PythonHandler django.core.handlers.modpython",
    "t = loader.get_template(template_name) # You need to create a 404.html template.",
    '<h2>Traceback <span>(innermost last)</span></h2>',
    '[java.lang.',
    'class java.lang.',
    'java.lang.NullPointerException',
    'java.rmi.ServerException',
    'at java.lang.',
    'onclick="toggle(\'full exception chain stacktrace\')"',
    'at org.apache.catalina',
    'at org.apache.coyote.',
    'at org.apache.tomcat.',
    'at org.apache.jasper.',
    '<h1 class="error_title">Ruby on Rails application could not be started</h1>',
    '<title>Error Occurred While Processing Request</title></head><body><p></p>',
    '<HTML><HEAD><TITLE>Error Occurred While Processing Request</TITLE></HEAD><BODY><HR><H3>',
    '<TR><TD><H4>Error Diagnostic Information</H4><P><P>',
    '<li>Search the <a href="http://www.macromedia.com/support/coldfusion/" target="new">Knowledge Base</a> to find a solution to your problem.</li>',
    'Server.Execute Error',
    '<h2 style="font:8pt/11pt verdana; color:000000">HTTP 403.6 - Forbidden: IP address rejected<br>',
    '<TITLE>500 Internal Server Error</TITLE>',
];

const VERSION_REGEX = [
    { "regEx": '<address>(.*?)</address>', "server": 'Apache' },
    { "regEx": '<HR size="1" noshade="noshade"><h3>(.*?)</h3></body>', "server": "Apache Tomcat" },
    { "regEx": '<a href="http://www.microsoft.com/ContentRedirect.asp\?prd=iis&sbp=&pver=(.*?)&pid=&ID', "server": 'IIS' },
    { "regEx": '<b>Version Information:</b>&nbsp;(.*?)\n', "server": 'ASP .NET' }
];


module.exports = class CheckErrorPages extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    _check(cancellationToken, done) {
        var self = this;
        var timeout = 3000;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, function (err, res, body) {
            if (err) {
                done(err);
                return;
            }
            for (let reg in VERSION_REGEX) {
                if (400 < parseInt(res.statusCode, 10) && 600 > parseInt(res.statusCode, 10)) {
                    let matched = body.match(new RegExp(VERSION_REGEX[reg].regEx, 'i'));
                    if (matched) {
                        if (res.headers.server)
                            self._raiseIssue("error_pages.xml", null, VERSION_REGEX[reg].server + " server found with version '" + res.headers.server + "' at Url '" + res.request.uri.href + "'", true);
                    }
                }
            }

            for (let error in ERROR_PAGES) {
                if (400 < parseInt(res.statusCode, 10) && 600 > parseInt(res.statusCode, 10)) {
                    if (body.indexOf(ERROR_PAGES[error]) !== -1) {
                        self._raiseIssue("error_pages.xml", null, "Descriptive error page found at Url '" + res.request.uri.href + "'", true);
                    }
                }
            }
            done();
        });
    }
};