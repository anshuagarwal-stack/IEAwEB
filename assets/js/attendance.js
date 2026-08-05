(function () {
  'use strict';
  var U = window.IEA_UTILS;
  var eligibilityByClub = {};

  function clubId(club) { return club.toLowerCase().replace(/\s+/g, '-'); }

  function renderEligibility(items) {
    var host = U.byId('attendanceActionGrid');
    U.clearElement(host);
    eligibilityByClub = {};
    (items || []).forEach(function (item) {
      eligibilityByClub[item.club] = item;
      var card = U.createElement('article', { className: 'dark-card attendance-action' });
      card.appendChild(U.createElement('h3', { text: item.club }));
      card.appendChild(U.createElement('p', { className: 'eligibility-reason', text: item.enabled ? 'Attendance is available for the scheduled session.' : item.reason }));
      var preview = U.createElement('div', { className: 'session-preview' });
      if (item.session) {
        preview.appendChild(U.createElement('strong', { text: item.session.sessionCode + ' · ' + item.session.title }));
        preview.appendChild(U.createElement('div', { className: 'small muted', text: [U.formatDate(item.session.date), item.session.time, item.session.venue].filter(Boolean).join(' · ') }));
      } else {
        preview.appendChild(U.createElement('span', { className: 'muted', text: 'No eligible session is available.' }));
      }
      var button = U.createElement('button', {
        className: 'button button-block',
        text: 'Mark ' + item.club + ' Attendance',
        attrs: { type: 'button', id: 'attendance-' + clubId(item.club) }
      });
      button.disabled = !item.enabled;
      if (!item.enabled) button.setAttribute('aria-describedby', 'reason-' + clubId(item.club));
      var reason = card.querySelector('.eligibility-reason');
      reason.id = 'reason-' + clubId(item.club);
      if (item.enabled) button.addEventListener('click', function () { confirmAttendance(item, button); });
      card.appendChild(preview);
      card.appendChild(button);
      host.appendChild(card);
    });
  }

  function confirmAttendance(item, button) {
    var session = item.session;
    U.confirmModal({
      title: 'Mark attendance',
      message: 'Mark your attendance for ' + session.sessionCode + ' – ' + session.title + '?',
      confirmText: 'Mark Attendance'
    }).then(function (confirmed) {
      if (!confirmed) return;
      markAttendance(session.sessionId, button);
    });
  }

  function markAttendance(sessionId, button) {
    button.disabled = true;
    var oldText = button.textContent;
    button.textContent = 'Marking attendance…';

    window.IEA_API
      .post(
        'markAttendance',
        window.IEA_AUTH.withToken({ sessionId: sessionId })
      )
      .then(function (response) {
        var data = response.data || {};
        U.showToast('Attendance marked successfully.', 'success');
        renderSuccess(data.result || {});
        renderEligibility(data.eligibility || []);
        renderHistory(data.history || [], data.statistics || {});
        window.IEA_MEMBER_DATA.updateAfterAttendance(data);
      })
      .catch(function (error) {
        U.showToast(
          error.message || 'Attendance could not be marked.',
          'error'
        );
        loadAttendancePage(true);
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = oldText;
      });
  }

  function renderSuccess(result) {
    var host = U.byId('attendanceSuccess');
    U.clearElement(host);
    var notice = U.createElement('div', { className: 'notice notice-success' });
    notice.appendChild(U.createElement('strong', { text: 'Attendance marked successfully.' }));
    var text = [
      result.memberName,
      result.club,
      result.sessionCode + ' – ' + result.sessionTitle,
      U.formatDate(result.date),
      'Credits: ' + result.previousCreditBalance + ' → ' + result.newCreditBalance
    ].filter(Boolean).join(' · ');
    notice.appendChild(U.createElement('p', { text: text }));
    host.appendChild(notice);
  }

  function renderStatistics(stats) {
    var map = {
      statTotal: stats.totalAttendance,
      statFilm: stats.filmClubAttendance,
      statReading: stats.readingClubAttendance,
      statAwareness: stats.awarenessClubAttendance,
      statMost: stats.mostAttendedClub,
      statFirst: stats.firstAttendanceDate ? U.formatDate(stats.firstAttendanceDate) : '—',
      statRecent: stats.mostRecentAttendanceDate ? U.formatDate(stats.mostRecentAttendanceDate) : '—'
    };
    Object.keys(map).forEach(function (id) { U.setText(id, map[id], '—'); });
  }

  function makeHistoryRow(record) {
    var row = document.createElement('tr');
    [
      U.formatDate(record.date), record.club, record.sessionCode, record.title,
      record.creditUsed, record.status, U.formatDateTime(record.timeMarked)
    ].forEach(function (value, index) {
      var cell = document.createElement('td');
      if (index === 5) cell.appendChild(U.makeStatusBadge(value));
      else cell.textContent = value === undefined || value === null || value === '' ? '—' : String(value);
      row.appendChild(cell);
    });
    return row;
  }

  function makeMobileRecord(record) {
    var card = U.createElement('article', { className: 'dark-card mobile-record' });
    var dl = document.createElement('dl');
    [
      ['Date', U.formatDate(record.date)], ['Club', record.club], ['Session', record.sessionCode],
      ['Title', record.title], ['Credit used', record.creditUsed], ['Status', record.status],
      ['Marked at', U.formatDateTime(record.timeMarked)]
    ].forEach(function (pair) {
      dl.appendChild(U.createElement('dt', { text: pair[0] }));
      dl.appendChild(U.createElement('dd', { text: pair[1] === undefined || pair[1] === null || pair[1] === '' ? '—' : pair[1] }));
    });
    card.appendChild(dl);
    return card;
  }

  function renderHistory(records, stats) {
    renderStatistics(stats || {});
    var body = U.byId('attendanceTableBody');
    var mobile = U.byId('attendanceMobileList');
    var empty = U.byId('attendanceEmpty');
    U.clearElement(body); U.clearElement(mobile);
    if (!records || !records.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    records.forEach(function (record) {
      body.appendChild(makeHistoryRow(record));
      mobile.appendChild(makeMobileRecord(record));
    });
  }

  function renderAttendanceData(data) {
    data = data || {};
    renderEligibility(data.eligibility || []);
    renderHistory(data.history || [], data.statistics || {});
    if (data.member) {
      window.IEA_NAV.setMemberNavigationIdentity(data.member);
    }
  }

  function loadAttendancePage(forceRefresh) {
    var actionHost = U.byId('attendanceActionGrid');
    var cached = window.IEA_MEMBER_DATA.read();
    var hasVisibleData = false;

    if (
      cached &&
      cached.bundle &&
      cached.bundle.attendance
    ) {
      renderAttendanceData(cached.bundle.attendance);
      hasVisibleData = true;
    } else {
      U.showState(
        actionHost,
        'loading',
        'Checking attendance availability…'
      );
    }

    window.IEA_MEMBER_DATA.prefetchMemberPages();

    if (
      !forceRefresh &&
      cached &&
      cached.bundle &&
      cached.bundle.attendance &&
      cached.ageMs < 90000
    ) {
      return Promise.resolve(cached.bundle.attendance);
    }

    return window.IEA_MEMBER_DATA
      .refresh()
      .then(function (bundle) {
        if (!bundle || !bundle.attendance) {
          throw new Error('The attendance response was incomplete.');
        }
        renderAttendanceData(bundle.attendance);
        return bundle.attendance;
      })
      .catch(function (error) {
        if (
          error.code === 'SESSION_EXPIRED' ||
          error.code === 'INVALID_SESSION_TOKEN'
        ) {
          window.IEA_AUTH.redirectToLogin('session-expired');
          return;
        }

        if (!hasVisibleData) {
          U.showState(
            actionHost,
            'error',
            error.message || 'Attendance information could not be loaded.',
            function () { loadAttendancePage(true); }
          );
        } else {
          U.showToast(
            'Showing saved attendance details. Current data could not be refreshed.',
            'warning'
          );
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.IEA_AUTH
      .guardMemberPage()
      .then(function () { return loadAttendancePage(false); })
      .catch(function () {});
  });
}());
