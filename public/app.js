(function () {
  'use strict';

  function flash(button, text) {
    var original = button.getAttribute('data-label') || button.textContent;
    if (!button.getAttribute('data-label')) button.setAttribute('data-label', original);
    button.textContent = text;
    window.setTimeout(function () {
      button.textContent = original;
    }, 1600);
  }

  function scrollToSection(id) {
    var element = document.getElementById(id);
    if (!element) return;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      element.scrollIntoView();
    }
  }

  var mainInputs = document.querySelectorAll('input[name="main"]');
  var dessertInputs = document.querySelectorAll('input[name="dessert"]');
  var groups = document.querySelectorAll('.amend-group');
  var placeholder = document.getElementById('amends-placeholder');

  function sync() {
    var mainChecked = document.querySelector('input[name="main"]:checked');
    var dessertChecked = document.querySelector('input[name="dessert"]:checked');
    var mainId = mainChecked ? mainChecked.value : null;
    var dessertId = dessertChecked ? dessertChecked.value : null;

    Array.prototype.forEach.call(groups, function (group) {
      var wanted = group.hasAttribute('data-main')
        ? group.getAttribute('data-main') === mainId
        : group.getAttribute('data-dessert') === dessertId;

      group.hidden = !wanted;
      Array.prototype.forEach.call(group.querySelectorAll('input'), function (input) {
        input.disabled = !wanted;
      });
    });

    if (placeholder) placeholder.hidden = Boolean(mainId);

    Array.prototype.forEach.call(document.querySelectorAll('.dish'), function (dish) {
      var input = dish.querySelector('input[type="radio"]');
      dish.classList.toggle('is-selected', Boolean(input && input.checked));
    });
  }

  if (mainInputs.length || dessertInputs.length) {
    Array.prototype.forEach.call(mainInputs, function (input) {
      input.addEventListener('change', function () {
        sync();
        scrollToSection('amends');
      });
    });

    Array.prototype.forEach.call(dessertInputs, function (input) {
      input.addEventListener('change', function () {
        sync();
        scrollToSection('extras');
      });
    });

    sync();
  }

  // Copy link buttons.
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy');

      var fallback = function () {
        window.prompt('Copy this link', value);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () {
          flash(button, 'Copied');
        }, fallback);
      } else {
        fallback();
      }
    });
  });

  var copyAll = document.querySelector('[data-copy-all]');
  if (copyAll) {
    copyAll.addEventListener('click', function () {
      fetch('/admin/links', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('Could not load links');
          return response.text();
        })
        .then(function (text) {
          if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(function () {
              flash(copyAll, 'Copied all');
            });
          }
          window.open('/admin/links', '_blank', 'noopener');
        })
        .catch(function () {
          window.open('/admin/links', '_blank', 'noopener');
        });
    });
  }

  // Confirm before removing someone or closing entries.
  Array.prototype.forEach.call(document.querySelectorAll('form[data-confirm]'), function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.getAttribute('data-confirm'))) event.preventDefault();
    });
  });
})();
