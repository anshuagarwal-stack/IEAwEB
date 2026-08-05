(function () {
  'use strict';

  function configuredUrl() {
    var url = String(window.IEA_CONFIG.API_URL || '').trim();
    if (!url || url.indexOf('PASTE_APPS_SCRIPT') >= 0) {
      var error = new Error('The Apps Script Web App URL has not been configured in assets/js/config.js.');
      error.code = 'API_NOT_CONFIGURED';
      throw error;
    }
    return url;
  }

  function fetchWithTimeout(url, options) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, window.IEA_CONFIG.REQUEST_TIMEOUT_MS || 45000);
    options = options || {};
    options.signal = controller.signal;
    options.redirect = 'follow';
    options.cache = 'no-store';
    return fetch(url, options).finally(function () { window.clearTimeout(timer); });
  }

  function parseResponse(response) {
    return response.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); }
      catch (_) {
        var parseError = new Error('The server returned an invalid response.');
        parseError.code = 'INVALID_SERVER_RESPONSE';
        throw parseError;
      }
      if (!response.ok || data.status !== 'success') {
        var error = new Error(data.message || 'The request could not be completed.');
        error.code = data.code || 'SERVER_ERROR';
        error.data = data.data || null;
        throw error;
      }
      return data;
    });
  }

  function get(action, params) {
    var url = new URL(configuredUrl());
    url.searchParams.set('action', action);
    Object.keys(params || {}).forEach(function (key) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') url.searchParams.set(key, String(params[key]));
    });
    return fetchWithTimeout(url.toString(), { method: 'GET', mode: 'cors' }).then(parseResponse);
  }

  function post(action, payload) {
    var body = Object.assign({}, payload || {}, { action: action });
    return fetchWithTimeout(configuredUrl(), {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(parseResponse);
  }

  window.IEA_API = Object.freeze({ get: get, post: post });
}());
