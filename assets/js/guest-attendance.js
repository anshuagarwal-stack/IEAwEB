(function () {
  'use strict';

  var U = window.IEA_UTILS;
  var API = window.IEA_API;
  var eligibility = [];
  var selectedSession = null;
  var requestInProgress = false;

  function byId(id) { return document.getElementById(id); }

  function iconForClub(club) {
    if (club === 'Film Club') return '🎬';
    if (club === 'Reading Club') return '📚';
    return '🌍';
  }

  function setMessage(kind, title, detail) {
    var host = byId('guestAttendanceMessage');
    U.clearElement(host);
    if (!title) return;
    var box = U.createElement('div', { className: 'notice notice-' + kind });
    box.appendChild(U.createElement('strong', { text: title }));
    if (detail) box.appendChild(U.createElement('p', { text: detail }));
    host.appendChild(box);
  }

  function setFormMessage(message, type) {
    var host = byId('guestFormMessage');
    host.textContent = message || '';
    host.className = 'form-message ' + (type || '');
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = busyText || 'Please wait…';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
      button.disabled = false;
    }
  }

  function sessionSummary(session) {
    if (!session) return '';
    return [
      [session.sessionCode, session.title].filter(Boolean).join(' – '),
      session.date ? U.formatDate(session.date) : '',
      session.time || '',
      session.venue || ''
    ].filter(Boolean).join(' · ');
  }

  function renderClubs(items) {
    eligibility = Array.isArray(items) ? items : [];
    var host = byId('guestAttendanceClubGrid');
    U.clearElement(host);

    eligibility.forEach(function (item) {
      var session = item.session || null;
      var card = U.createElement('article', {
        className: 'guest-club-card' + (item.enabled ? ' is-open' : '') +
          (selectedSession && session && selectedSession.sessionId === session.sessionId ? ' is-selected' : '')
      });
      card.appendChild(U.createElement('span', {
        className: 'guest-club-icon',
        text: iconForClub(item.club),
        attrs: { 'aria-hidden': 'true' }
      }));
      card.appendChild(U.createElement('h3', { text: item.club }));
      card.appendChild(U.makeStatusBadge(item.enabled ? 'Attendance Open' : 'Closed'));
      card.appendChild(U.createElement('p', { text: item.reason || 'Guest attendance is unavailable.' }));

      if (session) {
        var preview = U.createElement('div', { className: 'guest-session-preview' });
        preview.appendChild(U.createElement('strong', {
          text: [session.sessionCode, session.title].filter(Boolean).join(' – ')
        }));
        preview.appendChild(U.createElement('span', {
          text: [session.date ? U.formatDate(session.date) : '', session.time || ''].filter(Boolean).join(' · ')
        }));
        if (session.venue) preview.appendChild(U.createElement('span', { text: session.venue }));
        card.appendChild(preview);
      }

      var button = U.createElement('button', {
        className: 'button button-block guest-select-button',
        text: item.enabled ? 'Select ' + item.club : 'Not Available',
        attrs: { type: 'button' }
      });
      button.disabled = !item.enabled;
      if (item.enabled && session) {
        button.addEventListener('click', function () { selectSession(session); });
      }
      card.appendChild(button);
      host.appendChild(card);
    });
  }

  function selectSession(session) {
    selectedSession = session;
    byId('guestSessionId').value = session.sessionId || '';
    var selected = byId('guestSelectedSession');
    U.clearElement(selected);
    selected.appendChild(U.createElement('strong', { text: 'Selected session' }));
    selected.appendChild(U.createElement('p', { text: sessionSummary(session) }));
    byId('guestAttendanceFormSection').hidden = false;
    renderClubs(eligibility);
    setFormMessage('', '');
    window.setTimeout(function () {
      byId('guestAttendanceFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = byId('guestAttendanceForm').querySelector('[name="name"]');
      if (first) first.focus({ preventScroll: true });
    }, 80);
  }

  function clearSelection() {
    selectedSession = null;
    byId('guestSessionId').value = '';
    byId('guestAttendanceFormSection').hidden = true;
    setFormMessage('', '');
    renderClubs(eligibility);
    byId('guestAttendanceClubGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadAvailability(showLoading) {
    if (requestInProgress) return;
    var refresh = byId('guestAttendanceRefresh');
    requestInProgress = true;
    setBusy(refresh, true, 'Checking…');
    if (showLoading !== false) {
      setMessage('warning', 'Checking today’s club sessions…', 'Please wait a moment.');
    }

    API.post('getGuestAttendanceAvailability', {}).then(function (response) {
      var data = response.data || {};
      renderClubs(data.eligibility || []);
      var openItems = (data.eligibility || []).filter(function (item) { return item.enabled && item.session; });
      if (!openItems.length) {
        setMessage('warning', 'Guest attendance is currently closed.', 'The club cards below will show the reason for each club.');
        clearSelectionWithoutScroll();
      } else {
        setMessage('success', 'Guest attendance is open.', 'Select the highlighted club and complete the form.');
        if (openItems.length === 1 && !selectedSession) selectSession(openItems[0].session);
      }
    }).catch(function (error) {
      setMessage('danger', 'Attendance availability could not be loaded.', error.message || 'Please try again.');
      U.showToast(error.message || 'Could not load attendance availability.', 'error');
    }).finally(function () {
      requestInProgress = false;
      setBusy(refresh, false);
    });
  }

  function clearSelectionWithoutScroll() {
    selectedSession = null;
    byId('guestSessionId').value = '';
    byId('guestAttendanceFormSection').hidden = true;
    setFormMessage('', '');
  }

  function formPayload(form) {
    var payload = {};
    new FormData(form).forEach(function (value, key) {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });
    return payload;
  }

  function validPhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  function submitGuestAttendance(event) {
    event.preventDefault();
    if (requestInProgress) return;

    var form = event.currentTarget;
    if (!selectedSession || !byId('guestSessionId').value) {
      setFormMessage('Select an open club session first.', 'error');
      return;
    }
    if (!form.reportValidity()) return;

    var payload = formPayload(form);
    if (!validPhone(payload.phone)) {
      setFormMessage('Please enter a valid phone number.', 'error');
      form.querySelector('[name="phone"]').focus();
      return;
    }
    if (payload.whatsapp && !validPhone(payload.whatsapp)) {
      setFormMessage('Please enter a valid WhatsApp number or leave it blank.', 'error');
      form.querySelector('[name="whatsapp"]').focus();
      return;
    }

    var button = byId('guestAttendanceSubmit');
    requestInProgress = true;
    setBusy(button, true, 'Marking Attendance…');
    setFormMessage('Saving your guest attendance…', '');

    API.post('submitGuestAttendance', payload).then(function (response) {
      var data = response.data || {};
      var details = [
        data.club,
        [data.sessionCode, data.sessionTitle].filter(Boolean).join(' – '),
        data.date ? U.formatDate(data.date) : ''
      ].filter(Boolean).join(' · ');
      setMessage('success', 'Guest attendance marked successfully for ' + (data.guestName || 'Guest') + '.', details);
      U.showToast('Guest attendance marked successfully.', 'success');
      form.reset();
      clearSelectionWithoutScroll();
      renderClubs(data.eligibility || eligibility);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (error) {
      setFormMessage(error.message || 'Guest attendance could not be marked.', 'error');
      U.showToast(error.message || 'Guest attendance could not be marked.', 'error');
    }).finally(function () {
      requestInProgress = false;
      setBusy(button, false);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = byId('guestAttendanceForm');
    if (!form) return;
    form.addEventListener('submit', submitGuestAttendance);
    byId('guestAttendanceRefresh').addEventListener('click', function () { loadAvailability(true); });
    byId('guestAttendanceCancel').addEventListener('click', clearSelection);
    loadAvailability(true);
  });
}());
