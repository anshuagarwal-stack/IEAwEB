(function () {
  'use strict';

  var U = window.IEA_UTILS;

  document.addEventListener('DOMContentLoaded', function () {
    var form = U.byId('memberLoginForm');
    var pinInput = U.byId('pinInput');
    var toggle = U.byId('pinToggle');
    var message = U.byId('loginMessage');
    var loginButton = U.byId('loginButton');
    var rememberButton = U.byId('rememberLoginButton');

    if (!form || !pinInput || !loginButton || !rememberButton) {
      return;
    }

    function setMessage(text, type) {
      message.textContent = text || '';
      message.className = 'form-message' +
        (type ? ' ' + type : '');
    }

    function setButtonsLoading(loading, rememberDevice) {
      loginButton.disabled = loading;
      rememberButton.disabled = loading;

      if (loading) {
        loginButton.textContent = rememberDevice
          ? 'Please wait…'
          : 'Signing in…';
        rememberButton.textContent = rememberDevice
          ? 'Saving login…'
          : 'Please wait…';
      } else {
        loginButton.textContent = 'Login';
        rememberButton.textContent =
          'Login & Remember This Device';
      }
    }

    function validPin() {
      var pin = pinInput.value.trim();

      if (!/^\d{3}$/.test(pin)) {
        setMessage('Enter your three-digit PIN.', 'error');
        pinInput.focus();
        return '';
      }

      return pin;
    }

    function submitLogin(rememberDevice) {
      var pin = validPin();
      if (!pin) return;

      setButtonsLoading(true, rememberDevice);
      setMessage(
        rememberDevice
          ? 'Checking your account and saving this device…'
          : 'Checking your member account…',
        ''
      );

      window.IEA_AUTH.login(pin, rememberDevice)
        .then(function (data) {
          pinInput.value = '';

          if (
            rememberDevice &&
            data.browserStorageMode === 'persistent'
          ) {
            setMessage(
              'Login saved. Opening your dashboard…',
              'success'
            );
          } else {
            setMessage(
              'Login successful. Opening your dashboard…',
              'success'
            );
          }

          /* The dashboard was preloaded with the login response. */
          window.location.replace('member-dashboard.html');
        })
        .catch(function (error) {
          var text =
            'The PIN is incorrect or the member account ' +
            'could not be found.';

          if (error.code === 'LOGIN_RATE_LIMITED') {
            text = error.message ||
              'Too many login attempts. Please wait and try again.';
          } else if (
            error.code === 'API_NOT_CONFIGURED' ||
            error.code === 'BROWSER_STORAGE_UNAVAILABLE'
          ) {
            text = error.message;
          }

          setMessage(text, 'error');
          pinInput.select();
        })
        .finally(function () {
          setButtonsLoading(false, rememberDevice);
        });
    }

    var reason = U.getQueryParam('reason');

    if (reason === 'session-expired') {
      setMessage(
        'Your saved login has expired. Please log in again.',
        'error'
      );
    } else if (reason === 'login-required') {
      setMessage(
        'Please log in to open the member area.',
        ''
      );
    }

    /*
     * A saved token goes directly to the dashboard. The dashboard request is
     * the validation, removing an unnecessary Apps Script call.
     */
    if (window.IEA_AUTH.getToken() && new URLSearchParams(window.location.search).get('mode') !== 'admin') {
      setButtonsLoading(
        true,
        window.IEA_AUTH.hasRememberedLogin()
      );
      setMessage(
        'Saved login found. Opening your dashboard…',
        ''
      );
      window.location.replace('member-dashboard.html');
      return;
    }

    pinInput.addEventListener('input', function () {
      pinInput.value = pinInput.value
        .replace(/\D/g, '')
        .slice(0, 3);
      setMessage('', '');
    });

    toggle.addEventListener('click', function () {
      var hidden = pinInput.type === 'password';
      pinInput.type = hidden ? 'text' : 'password';
      toggle.textContent = hidden ? 'Hide' : 'Show';
      toggle.setAttribute(
        'aria-pressed',
        hidden ? 'true' : 'false'
      );
      pinInput.focus();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitLogin(false);
    });

    rememberButton.addEventListener('click', function () {
      submitLogin(true);
    });
  });
}());

(function(){'use strict';document.addEventListener('DOMContentLoaded',function(){var memberTab=document.getElementById('memberTab'),adminTab=document.getElementById('adminTab'),memberPanel=document.getElementById('memberLoginPanel'),adminPanel=document.getElementById('adminLoginPanel');if(!memberTab||!adminTab)return;function showAdmin(on){memberPanel.hidden=on;adminPanel.hidden=!on;memberTab.classList.toggle('active',!on);adminTab.classList.toggle('active',on);memberTab.setAttribute('aria-selected',String(!on));adminTab.setAttribute('aria-selected',String(on));if(on)setTimeout(function(){var e=document.getElementById('adminEmail');if(e)e.focus()},0)}memberTab.addEventListener('click',function(){showAdmin(false)});adminTab.addEventListener('click',function(){showAdmin(true)});var p=new URLSearchParams(location.search);if(p.get('mode')==='admin')showAdmin(true)})}());
