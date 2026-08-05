(function () {
  'use strict';

  var U = window.IEA_UTILS;

  function closeModal(backdrop) {
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }

  function openPaymentModal(plan, member) {
    var amount = Number(plan.price || 0);
    var memberName = member && member.name ? member.name : '';
    var memberId = member && member.memberId ? member.memberId : '';

    var message = [
      'Hello IEA,',
      '',
      'I have paid for an IEA Clubs membership renewal.',
      'Plan: ' + plan.planName,
      'Amount: ' + U.formatCurrency(amount),
      memberName ? 'Member: ' + memberName : '',
      memberId ? 'Member ID: ' + memberId : '',
      '',
      'I will attach the payment screenshot here.'
    ].filter(Boolean).join('\n');

    var whatsappNumber = String(
      window.IEA_CONFIG.WHATSAPP_NUMBER || ''
    ).replace(/\D/g, '');

    var whatsappUrl =
      'https://wa.me/' +
      whatsappNumber +
      '?text=' +
      encodeURIComponent(message);

    var backdrop = U.createElement('div', {
      className: 'modal-backdrop'
    });

    var modal = U.createElement('div', {
      className: 'modal payment-modal',
      attrs: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'paymentModalTitle'
      }
    });

    modal.appendChild(U.createElement('h2', {
      id: 'paymentModalTitle',
      text: 'Pay for ' + plan.planName
    }));

    modal.appendChild(U.createElement('p', {
      className: 'payment-amount',
      text: U.formatCurrency(amount)
    }));

    modal.appendChild(U.createElement('img', {
      className: 'payment-qr',
      attrs: {
        src: window.IEA_CONFIG.PAYMENT_QR_IMAGE,
        alt: 'UPI QR code for IEA Clubs membership payment'
      }
    }));

    modal.appendChild(U.createElement('p', {
      className: 'payment-upi',
      text: 'UPI ID: ' + window.IEA_CONFIG.UPI_ID
    }));

    modal.appendChild(U.createElement('p', {
      className: 'payment-instructions',
      text: 'Scan the QR code using any UPI app. After paying, open WhatsApp and attach the payment screenshot.'
    }));

    var actions = U.createElement('div', {
      className: 'modal-actions payment-actions'
    });

    var closeButton = U.createElement('button', {
      className: 'button button-secondary',
      text: 'Close',
      attrs: { type: 'button' }
    });

    closeButton.addEventListener('click', function () {
      closeModal(backdrop);
    });

    var whatsappButton = U.createElement('a', {
      className: 'button',
      text: 'Send Screenshot on WhatsApp',
      attrs: {
        href: whatsappUrl,
        target: '_blank',
        rel: 'noopener'
      }
    });

    actions.appendChild(closeButton);
    actions.appendChild(whatsappButton);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) closeModal(backdrop);
    });
  }

  window.IEA_PAYMENT = Object.freeze({
    open: openPaymentModal
  });
}());