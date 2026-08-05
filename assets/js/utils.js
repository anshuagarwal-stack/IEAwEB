(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  function createElement(tag, options) {
    var el = document.createElement(tag);
    options = options || {};
    if (options.className) el.className = options.className;
    if (options.text !== undefined && options.text !== null) el.textContent = String(options.text);
    if (options.attrs) {
      Object.keys(options.attrs).forEach(function (key) {
        var value = options.attrs[key];
        if (value !== undefined && value !== null) el.setAttribute(key, String(value));
      });
    }
    return el;
  }

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function setText(idOrElement, value, fallback) {
    var el = typeof idOrElement === 'string' ? byId(idOrElement) : idOrElement;
    if (!el) return;
    var output = value;
    if (output === undefined || output === null || output === '') output = fallback === undefined ? '—' : fallback;
    el.textContent = String(output);
  }

  function formatCurrency(value) {
    var amount = Number(value || 0);
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    } catch (_) {
      return '₹' + amount.toLocaleString('en-IN');
    }
  }

  function formatDate(value, options) {
    if (!value) return '—';
    var date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) date = new Date(String(value) + 'T00:00:00+05:30');
    else date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-IN', options || { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'IEA';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function statusClass(status) {
    var value = String(status || '').toUpperCase();
    if (['ACTIVE', 'PRESENT', 'SUCCESS', 'ATTENDANCE OPEN', 'OPEN'].indexOf(value) >= 0) return 'status-success';
    if (['EXPIRED', 'INACTIVE', 'SUSPENDED', 'ERROR', 'CLOSED', 'NO CREDITS'].indexOf(value) >= 0) return 'status-danger';
    if (['UPCOMING', 'WARNING', 'LOW CREDITS', 'REGISTRATION OPEN'].indexOf(value) >= 0) return 'status-warning';
    return 'status-neutral';
  }

  function makeStatusBadge(status) {
    return createElement('span', { className: 'status-badge ' + statusClass(status), text: status || 'Status unavailable' });
  }

  function showToast(message, type, duration) {
    var container = byId('toastContainer');
    if (!container) {
      container = createElement('div', { className: 'toast-container', attrs: { id: 'toastContainer', 'aria-live': 'polite' } });
      document.body.appendChild(container);
    }
    var toast = createElement('div', { className: 'toast ' + (type || ''), text: message });
    container.appendChild(toast);
    window.setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, duration || 5000);
  }

  function showState(container, kind, message, retryHandler) {
    if (!container) return;
    clearElement(container);
    var state = createElement('div', { className: kind + '-state' });
    var wrap = createElement('div');
    wrap.appendChild(createElement('p', { text: message }));
    if (retryHandler) {
      var retry = createElement('button', { className: 'button button-secondary', text: 'Retry', attrs: { type: 'button' } });
      retry.addEventListener('click', retryHandler);
      wrap.appendChild(retry);
    }
    state.appendChild(wrap);
    container.appendChild(state);
  }

  function confirmModal(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var previouslyFocused = document.activeElement;
      var backdrop = createElement('div', { className: 'modal-backdrop', attrs: { role: 'presentation' } });
      var modal = createElement('div', { className: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmModalTitle', 'aria-describedby': 'confirmModalMessage' } });
      var title = createElement('h3', { text: options.title || 'Please confirm', attrs: { id: 'confirmModalTitle' } });
      var message = createElement('p', { text: options.message || 'Continue with this action?', attrs: { id: 'confirmModalMessage' } });
      var actions = createElement('div', { className: 'modal-actions' });
      var cancel = createElement('button', { className: 'button button-secondary', text: options.cancelText || 'Cancel', attrs: { type: 'button' } });
      var confirm = createElement('button', { className: 'button', text: options.confirmText || 'Confirm', attrs: { type: 'button' } });

      function close(result) {
        document.removeEventListener('keydown', onKeydown);
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
        resolve(result);
      }
      function onKeydown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(false); return; }
        if (event.key !== 'Tab') return;
        var focusable = [cancel, confirm];
        var index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && (index <= 0)) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0].focus(); }
      }
      cancel.addEventListener('click', function () { close(false); });
      confirm.addEventListener('click', function () { close(true); });
      backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close(false); });
      document.addEventListener('keydown', onKeydown);

      actions.appendChild(cancel);
      actions.appendChild(confirm);
      modal.appendChild(title);
      modal.appendChild(message);
      modal.appendChild(actions);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      confirm.focus();
    });
  }

  function appendDefinition(container, label, value) {
    var box = createElement('div', { className: 'info-box' });
    box.appendChild(createElement('strong', { text: label }));
    box.appendChild(createElement('span', { text: value === undefined || value === null || value === '' ? '—' : value }));
    container.appendChild(box);
    return box;
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  window.IEA_UTILS = Object.freeze({
    byId: byId,
    createElement: createElement,
    clearElement: clearElement,
    setText: setText,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    initials: initials,
    statusClass: statusClass,
    makeStatusBadge: makeStatusBadge,
    showToast: showToast,
    showState: showState,
    confirmModal: confirmModal,
    appendDefinition: appendDefinition,
    getQueryParam: getQueryParam
  });
}());
