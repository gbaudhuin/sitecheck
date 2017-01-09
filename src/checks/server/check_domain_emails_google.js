"use strict";

var Check = require('../../check');
var request = require('request');
var url = require('url');
var async = require('async');
const CONSTANTS = require("../../constants.js");
var params = require('../../params.js');

module.exports = class CheckDomainEmail extends Check {
    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }
    /** 
     * This check tries to request Google.
     * A large number of request may be block so be carful when scrapping Google.
    */
    _check(cancellationToken, queryString, done) {
        var self = this;
        var timeout = 30000;
        self._cancellationToken = cancellationToken;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken, jar: cookieJar }, (err, res, body) => {
            if (err && err.cancelled) {
                done(err);
                return;
            }

            if (res.statusCode == 200) {
                self.queryGoogle(queryString);
            }
        });
    }

    /**
     * This function will scrap Google with a given query string
     * @param cancellationToken
     * @param queryString
     */
    queryGoogle(cancellationToken, queryString, callback){

    }
};