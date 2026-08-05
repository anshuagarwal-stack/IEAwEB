(function () {
  'use strict';

  var U = window.IEA_UTILS;

  function setFormMessage(text, type) {
    var message = U.byId('enquiryFormMessage');
    message.textContent = text || '';
    message.className = 'form-message' + (type ? ' ' + type : '');
  }

  function loadPlans() {
    var select = U.byId('enquiryPlan');
    var requestedPlan = String(U.getQueryParam('plan') || '').toUpperCase();

    return window.IEA_API
      .get('getMembershipPlans')
      .then(function (response) {
        var plans = response.data.plans || [];

        plans.forEach(function (plan) {
          var option = document.createElement('option');
          option.value = plan.planId;
          option.textContent = plan.planName + ' — ' + U.formatCurrency(plan.price);

          if (requestedPlan && requestedPlan === String(plan.planId).toUpperCase()) {
            option.selected = true;
          }

          select.appendChild(option);
        });
      });
  }

  function collectPayload() {
    return {
      name: U.byId('enquiryName').value,
      phone: U.byId('enquiryPhone').value,
      whatsapp: U.byId('enquiryWhatsApp').value,
      email: U.byId('enquiryEmail').value,
      city: U.byId('enquiryCity').value,
      preferredPlan: U.byId('enquiryPlan').value,
      message: U.byId('enquiryMessage').value,
      website: U.byId('enquiryWebsite').value
    };
  }

  function submitEnquiry(event) {
    event.preventDefault();

    var form = U.byId('membershipEnquiryForm');
    var button = U.byId('enquirySubmitButton');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (button.disabled) return;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';
    setFormMessage('Sending your membership enquiry…', '');

    window.IEA_API
      .post('submitMembershipEnquiry', collectPayload())
      .then(function (response) {
        setFormMessage(
          response.message || 'Your enquiry has been submitted. The IEA team will contact you shortly.',
          'success'
        );
        form.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        U.showToast('Membership enquiry submitted successfully.', 'success');
      })
      .catch(function (error) {
        setFormMessage(
          error.message || 'Your enquiry could not be submitted. Please try again.',
          'error'
        );
      })
      .finally(function () {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = 'Send Enquiry';
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadPlans().catch(function () {
      setFormMessage(
        'The plan list could not be loaded, but you may still send the enquiry.',
        'error'
      );
    });

    U.byId('membershipEnquiryForm').addEventListener('submit', submitEnquiry);
  });
}());
