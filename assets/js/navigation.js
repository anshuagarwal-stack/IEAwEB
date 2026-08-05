(function () {
  'use strict';
  var U = window.IEA_UTILS;

  var publicLinks = [
    ['index.html', 'Home', 'home'],
    ['clubs.html', 'Clubs', 'clubs'],
    ['about.html', 'About', 'about'],
    ['membership.html', 'Membership Plans', 'membership']
  ];

  function logoLink(className) {
    var link = U.createElement('a', { className: className || 'brand-link', attrs: { href: 'index.html', 'aria-label': 'International English Academy India home' } });
    link.appendChild(U.createElement('img', { attrs: { src: 'assets/images/iea-logo.png', alt: 'International English Academy India' } }));
    return link;
  }

  function currentPage() { return document.body.getAttribute('data-page') || ''; }

  function makePublicNavLink(item) {
    var link = U.createElement('a', { text: item[1], attrs: { href: item[0] } });
    if (currentPage() === item[2]) link.setAttribute('aria-current', 'page');
    return link;
  }

  function renderPublicHeader() {
    var host = U.byId('siteHeader');
    if (!host) return;
    host.className = 'site-header';
    var inner = U.createElement('div', { className: 'site-header-inner' });
    var nav = U.createElement('nav', { className: 'site-nav', attrs: { id: 'siteNav', 'aria-label': 'Primary navigation' } });
    var menu = U.createElement('button', {
      className: 'mobile-nav-button', text: '☰',
      attrs: { type: 'button', 'aria-label': 'Open menu', 'aria-controls': 'siteNav', 'aria-expanded': 'false' }
    });
    publicLinks.forEach(function (item) { nav.appendChild(makePublicNavLink(item)); });

    /*
     * This high-visibility attendance shortcut is intentionally mobile-only.
     * It appears inside the three-bar menu and opens the PIN attendance page.
     */
    var quickAttendance = U.createElement('a', {
      className: 'quick-attendance-nav',
      text: '✓ Mark Attendance',
      attrs: { href: 'mark-attendance.html', 'aria-label': 'Mark club attendance using your PIN' }
    });
    if (currentPage() === 'quick-attendance') quickAttendance.setAttribute('aria-current', 'page');
    nav.appendChild(quickAttendance);

    var guestAttendance = U.createElement('a', {
      className: 'guest-attendance-nav',
      text: '👤 Guest Attendance',
      attrs: { href: 'guest-attendance.html', 'aria-label': 'Mark attendance as a guest' }
    });
    if (currentPage() === 'guest-attendance') guestAttendance.setAttribute('aria-current', 'page');
    nav.appendChild(guestAttendance);

    var authArea = U.createElement('span', { attrs: { id: 'publicAuthActions' } });
    nav.appendChild(authArea);
    menu.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.textContent = open ? '×' : '☰';
    });

    inner.appendChild(logoLink());
    inner.appendChild(menu);
    inner.appendChild(nav);
    host.appendChild(inner);
    updatePublicAuthActions(Boolean(window.IEA_AUTH && window.IEA_AUTH.getToken()));
  }

  function updatePublicAuthActions(authenticated) {
    var host = U.byId('publicAuthActions');
    if (!host) return;
    U.clearElement(host);
    if (!authenticated) {
      host.appendChild(U.createElement('a', { text: 'Login', attrs: { href: 'login.html' } }));
      return;
    }
    var profile = U.createElement('a', { text: 'Profile', attrs: { href: 'member-dashboard.html' } });
    var logout = U.createElement('button', { text: 'Logout', attrs: { type: 'button' } });
    logout.addEventListener('click', performLogout);
    host.appendChild(profile);
    host.appendChild(logout);
  }

  function renderPublicFooter() {
    var host = U.byId('siteFooter');
    if (!host) return;
    host.className = 'site-footer';
    var container = U.createElement('div', { className: 'container' });
    var grid = U.createElement('div', { className: 'footer-grid' });
    var brand = U.createElement('div', { className: 'footer-brand' });
    brand.appendChild(U.createElement('img', { attrs: { src: 'assets/images/iea-logo.png', alt: 'International English Academy India' } }));
    brand.appendChild(U.createElement('p', { text: 'Meaningful English learning through films, books and thoughtful conversations.' }));
    var contact = U.createElement('div');
    contact.appendChild(U.createElement('h3', { text: 'Contact' }));
    var contactLinks = U.createElement('div', { className: 'footer-links' });
    contactLinks.appendChild(U.createElement('span', { text: window.IEA_CONFIG.DEFAULT_LOCATION, attrs: { 'data-setting': 'AcademyLocation' } }));
    contactLinks.appendChild(U.createElement('a', { text: window.IEA_CONFIG.DEFAULT_CONTACT_EMAIL, attrs: { href: 'mailto:' + window.IEA_CONFIG.DEFAULT_CONTACT_EMAIL, 'data-setting-link': 'ContactEmail' } }));
    contactLinks.appendChild(U.createElement('span', { text: 'Instagram: ' + window.IEA_CONFIG.DEFAULT_INSTAGRAM, attrs: { 'data-setting': 'InstagramHandle' } }));
    contact.appendChild(contactLinks);
    var links = U.createElement('div');
    links.appendChild(U.createElement('h3', { text: 'Explore' }));
    var linkList = U.createElement('div', { className: 'footer-links' });
    publicLinks.forEach(function (item) { linkList.appendChild(makePublicNavLink(item)); });
    linkList.appendChild(U.createElement('a', { text: 'Member Login', attrs: { href: 'login.html' } }));
    links.appendChild(linkList);
    grid.appendChild(brand); grid.appendChild(contact); grid.appendChild(links);
    var bottom = U.createElement('div', { className: 'footer-bottom' });
    bottom.textContent = '© ' + new Date().getFullYear() + ' International English Academy India. All rights reserved.';
    container.appendChild(grid); container.appendChild(bottom); host.appendChild(container);
  }

  function renderDashboardShell() {
    var sidebar = U.byId('dashboardSidebar');
    if (!sidebar) return;
    var active = currentPage();
    sidebar.className = 'dashboard-sidebar';
    var logo = U.createElement('a', { className: 'sidebar-logo', attrs: { href: 'member-dashboard.html' } });
    logo.appendChild(U.createElement('img', { attrs: { src: 'assets/images/iea-logo.png', alt: 'International English Academy India' } }));
    var nav = U.createElement('nav', { className: 'sidebar-nav', attrs: { 'aria-label': 'Member navigation' } });
    [
      ['member-dashboard.html', 'Overview', 'member-dashboard'],
      ['member-attendance.html', 'Attendance', 'member-attendance'],
      ['member-membership.html', 'Membership', 'member-membership']
    ].forEach(function (item) {
      var link = U.createElement('a', { text: item[1], attrs: { href: item[0] } });
      if (active === item[2]) link.setAttribute('aria-current', 'page');
      nav.appendChild(link);
    });
    var user = U.createElement('div', { className: 'sidebar-user' });
    user.appendChild(U.createElement('div', { className: 'sidebar-user-name', text: 'Loading member…', attrs: { id: 'sidebarMemberName' } }));
    user.appendChild(U.createElement('div', { className: 'sidebar-user-meta', text: '', attrs: { id: 'sidebarMemberMeta' } }));
    var logout = U.createElement('button', { className: 'button button-secondary sidebar-logout', text: 'Logout', attrs: { type: 'button' } });
    logout.addEventListener('click', performLogout);
    user.appendChild(logout);
    sidebar.appendChild(logo); sidebar.appendChild(nav); sidebar.appendChild(user);

    var menu = U.byId('dashboardMenuButton');
    if (menu) {
      menu.addEventListener('click', function () {
        var open = sidebar.classList.toggle('open');
        menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    var topLogout = U.byId('topbarLogout');
    if (topLogout) topLogout.addEventListener('click', performLogout);

    var cachedMember = window.IEA_AUTH && window.IEA_AUTH.getCachedMember
      ? window.IEA_AUTH.getCachedMember()
      : null;
    if (cachedMember) setMemberNavigationIdentity(cachedMember);
  }

  function setMemberNavigationIdentity(member) {
    U.setText('sidebarMemberName', member && member.name, 'Member');
    U.setText('sidebarMemberMeta', (member && (member.email || member.memberId)) || '', '');
  }

  function performLogout() {
    window.IEA_AUTH.logout().then(function () { window.location.replace('index.html'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderPublicHeader();
    renderPublicFooter();
    renderDashboardShell();
  });

  window.IEA_NAV = Object.freeze({
    updatePublicAuthActions: updatePublicAuthActions,
    setMemberNavigationIdentity: setMemberNavigationIdentity,
    performLogout: performLogout
  });
}());
