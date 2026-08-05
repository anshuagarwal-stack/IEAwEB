(function () {
  'use strict';

  var PERSISTENT_TOKEN_SUFFIX = '_remembered';
  var CACHE_PREFIX = 'iea_member_cache_v2_';
  var MEMBER_CACHE_KEY = 'member';
  var DASHBOARD_CACHE_KEY = 'dashboard';
  var CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  function sessionTokenKey() {
    return String(window.IEA_CONFIG.TOKEN_KEY || 'iea_member_session_token');
  }

  function persistentTokenKey() {
    return sessionTokenKey() + PERSISTENT_TOKEN_SUFFIX;
  }

  function readSessionToken() {
    try {
      return sessionStorage.getItem(sessionTokenKey()) || '';
    } catch (_) {
      return '';
    }
  }

  function readPersistentToken() {
    try {
      return localStorage.getItem(persistentTokenKey()) || '';
    } catch (_) {
      return '';
    }
  }

  function getToken() {
    return readSessionToken() || readPersistentToken();
  }

  function hasRememberedLogin() {
    return Boolean(readPersistentToken());
  }

  function tokenFingerprint(token) {
    var value = String(token || '');
    var hash = 0;
    var index;

    for (index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }

    return String(hash);
  }

  function cacheStorage() {
    return hasRememberedLogin() ? localStorage : sessionStorage;
  }

  function cacheKey(name) {
    return CACHE_PREFIX + name;
  }

  function removeCacheFrom(storage) {
    try {
      storage.removeItem(cacheKey(MEMBER_CACHE_KEY));
      storage.removeItem(cacheKey(DASHBOARD_CACHE_KEY));
    } catch (_) {}
  }

  function clearDataCache() {
    removeCacheFrom(sessionStorage);
    removeCacheFrom(localStorage);
    try { sessionStorage.removeItem('iea_member_bundle_fast_v1'); } catch (_) {}
    try { localStorage.removeItem('iea_member_bundle_fast_v1'); } catch (_) {}
  }

  function writeCache(name, data, extra) {
    var token = getToken();
    if (!token || !data) return false;

    try {
      cacheStorage().setItem(cacheKey(name), JSON.stringify({
        tokenFingerprint: tokenFingerprint(token),
        savedAt: Date.now(),
        data: data,
        extra: extra || {}
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readCache(name) {
    var token = getToken();
    if (!token) return null;

    var storages = [cacheStorage()];
    if (storages[0] !== sessionStorage) storages.push(sessionStorage);
    if (storages[0] !== localStorage) storages.push(localStorage);

    for (var index = 0; index < storages.length; index += 1) {
      try {
        var raw = storages[index].getItem(cacheKey(name));
        if (!raw) continue;

        var parsed = JSON.parse(raw);
        var ageMs = Date.now() - Number(parsed.savedAt || 0);

        if (
          !parsed ||
          parsed.tokenFingerprint !== tokenFingerprint(token) ||
          ageMs > CACHE_MAX_AGE_MS
        ) {
          storages[index].removeItem(cacheKey(name));
          continue;
        }

        return {
          data: parsed.data,
          savedAt: Number(parsed.savedAt || 0),
          ageMs: ageMs,
          extra: parsed.extra || {}
        };
      } catch (_) {}
    }

    return null;
  }

  function clearBrowserTokens() {
    try {
      sessionStorage.removeItem(sessionTokenKey());
      sessionStorage.removeItem('iea_member_session_meta');
    } catch (_) {}

    try {
      localStorage.removeItem(persistentTokenKey());
      localStorage.removeItem('iea_member_session_meta');
    } catch (_) {}
  }

  function storeToken(token, rememberDevice) {
    clearBrowserTokens();
    clearDataCache();

    if (rememberDevice) {
      try {
        localStorage.setItem(persistentTokenKey(), token);
        return 'persistent';
      } catch (_) {
        // Fall back to the current browser session.
      }
    }

    try {
      sessionStorage.setItem(sessionTokenKey(), token);
      return 'session';
    } catch (_) {
      var error = new Error(
        'This browser could not save the login session. Please allow browser storage and try again.'
      );
      error.code = 'BROWSER_STORAGE_UNAVAILABLE';
      throw error;
    }
  }

  function clearSession() {
    clearBrowserTokens();
    clearDataCache();
  }

  function cacheMember(member) {
    if (member) writeCache(MEMBER_CACHE_KEY, member);
  }

  function getCachedMember() {
    var cached = readCache(MEMBER_CACHE_KEY);
    return cached ? cached.data : null;
  }

  function cacheDashboard(data, partial) {
    if (!data) return;
    writeCache(DASHBOARD_CACHE_KEY, data, {
      partial: Boolean(partial)
    });
    if (data.member) cacheMember(data.member);
  }

  function getCachedDashboard() {
    var cached = readCache(DASHBOARD_CACHE_KEY);
    if (!cached) return null;

    return {
      data: cached.data,
      savedAt: cached.savedAt,
      ageMs: cached.ageMs,
      partial: Boolean(cached.extra.partial)
    };
  }

  function clearCachedDashboard() {
    try { sessionStorage.removeItem(cacheKey(DASHBOARD_CACHE_KEY)); } catch (_) {}
    try { localStorage.removeItem(cacheKey(DASHBOARD_CACHE_KEY)); } catch (_) {}
  }

  function login(pin, rememberDevice) {
    return window.IEA_API.post('memberLogin', {
      pin: pin,
      rememberMe: Boolean(rememberDevice)
    }).then(function (response) {
      var data = response.data || {};
      var storageMode = storeToken(data.token, Boolean(rememberDevice));

      data.browserStorageMode = storageMode;
      cacheMember(data.member);

      if (data.dashboard) {
        cacheDashboard(
          data.dashboard,
          data.dashboardIsPartial !== false
        );
      }

      return data;
    });
  }

  function validate() {
    var token = getToken();

    if (!token) {
      return Promise.reject(Object.assign(
        new Error('No active session.'),
        { code: 'INVALID_SESSION_TOKEN' }
      ));
    }

    return window.IEA_API.post('validateSession', {
      token: token
    }).then(function (response) {
      if (response.data && response.data.member) {
        cacheMember(response.data.member);
      }
      return response.data;
    });
  }

  function logout() {
    var token = getToken();

    if (!token) {
      clearSession();
      return Promise.resolve();
    }

    return window.IEA_API.post('memberLogout', {
      token: token
    }).catch(function () {
      // Always remove the local session even if the server is temporarily unavailable.
    }).then(function () {
      clearSession();
    });
  }

  function withToken(payload) {
    return Object.assign({}, payload || {}, {
      token: getToken()
    });
  }

  function redirectToLogin(reason) {
    clearSession();

    var url = 'login.html';
    if (reason) url += '?reason=' + encodeURIComponent(reason);

    window.location.replace(url);
  }

  /*
   * Do not call validateSession before the real page request. Every private
   * endpoint validates the token itself. This removes one complete Apps Script
   * round trip from each member-page click.
   */
  function guardMemberPage() {
    if (!getToken()) {
      redirectToLogin('login-required');
      return Promise.reject(new Error('Login required.'));
    }

    return Promise.resolve({
      member: getCachedMember()
    });
  }

  window.IEA_AUTH = Object.freeze({
    getToken: getToken,
    hasRememberedLogin: hasRememberedLogin,
    storeToken: storeToken,
    clearSession: clearSession,
    clearDataCache: clearDataCache,
    login: login,
    validate: validate,
    logout: logout,
    withToken: withToken,
    guardMemberPage: guardMemberPage,
    redirectToLogin: redirectToLogin,
    cacheMember: cacheMember,
    getCachedMember: getCachedMember,
    cacheDashboard: cacheDashboard,
    getCachedDashboard: getCachedDashboard,
    clearCachedDashboard: clearCachedDashboard
  });
}());
