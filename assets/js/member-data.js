(function () {
  'use strict';

  var CACHE_KEY = 'iea_member_bundle_fast_v1';
  var MAX_USABLE_AGE_MS = 24 * 60 * 60 * 1000;
  var DEFAULT_FRESH_AGE_MS = 90 * 1000;
  var inFlight = null;

  function token() {
    return window.IEA_AUTH && window.IEA_AUTH.getToken
      ? window.IEA_AUTH.getToken()
      : '';
  }

  function fingerprint(value) {
    value = String(value || '');
    var hash = 0;
    for (var index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return String(hash);
  }

  function preferredStorage() {
    return window.IEA_AUTH && window.IEA_AUTH.hasRememberedLogin && window.IEA_AUTH.hasRememberedLogin()
      ? localStorage
      : sessionStorage;
  }

  function candidateStorages() {
    var preferred = preferredStorage();
    return preferred === localStorage
      ? [localStorage, sessionStorage]
      : [sessionStorage, localStorage];
  }

  function read() {
    var currentToken = token();
    if (!currentToken) return null;

    var stores = candidateStorages();
    for (var index = 0; index < stores.length; index += 1) {
      try {
        var raw = stores[index].getItem(CACHE_KEY);
        if (!raw) continue;

        var parsed = JSON.parse(raw);
        var savedAt = Number(parsed.savedAt || 0);
        var ageMs = Date.now() - savedAt;

        if (
          !parsed.bundle ||
          parsed.tokenFingerprint !== fingerprint(currentToken) ||
          ageMs < 0 ||
          ageMs > MAX_USABLE_AGE_MS
        ) {
          stores[index].removeItem(CACHE_KEY);
          continue;
        }

        return {
          bundle: parsed.bundle,
          savedAt: savedAt,
          ageMs: ageMs
        };
      } catch (_) {}
    }

    return null;
  }

  function write(bundle) {
    var currentToken = token();
    if (!currentToken || !bundle) return false;

    var payload = JSON.stringify({
      tokenFingerprint: fingerprint(currentToken),
      savedAt: Date.now(),
      bundle: bundle
    });

    try {
      preferredStorage().setItem(CACHE_KEY, payload);
      if (preferredStorage() === localStorage) {
        try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
      }
      return true;
    } catch (_) {
      try {
        sessionStorage.setItem(CACHE_KEY, payload);
        return true;
      } catch (__) {
        return false;
      }
    }
  }

  function clear() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  function syncAuthCaches(bundle) {
    if (!bundle) return;
    if (bundle.dashboard && window.IEA_AUTH.cacheDashboard) {
      window.IEA_AUTH.cacheDashboard(bundle.dashboard, false);
    }

    var member = bundle.dashboard && bundle.dashboard.member;
    if (!member && bundle.attendance) member = bundle.attendance.member;
    if (!member && bundle.membershipPage) member = bundle.membershipPage.member;
    if (member && window.IEA_AUTH.cacheMember) {
      window.IEA_AUTH.cacheMember(member);
    }
  }

  function refresh() {
    if (inFlight) return inFlight;

    inFlight = window.IEA_API
      .post('getMemberBundle', window.IEA_AUTH.withToken())
      .then(function (response) {
        var bundle = response.data || {};
        write(bundle);
        syncAuthCaches(bundle);
        return bundle;
      })
      .finally(function () {
        inFlight = null;
      });

    return inFlight;
  }

  function get(options) {
    options = options || {};
    var cached = read();
    var freshAgeMs = Number(options.freshAgeMs || DEFAULT_FRESH_AGE_MS);

    if (!options.force && cached && cached.ageMs <= freshAgeMs) {
      return Promise.resolve(cached.bundle);
    }

    return refresh().catch(function (error) {
      if (cached && options.allowStale !== false) return cached.bundle;
      throw error;
    });
  }

  function updateAfterAttendance(data) {
    var cached = read();
    if (!cached || !cached.bundle || !data) {
      clear();
      if (window.IEA_AUTH.clearCachedDashboard) {
        window.IEA_AUTH.clearCachedDashboard();
      }
      return;
    }

    var bundle = cached.bundle;
    var member = bundle.attendance && bundle.attendance.member
      ? bundle.attendance.member
      : (bundle.dashboard ? bundle.dashboard.member : null);

    bundle.attendance = {
      member: member,
      eligibility: data.eligibility || [],
      history: data.history || [],
      statistics: data.statistics || {}
    };

    if (bundle.membershipPage && data.membership) {
      bundle.membershipPage.membership = data.membership;
    }

    if (bundle.dashboard && data.membership) {
      bundle.dashboard.membership = Object.assign(
        {},
        bundle.dashboard.membership || {},
        data.membership,
        {
          totalSessionsAttended: data.statistics
            ? data.statistics.totalAttendance
            : (bundle.dashboard.membership || {}).totalSessionsAttended
        }
      );

      if (data.history && data.history.length) {
        var last = data.history[0];
        bundle.dashboard.attendanceSnapshot = {
          lastAttendance: {
            club: last.club,
            sessionCode: last.sessionCode,
            title: last.title,
            date: last.date
          },
          mostAttendedClub: data.statistics
            ? data.statistics.mostAttendedClub
            : ''
        };
      }
    }

    write(bundle);
    syncAuthCaches(bundle);
  }

  function prefetchMemberPages() {
    [
      'member-dashboard.html',
      'member-attendance.html',
      'member-membership.html'
    ].forEach(function (href) {
      if (document.querySelector('link[rel="prefetch"][href="' + href + '"]')) return;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }

  window.IEA_MEMBER_DATA = Object.freeze({
    read: read,
    write: write,
    clear: clear,
    refresh: refresh,
    get: get,
    updateAfterAttendance: updateAfterAttendance,
    prefetchMemberPages: prefetchMemberPages
  });
}());
