(function () {
  'use strict';

  var U = window.IEA_UTILS;

  function renderSessionCard(session, dark) {
    var card = U.createElement('article', {
      className: 'card session-card' + (dark ? ' dark-card' : '')
    });

    var content = U.createElement('div');
    content.appendChild(U.createElement('h3', {
      className: 'session-title',
      text: session.club + ' · ' + session.title
    }));

    var meta = U.createElement('div', { className: 'session-meta' });
    [
      session.sessionCode,
      U.formatDate(session.date),
      session.time,
      session.venue
    ].filter(Boolean).forEach(function (item) {
      meta.appendChild(U.createElement('span', { text: item }));
    });

    content.appendChild(meta);
    card.appendChild(content);
    card.appendChild(U.makeStatusBadge(session.status || 'Upcoming'));
    return card;
  }

  function loadUpcomingSessions() {
    var hosts = document.querySelectorAll('[data-upcoming-sessions]');
    var clubHosts = document.querySelectorAll('[data-club-upcoming]');

    if (!hosts.length && !clubHosts.length) return Promise.resolve();

    return window.IEA_API
      .get('getUpcomingSessions', { limit: 12 })
      .then(function (response) {
        var sessions = response.data.sessions || [];

        hosts.forEach(function (host) {
          U.clearElement(host);

          if (!sessions.length) {
            U.showState(host, 'empty', 'No upcoming sessions have been announced yet.');
            return;
          }

          sessions
            .slice(0, Number(host.getAttribute('data-limit') || 6))
            .forEach(function (session) {
              host.appendChild(
                renderSessionCard(session, host.getAttribute('data-dark') === 'true')
              );
            });
        });

        clubHosts.forEach(function (host) {
          var club = host.getAttribute('data-club-upcoming');
          var session = sessions.find(function (item) {
            return item.club === club;
          });

          U.clearElement(host);

          if (!session) {
            U.showState(host, 'empty', 'No upcoming ' + club + ' session has been announced yet.');
            return;
          }

          host.appendChild(renderSessionCard(session, true));
        });
      })
      .catch(function (error) {
        hosts.forEach(function (host) {
          U.showState(
            host,
            'error',
            error.message || 'The sessions could not be loaded.',
            loadUpcomingSessions
          );
        });

        clubHosts.forEach(function (host) {
          U.showState(host, 'error', 'The session could not be loaded.', loadUpcomingSessions);
        });
      });
  }

  function renderPlan(plan, index) {
    var card = U.createElement('article', {
      className: 'card plan-card' + (index === 1 ? ' featured' : '')
    });

    card.appendChild(U.createElement('p', {
      className: 'eyebrow',
      text: plan.planName
    }));

    card.appendChild(U.createElement('div', {
      className: 'plan-price',
      text: U.formatCurrency(plan.price)
    }));

    card.appendChild(U.createElement('p', {
      text: plan.validityLabel
    }));

    var facts = U.createElement('ul', { className: 'plan-facts' });
    facts.appendChild(U.createElement('li', {
      text: plan.credits + ' club credits'
    }));
    facts.appendChild(U.createElement('li', {
      text: 'Use credits across all three IEA Clubs'
    }));
    facts.appendChild(U.createElement('li', {
      text: 'One credit for each attended session'
    }));
    card.appendChild(facts);

    card.appendChild(U.createElement('a', {
      className: 'button' + (index === 1 ? '' : ' button-dark'),
      text: 'Become a Member',
      attrs: {
        href: 'become-a-member.html?plan=' + encodeURIComponent(plan.planId)
      }
    }));

    return card;
  }

  function loadPlans() {
    var host = U.byId('membershipPlanGrid');
    if (!host) return Promise.resolve();

    return window.IEA_API
      .get('getMembershipPlans')
      .then(function (response) {
        U.clearElement(host);

        var plans = response.data.plans || [];
        if (!plans.length) {
          U.showState(host, 'empty', 'No membership plans are currently available.');
          return;
        }

        plans.forEach(function (plan, index) {
          host.appendChild(renderPlan(plan, index));
        });
      })
      .catch(function (error) {
        U.showState(
          host,
          'error',
          error.message || 'Membership plans could not be loaded.',
          loadPlans
        );
      });
  }

  function loadSettings() {
    if (!document.querySelector('[data-setting], [data-setting-link]')) {
      return Promise.resolve();
    }

    return window.IEA_API
      .get('getPublicSettings')
      .then(function (response) {
        var settings = response.data.settings || {};

        document.querySelectorAll('[data-setting]').forEach(function (el) {
          var key = el.getAttribute('data-setting');
          if (settings[key]) el.textContent = settings[key];
        });

        document.querySelectorAll('[data-setting-link]').forEach(function (el) {
          var key = el.getAttribute('data-setting-link');
          if (!settings[key]) return;

          el.textContent = settings[key];
          if (key === 'ContactEmail') {
            el.setAttribute('href', 'mailto:' + settings[key]);
          }
        });
      })
      .catch(function () {
        /* Defaults remain visible when settings are unavailable. */
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    loadUpcomingSessions();
    loadPlans();
  });
}());
