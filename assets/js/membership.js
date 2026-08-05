(function () {
  'use strict';

  var U = window.IEA_UTILS;

  function renderWarnings(warnings) {
    var host = U.byId('membershipWarnings');
    U.clearElement(host);

    (warnings || []).forEach(function (warning) {
      var className = warning.level === 'danger' ? 'notice-danger' : 'notice-warning';
      var notice = U.createElement('div', { className: 'notice ' + className });
      notice.appendChild(U.createElement('strong', { text: warning.title }));
      notice.appendChild(U.createElement('p', { text: warning.message }));
      host.appendChild(notice);
    });
  }

  function renderMembership(membership) {
    U.setText('membershipPlanName', membership.planName || 'No active plan');
    U.setText(
      'membershipPlanDates',
      [
        membership.startDate ? U.formatDate(membership.startDate) : '—',
        membership.expiryDate ? U.formatDate(membership.expiryDate) : '—'
      ].join(' – ')
    );

    var status = U.byId('membershipStatusBadge');
    U.clearElement(status);
    status.appendChild(U.makeStatusBadge(membership.status));

    var fields = {
      detailStart: membership.startDate ? U.formatDate(membership.startDate) : '—',
      detailExpiry: membership.expiryDate ? U.formatDate(membership.expiryDate) : '—',
      detailDays: membership.daysRemaining >= 0 ? membership.daysRemaining : 0,
      detailPurchased: membership.creditsPurchased,
      detailUsed: membership.creditsUsed,
      detailRemaining: membership.creditsRemaining,
      detailStatus: membership.status
    };

    Object.keys(fields).forEach(function (id) {
      U.setText(id, fields[id]);
    });

    var purchased = Number(membership.creditsPurchased || 0);
    var remaining = Number(membership.creditsRemaining || 0);
    var percent = purchased > 0
      ? Math.max(0, Math.min(100, remaining / purchased * 100))
      : 0;

    U.byId('creditMeterFill').style.width = percent + '%';
    U.setText('creditMeterText', remaining + ' of ' + purchased + ' credits remaining');
  }

  function renderPlans(plans, member) {
    var host = U.byId('availablePlanGrid');
    U.clearElement(host);

    if (!plans || !plans.length) {
      U.showState(host, 'empty', 'No membership plans are currently available.');
      return;
    }

    plans.forEach(function (plan) {
      var card = U.createElement('article', {
        className: 'dark-card available-plan'
      });

      card.appendChild(U.createElement('h3', {
        text: plan.planName
      }));

      card.appendChild(U.createElement('div', {
        className: 'price',
        text: U.formatCurrency(plan.price)
      }));

      card.appendChild(U.createElement('p', {
        text: plan.credits + ' credits · ' + plan.validityLabel
      }));

      var paymentButton = U.createElement('button', {
        className: 'button',
        text: 'Pay ' + U.formatCurrency(plan.price),
        attrs: { type: 'button' }
      });

      paymentButton.addEventListener('click', function () {
        if (!window.IEA_PAYMENT || typeof window.IEA_PAYMENT.open !== 'function') {
          U.showToast('The payment window could not be opened. Please refresh and try again.', 'error');
          return;
        }
        window.IEA_PAYMENT.open(plan, member);
      });

      card.appendChild(paymentButton);
      host.appendChild(card);
    });
  }

  function renderMembershipPage(data) {
    data = data || {};
    var host = U.byId('membershipPageContent');

    if (data.member) {
      window.IEA_NAV.setMemberNavigationIdentity(data.member);
    }
    renderMembership(data.membership || {});
    renderWarnings(data.warnings || []);
    renderPlans(data.availablePlans || [], data.member || {});

    host.classList.remove('hidden');
    U.byId('membershipLoading').classList.add('hidden');
  }

  function loadMembership(forceRefresh) {
    var cached = window.IEA_MEMBER_DATA.read();
    var hasVisibleData = false;

    if (
      cached &&
      cached.bundle &&
      cached.bundle.membershipPage
    ) {
      renderMembershipPage(cached.bundle.membershipPage);
      hasVisibleData = true;
    }

    window.IEA_MEMBER_DATA.prefetchMemberPages();

    if (
      !forceRefresh &&
      cached &&
      cached.bundle &&
      cached.bundle.membershipPage &&
      cached.ageMs < 90000
    ) {
      return Promise.resolve(cached.bundle.membershipPage);
    }

    return window.IEA_MEMBER_DATA
      .refresh()
      .then(function (bundle) {
        if (!bundle || !bundle.membershipPage) {
          throw new Error('The membership response was incomplete.');
        }
        renderMembershipPage(bundle.membershipPage);
        return bundle.membershipPage;
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
            U.byId('membershipError'),
            'error',
            error.message || 'Membership information could not be loaded.',
            function () { loadMembership(true); }
          );
          U.byId('membershipLoading').classList.add('hidden');
        } else {
          U.showToast(
            'Showing saved membership details. Current data could not be refreshed.',
            'warning'
          );
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.IEA_AUTH
      .guardMemberPage()
      .then(function () { return loadMembership(false); })
      .catch(function () {});
  });
}());
