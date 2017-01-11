"use strict";

var Check = require('../../check');
var request = require('request');
const CONSTANTS = require("../../constants.js");
var request = require('request');
var cheerio = require('cheerio');
var querystring = require('querystring');
var util = require('util');
var linkSelBing = 'h2 a';
var descSelBing = 'div.b_caption';
var itemSelBing = 'li.b_algo';
let emailList = [];

var URLBing = '%s://www.bing.%s/search?&q=%s';

var protocolBingErrorMsg = "Protocol `bing.protocol` needs to be set to either 'http' or 'https', please use a valid protocolBing. Setting the protocolBing to 'https'.";

let resultsPerPageBing = 0;
let tldBing = 'com';
let requestOptionsGlobalBing = {};
let protocolBing = 'http';

module.exports = class CheckDomainEmailBing extends Check {

    constructor(target) {
        super(CONSTANTS.TARGETTYPE.SERVER, CONSTANTS.CHECKFAMILY.SECURITY, false, true, target);
    }

    /** 
     * This check tries to request Bing.
     * A large number of request may be block so be careful when scrapping Bing.
    */
    _check(cancellationToken, done) {
        let self = this;
        let timeout = 30000;
        self._cancellationToken = cancellationToken;
        request.get({ url: self.target.uri, timeout: timeout, cancellationToken: cancellationToken }, (err, res, body) => {
            if (self._handleError(err)) {
                done();
                return;
            }
            let queryStringArray = (self.target.uri.query).match('(q=)(.*)(&)');
            let queryString = queryStringArray[2];
            requestOptionsGlobalBing.url = 'https://www.bing.com/search?first='+resultsPerPageBing+'&q=' + queryString;
            requestOptionsGlobalBing.cancellationToken = cancellationToken;
            requestOptionsGlobalBing.timeout = timeout;
            self.queryBing(cancellationToken, queryString, (err, emailArray) => {
                console.log(self.removeDuplicates(emailArray));
                done();
            });
        });
    }

    /**
     * This function will scrap Bing with a given query string
     * @param cancellationToken
     * @param queryString
     */
    queryBing(cancellationToken, queryString, callback) {
        let self = this;
        self.isPrivateWebsite(cancellationToken, queryString, (isPrivate) => {
            if (isPrivate) {
                callback(null, null);
            }
        });
        var nextCounter = 0;

        self.bing(queryString, 1, function (err, res) {
            if (err) {
                console.error(err);
            }
            //console.log(res.links.length);
            for (var i = 0; i < res.links.length; ++i) {
                var link = res.links[i];
                let match = link.description.match(/\s([^\s]+?)@\w+\.\w+/);
                let match2 = link.description.match(/([^\s]+?)@\w+\.\w+/);
                queryString = queryString.replace('%40', '@');
                if (match) {
                    if(match[0].indexOf(queryString) !== -1){
                        emailList.push(match[0]);
                    }
                }
                else if(match2){
                    if(match2[0].indexOf(queryString) !== -1){
                        emailList.push(match2[0]);
                    }
                }
            }

            if (nextCounter < 4) {
                nextCounter++;
                if (res.next) {
                    res.next();
                }
            }
            else {
                callback(null, emailList);
            }
        });
    }

    isPrivateWebsite(cancellationToken, queryString, callback) {
        if (queryString.match('(10\.\d?\d?\d?\.\d?\d?\d?\.\d?\d?\d?)') ||
            queryString.match('(172\.[1-3]\d?\d?\.\d?\d?\d?\.\d?\d?\d?)') ||
            queryString.match('(192\.168\.\d?\d?\d?\.\d?\d?\d?)') ||
            queryString.match('(127\.\d?\d?\d?\.\d?\d?\d?\.\d?\d?\d?)')) {
            callback(true);
        }
        else {
            callback(false);
        }
    }

    // start parameter is optional
    bing(query, start, callback) {
        let self = this;
        var startIndex = 0;
        if (typeof callback === 'undefined') {
            callback = start;
        } else {
            startIndex = start;
        }
        self.ibing(query, startIndex, callback);
    }


    ibing(query, start, callback) {
        let self = this;
        if (protocolBing !== 'http' && protocolBing !== 'https') {
            protocolBing = 'https';
            console.warn(protocolBingErrorMsg);
        }

        var newUrl = util.format(URLBing, protocolBing, tldBing, querystring.escape(query));
        var requestOptions = {
            url: newUrl,
            timeout: 10000,
            cancellationToken: null,
            resultsPerPageBing: resultsPerPageBing,
            headers : {
                'User-Agent' : "Mozilla/5.0 (X11; Windows x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.51 Safari/537.36"
            }
        };

        for (var k in requestOptions) {
            if (requestOptionsGlobalBing[k]) {
                requestOptions[k] = requestOptionsGlobalBing[k];
            }
        }
         if(requestOptions.url.indexOf('first=0') !== -1){
            requestOptions.url = requestOptions.url.replace('first=0', 'first='+start);
            resultsPerPageBing += 10;
        } else {
            resultsPerPageBing += 10;
            requestOptions.url = requestOptions.url.replace('first='+resultsPerPageBing - 10, 'first='+resultsPerPageBing - 1);
        }
        console.log(requestOptions.url);
        request.get(requestOptions, function (err, resp, body) {
            if ((err === null) && resp.statusCode === 200) {
                var $ = cheerio.load(body);
                var res = {
                    url: requestOptions.url,
                    query: query,
                    start: start,
                    links: [],
                    $: $,
                    body: body
                };
                $(itemSelBing).each(function (i, elem) {
                    var linkElem = $(elem).find(linkSelBing);
                    var descElem = $(elem).find(descSelBing);
                    var item = {
                        title: $(linkElem).first().text(),
                        link: null,
                        description: null,
                        href: $(linkElem).attr('href')
                    };
                    var qsObj = querystring.parse($(linkElem).attr('href'));

                    if (qsObj['/url?q']) {
                        item.link = qsObj['/url?q'];
                        item.href = item.link;
                    }

                    //$(descElem).find('div').remove();
                    //console.log($(descElem).find('p').text());
                    item.description = $(descElem).find('p').text();

                    res.links.push(item);
                });
                    res.next = function () {
                        setTimeout(function () {
                            if(start === 1){
                                self.ibing(query, start + 9, callback);
                            }
                            else{
                                self.ibing(query, start + 10, callback);
                            }
                        }, 2000);
                    };

                callback(null, res);
            } else {
                callback(new Error('Error on response' + (resp ? ' (' + resp.statusCode + ')' : '') + ':' + err + ' : ' + body), null, null);
            }
        });
    }
    /**
     * Function used to remove duplicate results in the array of email adresses found while scrapping Bing.
     * @param EmailAddressesArray
     */
    removeDuplicates(EmailAddressesArray) {
        return Array.from(new Set(EmailAddressesArray));
    }

};
