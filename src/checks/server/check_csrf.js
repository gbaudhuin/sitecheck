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
var request = require('request');
var winston = require('winston');
var cheerio = require('cheerio');
const CONSTANTS = require("../../constants.js");

module.exports = class CheckCSRF extends Check {
  constructor() {
    super(CONSTANTS.TARGETTYPE.PAGE, CONSTANTS.CHECKFAMILY.SECURITY, false, true);
    this._token = "";
    this._form = "";
    this._body = "";
    this._tokenName = "";
    this._token = "";
    this._usernameInput = "";
    this._submitButton = "";
    this._passwordInput = "";
    this._COMMON_CSRF_NAMES = [
      'csrf_token',
      'CSRFName',                   // OWASP CSRF_Guard
      'CSRFToken',                  // OWASP CSRF_Guard
      'anticsrf',                   // AntiCsrfParam.java
      '_RequestVerificationToken',  // AntiCsrfParam.java
      'token',
      'csrf',
      'YII_CSRF_TOKEN',             // http://www.yiiframework.com//
      'yii_anticsrf',               // http://www.yiiframework.com//
      '[_token]',                   // Symfony 2.x
      '_csrf_token',                // Symfony 1.4
      'csrfmiddlewaretoken',        // Django 1.5
      'form_key',                   // Magento 1.9
      'authenticity_token'          // Twitter

    ];
    this._entropy = 0;
  }

  _check() {
    var self = this;
    var timeout = 30000;
    return new Promise((resolve, reject) => {
      request.get({ url: self.target.uri, timeout: timeout }, (err, res, body) => {
        if (err) {
          console.log('error');
          if (err.code === "ESOCKETTIMEDOUT") {
            winston.error("CheckHeaders : no response from '" + self.target.uri + "'. Timeout occured (" + timeout + "ms)");
          } else {
            winston.error("CheckHeaders : no response from '" + self.target.uri + "'. Unkown error (" + err.code + "ms)");
          }
        } else {
          self._body = body;
          self.checkIfPageHaveAForm(res, resolve, self);
        }
      });
    });
  }

  checkIfPageHaveAForm(res, resolve, self) {
    let $ = cheerio.load(self._body);
    $('form').each(function () {
      if ($(this).find('input[type=submit],button[type=submit],button[type=button]').length > 0) {
        self._form = $(this).html();
        self._formAction = $(this).attr('action');
        return self.checkIfFormIsAConnectionForm(res, resolve, self);
      }
      else {
        return resolve();
      }
    });
  }

  checkIfFormHaveAnHiddenInput(res, resolve, self) {
      var b = this;
    let $ = cheerio.load(self._form);
    let input = $('input[type="hidden"]');
    if (input.length === 0) {
      self._raiseIssue("CSRF_Token_Warning.xml", null, "The connection/inscription form at the Url '" + res.url + "' does not have any hidden input", true);
      return resolve();
    }
    else {
      return self.checkIfFormContainToken(res, resolve, self);
    }
  }

  checkIfFormContainToken(res, resolve, self) {
    let $ = cheerio.load(self._form);
    var found = false;
    $('input[type="hidden"]').each(function () {
      let input = $(this);
      self._COMMON_CSRF_NAMES.forEach((name) => {
        if (input.attr('name') == name) {
          self._token = input.prop('value');
          self._tokenName = name;
          return self.checkIfTokenChange(res, resolve, self);
        }
      });

      if (found === false) {
        self._raiseIssue("CSRF_Token_Warning.xml", null, "The connection/inscription form at the Url '" + res.url + "' does not have a CSRF Token", true);
        return resolve();
      }
    });
  }

  checkIfTokenChange(res, resolve, self) {
    request.get({ url: self.target.uri, timeout: 5000 }, (err, res, body) => {
      if (err) {
        self._raiseIssue("CSRF_Token_Warning.xml", null, "Page was not reachable at Url '" + res.url + "'", true);
        return resolve();
      }
      else {
        self._body2 = body;
        let $ = cheerio.load(body);
        let form = $('form');
        if (form.length > 0) {
          self._form2 = form.html();
          let input = $('input[type="hidden"][name=' + self._tokenName + ']');
          if (self._token != input.attr('value') && input.attr('value') !== undefined) {
            self._token2 = input.attr('value');
            return self.checkEntropy(res, resolve, self);
          }
          else {
            console.log('error');
            self._raiseIssue("CSRF_Token_Warning.xml", null, "Token doesn\'t change for each session at Url '" + res.url + "' this may be a security issue", true);
            resolve();
          }
        }
      }
    });
  }

  checkEntropy(res, resolve, self) {
    let entropyFirstToken = 0;
    let entropySecondToken = 0;
    for (let x = 0; x < 256; x++) {
      let char = String.fromCharCode(x);
      let count = self._token.split(char).length - 1;
      let p_x = parseFloat(count) / self._token.length;
      if (p_x > 0) {
        entropyFirstToken += - p_x * Math.log2(p_x);
      }
    }
    for (let x = 0; x < 256; x++) {
      let char = String.fromCharCode(x);
      let count = self._token2.split(char).length - 1;
      let p_x = parseFloat(count) / self._token.length;
      if (p_x > 0) {
        entropySecondToken += - p_x * Math.log2(p_x);
      }
    }
    if (entropyFirstToken > 2.4 && entropySecondToken > 2.4) {
      return resolve();
    }
    else if (entropyFirstToken > 2.4 || entropySecondToken > 2.4) {
      self._raiseIssue("CSRF_Token_Warning.xml", null, "One of the CSRF tokens was secured but others weren\'t necessarily at Url '" + res.url + "' , this can be a security breach, consider to change that ", true);
      return resolve();
    }
    else {
      self._raiseIssue("CSRF_Token_Warning.xml", null, "CSRF tokens aren\'t secured consider changing them to secured one at Url '" + res.url + "'", true);
      return resolve();
    }
  }

  checkIfFormIsAConnectionForm(res, resolve, self) {
    let $ = cheerio.load(this._form);
    if (($('input[type=text],input[type=email]').length > 0) && ($('input[type=password]').length > 0) && ($('input[type=submit],button[type=submit],button[type=button]').length > 0)) {
      self._usernameInput = $('input[type=text],input[type=email]').attr('name');
      self._passwordInput = $('input[type=password]').attr('name');
      self._submitButton = $('input[type=submit],button[type=submit]').attr('value');
      return self.checkIfFormHaveAnHiddenInput(res, resolve, self);
    }
    else {
      return resolve();
    }
  }
};


/*
var found = false;
            let $ = cheerio.load(this._body);
            $('form').each((index, element) => {
                if ($(this).find('input[type=submit],button[type=submit],button[type=button]').length > 0) {
                    self._form = $(this).html();
                    self._formAction = $(this).attr('action');
                    if (($(this).find('input[type=text], input[type=email]').length > 0) && ($('input[type=password]').length > 0) && ($('input[type=submit],button[type=submit],button[type=button]').length > 0)) {
                        self._usernameInput = $('input[type=text],input[type=email]').attr('name');
                        self._passwordInput = $('input[type=password]').attr('name');
                        
                        found = true;
                    }
                }
            });
            if (found === false) {
                logger.log('error', colors.red.bold('✘ ') + 'This page doesn\'t contain a form');
                
            }
            */