(function () {
  'use strict';

  var U = window.IEA_UTILS;
  var quickToken = '';
  var currentMember = null;
  var requestInProgress = false;

  var clubIcons = {
    'Film Club': '🎬',
    'Reading Club': '📚',
    'Awareness Club': '🌍'
  };

  function byId(id) { return document.getElementById(id); }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (!button.dataset.normalText) button.dataset.normalText = button.textContent;
    button.disabled = Boolean(busy);
    button.textContent = busy ? busyText : button.dataset.normalText;
  }

  function showMessage(type, title, message) {
    var host = byId('quickAttendanceMessage');
    U.clearElement(host);
    var notice = U.createElement('div', {
      className: 'notice notice-' + type
    });
    notice.appendChild(U.createElement('strong', { text: title }));
    if (message) notice.appendChild(U.createElement('p', { text: message }));
    host.appendChild(notice);
  }

  function statusFor(item) {
    if (item.enabled) return 'ATTENDANCE OPEN';
    if (item.code === 'ALREADY_MARKED') return 'PRESENT';
    return 'CLOSED';
  }

  function renderClubs(items) {
    var host = byId('quickAttendanceClubGrid');
    U.clearElement(host);

    (items || []).forEach(function (item) {
      var status = statusFor(item);
      var classes = 'quick-club-card';
      if (item.enabled) classes += ' is-open';
      if (item.code === 'ALREADY_MARKED') classes += ' is-complete';

      var card = U.createElement('article', { className: classes });
      card.appendChild(U.createElement('span', {
        className: 'quick-club-icon',
        text: clubIcons[item.club] || '✓',
        attrs: { 'aria-hidden': 'true' }
      }));
      card.appendChild(U.makeStatusBadge(status));
      card.lastChild.classList.add('quick-club-status');
      card.appendChild(U.createElement('h3', { text: item.club }));

      var reason = item.enabled
        ? 'Attendance is open now. Tap the highlighted button below.'
        : (item.reason || 'Attendance is not available.');
      card.appendChild(U.createElement('p', { text: reason }));

      if (item.session) {
        var preview = U.createElement('div', { className: 'quick-session-preview' });
        preview.appendChild(U.createElement('strong', {
          text: [item.session.sessionCode, item.session.title].filter(Boolean).join(' · ')
        }));
        preview.appendChild(U.createElement('span', {
          text: [
            U.formatDate(item.session.date),
            item.session.time,
            item.session.venue
          ].filter(Boolean).join(' · ')
        }));
        card.appendChild(preview);
      }

      var buttonText = item.enabled
        ? 'Mark ' + item.club + ' Attendance'
        : (item.code === 'ALREADY_MARKED' ? 'Attendance Already Marked' : 'Attendance Not Open');
      var button = U.createElement('button', {
        className: 'button button-block quick-mark-button',
        text: buttonText,
        attrs: { type: 'button' }
      });
      button.disabled = !item.enabled;

      if (item.enabled && item.session) {
        button.addEventListener('click', function () {
          confirmAndMark(item, button);
        });
      }

      card.appendChild(button);
      host.appendChild(card);
    });
  }

  function confirmAndMark(item, button) {
    if (requestInProgress || !quickToken) return;
    var session = item.session || {};
    U.confirmModal({
      title: 'Confirm attendance',
      message: 'Mark attendance for ' + [session.sessionCode, session.title].filter(Boolean).join(' – ') + '?',
      confirmText: 'Mark Attendance'
    }).then(function (confirmed) {
      if (!confirmed) return;
      markAttendance(session.sessionId, button);
    });
  }

  function markAttendance(sessionId, button) {
    requestInProgress = true;
    setBusy(button, true, 'Marking Attendance…');

    window.IEA_API.post('markAttendance', {
      token: quickToken,
      sessionId: sessionId
    }).then(function (response) {
      var data = response.data || {};
      var result = data.result || {};
      var memberName = result.memberName || (currentMember && currentMember.name) || 'Member';
      var summary = [
        result.club,
        [result.sessionCode, result.sessionTitle].filter(Boolean).join(' – '),
        result.date ? U.formatDate(result.date) : '',
        result.newCreditBalance !== undefined ? 'Credits remaining: ' + result.newCreditBalance : ''
      ].filter(Boolean).join(' · ');

      showMessage('success', 'Attendance marked successfully for ' + memberName + '.', summary);
      renderClubs(data.eligibility || []);
      U.showToast('Attendance marked successfully.', 'success');

      /* End the short-lived attendance session immediately after success. */
      window.IEA_API.post('memberLogout', { token: quickToken }).catch(function () {}).then(function () {
        quickToken = '';
      });
    }).catch(function (error) {
      showMessage('danger', 'Attendance could not be marked.', error.message || 'Please try again.');
      U.showToast(error.message || 'Attendance could not be marked.', 'error');
      if (error.code === 'INVALID_SESSION_TOKEN' || error.code === 'SESSION_EXPIRED') resetPage(false);
    }).finally(function () {
      requestInProgress = false;
      setBusy(button, false);
    });
  }

  function handlePinSubmit(event) {
    event.preventDefault();
    if (requestInProgress) return;

    var pinInput = byId('quickAttendancePin');
    var pin = String(pinInput.value || '').replace(/\D/g, '').slice(0, 3);
    pinInput.value = pin;

    if (!/^\d{3}$/.test(pin)) {
      showMessage('danger', 'Enter a valid PIN.', 'Your member PIN must contain exactly three digits.');
      pinInput.focus();
      return;
    }

    var button = byId('quickAttendanceCheckButton');
    requestInProgress = true;
    setBusy(button, true, 'Checking…');
    showMessage('warning', 'Checking attendance…', 'Please wait while today’s club sessions are checked.');

    window.IEA_API.post('quickAttendanceLogin', { pin: pin }).then(function (response) {
      var data = response.data || {};
      quickToken = data.token || '';
      currentMember = data.member || null;
      pinInput.value = '';
      pinInput.blur();

      var membership = data.membership || {};
      var details = [
        currentMember && currentMember.name,
        membership.creditsRemaining !== undefined ? 'Credits remaining: ' + membership.creditsRemaining : ''
      ].filter(Boolean).join(' · ');
      showMessage('success', 'PIN verified.', details || 'Choose the available club below.');
      renderClubs(data.eligibility || []);
      byId('quickAttendanceReset').classList.remove('hidden');

      var openButton = document.querySelector('.quick-club-card.is-open .quick-mark-button');
      if (openButton) {
        window.setTimeout(function () {
          openButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          openButton.focus({ preventScroll: true });
        }, 100);
      }
    }).catch(function (error) {
      quickToken = '';
      currentMember = null;
      showMessage('danger', 'PIN could not be verified.', error.message || 'Please check the PIN and try again.');
      pinInput.focus();
      pinInput.select();
    }).finally(function () {
      requestInProgress = false;
      setBusy(button, false);
    });
  }

  function renderPlaceholders() {
    renderClubs([
      { club: 'Film Club', enabled: false, code: 'PIN_REQUIRED', reason: 'Enter your PIN to check today’s attendance.', session: null },
      { club: 'Reading Club', enabled: false, code: 'PIN_REQUIRED', reason: 'Enter your PIN to check today’s attendance.', session: null },
      { club: 'Awareness Club', enabled: false, code: 'PIN_REQUIRED', reason: 'Enter your PIN to check today’s attendance.', session: null }
    ]);
  }

  function resetPage(revokeToken) {
    var token = quickToken;
    quickToken = '';
    currentMember = null;
    requestInProgress = false;
    U.clearElement(byId('quickAttendanceMessage'));
    renderPlaceholders();
    byId('quickAttendanceReset').classList.add('hidden');
    byId('quickAttendancePin').value = '';
    byId('quickAttendancePin').focus();
    if (revokeToken && token) window.IEA_API.post('memberLogout', { token: token }).catch(function () {});
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = byId('quickAttendancePinForm');
    var pinInput = byId('quickAttendancePin');
    var reset = byId('quickAttendanceReset');

    if (!form || !pinInput) return;
    renderPlaceholders();
    form.addEventListener('submit', handlePinSubmit);
    reset.addEventListener('click', function () { resetPage(true); });
    pinInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 3);
    });
    pinInput.focus();
  });
}());
