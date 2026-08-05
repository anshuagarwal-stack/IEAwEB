(function () {
  'use strict';

  var U = window.IEA_UTILS;

  function infoBox(container, label, value) {
    return U.appendDefinition(container, label, value);
  }

  function renderWarnings(warnings) {
    var host = U.byId('dashboardWarnings');
    U.clearElement(host);

    (warnings || []).forEach(function (warning) {
      var notice = U.createElement('div', {
        className:
          'notice ' +
          (warning.level === 'danger'
            ? 'notice-danger'
            : 'notice-warning')
      });

      notice.appendChild(
        U.createElement('strong', {
          text: warning.title
        })
      );

      notice.appendChild(
        U.createElement('p', {
          text: warning.message
        })
      );

      host.appendChild(notice);
    });
  }

  function renderIdentity(member) {
    U.setText('memberAvatar', U.initials(member.name));
    U.setText('memberName', member.name);

    var metaParts = [
      member.memberId,
      member.email,
      member.phone
    ].filter(Boolean);

    U.setText('memberMeta', metaParts.join(' · '));

    var statusHost = U.byId('memberStatus');
    U.clearElement(statusHost);
    statusHost.appendChild(U.makeStatusBadge(member.status));

    window.IEA_NAV.setMemberNavigationIdentity(member);
  }

  function renderSummary(summary, nextSession) {
    U.setText('remainingCredits', summary.creditsRemaining);

    var remaining = U.byId('remainingCredits');

    if (Number(summary.creditsRemaining) <= 2) {
      remaining.classList.add('danger');
    }

    /*
     * Historical attendance is stored in creditsUsed.
     * New detailed attendance is counted in totalSessionsAttended.
     * Use the larger number so old attendance is displayed without
     * double-counting future attendance.
     */
    var detailedAttendance = Number(
      summary.totalSessionsAttended || 0
    );

    var historicalAttendance = Number(
      summary.creditsUsed || 0
    );

    var sessionsAttended = Math.max(
      detailedAttendance,
      historicalAttendance
    );

    U.setText('sessionsAttended', sessionsAttended);

    U.setText(
      'planValidity',
      summary.expiryDate
        ? U.formatDate(summary.expiryDate)
        : 'No active plan'
    );

    var validityNote = summary.expiryDate
      ? (
          summary.daysRemaining >= 0
            ? summary.daysRemaining + ' days remaining'
            : 'Expired'
        )
      : 'No validity information';

    U.setText('planValidityNote', validityNote);

    U.setText(
      'nextSessionTitle',
      nextSession
        ? nextSession.title
        : 'No session announced'
    );

    U.setText(
      'nextSessionDate',
      nextSession
        ? (
            U.formatDate(nextSession.date) +
            (nextSession.time
              ? ' · ' + nextSession.time
              : '')
          )
        : ''
    );
  }

  function renderMembership(summary) {
    var host = U.byId('membershipSummary');
    U.clearElement(host);

    infoBox(
      host,
      'Current plan',
      summary.planName || 'No plan available'
    );

    infoBox(
      host,
      'Plan dates',
      (
        summary.startDate
          ? U.formatDate(summary.startDate)
          : '—'
      ) +
      ' – ' +
      (
        summary.expiryDate
          ? U.formatDate(summary.expiryDate)
          : '—'
      )
    );

    infoBox(
      host,
      'Credits',
      summary.creditsPurchased +
        ' purchased · ' +
        summary.creditsUsed +
        ' used · ' +
        summary.creditsRemaining +
        ' remaining'
    );
  }

  function renderSnapshot(snapshot) {
    var host = U.byId('attendanceSnapshot');
    U.clearElement(host);

    if (!snapshot || !snapshot.lastAttendance) {
      infoBox(
        host,
        'Last attended',
        'You have not attended any sessions yet.'
      );

      infoBox(host, 'Most attended club', '—');
      return;
    }

    var last = snapshot.lastAttendance;

    infoBox(
      host,
      'Last attended',
      [
        last.club,
        last.sessionCode,
        last.title,
        U.formatDate(last.date)
      ]
        .filter(Boolean)
        .join(' · ')
    );

    infoBox(
      host,
      'Most attended club',
      snapshot.mostAttendedClub || '—'
    );
  }

  function renderUpcoming(sessions) {
    var host = U.byId('dashboardUpcomingSessions');
    U.clearElement(host);

    if (!sessions || !sessions.length) {
      return U.showState(
        host,
        'empty',
        'No upcoming sessions have been announced yet.'
      );
    }

    sessions.forEach(function (session) {
      var item = U.createElement('article', {
        className: 'dashboard-session'
      });

      var content = U.createElement('div');

      content.appendChild(
        U.createElement('h4', {
          text: session.club + ' · ' + session.title
        })
      );

      content.appendChild(
        U.createElement('div', {
          className: 'dashboard-session-meta',
          text: [
            session.sessionCode,
            U.formatDate(session.date),
            session.time,
            session.venue
          ]
            .filter(Boolean)
            .join(' · ')
        })
      );

      item.appendChild(content);

      item.appendChild(
        U.makeStatusBadge(
          session.attendanceStatus ||
          session.status ||
          'Upcoming'
        )
      );

      host.appendChild(item);
    });
  }

  function renderDashboardData(data) {
    renderIdentity(data.member);
    renderWarnings(data.warnings);
    renderSummary(data.membership, data.nextSession);
    renderMembership(data.membership);
    renderSnapshot(data.attendanceSnapshot);
    renderUpcoming(data.upcomingSessions);

    var loading = U.byId('dashboardLoading');
    if (loading) {
      loading.classList.add('hidden');
    }

    U.byId('dashboardContentInner')
      .classList.remove('hidden');
  }

  function renderCachedIdentity() {
    var member = window.IEA_AUTH.getCachedMember();
    if (!member) return false;
    renderIdentity(member);
    return true;
  }

  function loadDashboard(forceRefresh) {
    var loading = U.byId('dashboardLoading');
    var bundleCache = window.IEA_MEMBER_DATA.read();
    var dashboardCache = window.IEA_AUTH.getCachedDashboard();
    var hasVisibleDashboard = false;

    if (bundleCache && bundleCache.bundle && bundleCache.bundle.dashboard) {
      renderDashboardData(bundleCache.bundle.dashboard);
      hasVisibleDashboard = true;
    } else if (dashboardCache && dashboardCache.data) {
      /* The lightweight login response appears immediately. */
      renderDashboardData(dashboardCache.data);
      hasVisibleDashboard = true;
    } else {
      renderCachedIdentity();
      if (loading) loading.classList.remove('hidden');
    }

    window.IEA_MEMBER_DATA.prefetchMemberPages();

    /*
     * A single bundle contains data for all three member pages. Once it is
     * cached, Overview, Attendance and Membership open without another wait.
     */
    if (
      !forceRefresh &&
      bundleCache &&
      bundleCache.bundle &&
      bundleCache.bundle.dashboard &&
      bundleCache.ageMs < 90000
    ) {
      return Promise.resolve(bundleCache.bundle.dashboard);
    }

    return window.IEA_MEMBER_DATA
      .refresh()
      .then(function (bundle) {
        if (bundle && bundle.dashboard) {
          renderDashboardData(bundle.dashboard);
          return bundle.dashboard;
        }
        throw new Error('The dashboard response was incomplete.');
      })
      .catch(function (error) {
        if (
          error.code === 'SESSION_EXPIRED' ||
          error.code === 'INVALID_SESSION_TOKEN'
        ) {
          window.IEA_AUTH.redirectToLogin('session-expired');
          return;
        }

        if (!hasVisibleDashboard) {
          U.showState(
            U.byId('dashboardError'),
            'error',
            error.message || 'Your dashboard could not be loaded.',
            function () { loadDashboard(true); }
          );
        } else {
          U.showToast(
            'Showing saved details. Current data will refresh when the connection improves.',
            'warning'
          );
        }

        if (loading) loading.classList.add('hidden');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.IEA_AUTH
      .guardMemberPage()
      .then(function () { return loadDashboard(false); })
      .catch(function () {});
  });
}());
