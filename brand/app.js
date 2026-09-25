document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    const target = targetId && document.querySelector(targetId);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const contactNotice = document.getElementById('contactNotice');
document.querySelectorAll('[data-contact-placeholder]').forEach((link) => {
  link.addEventListener('click', () => {
    if (contactNotice) contactNotice.textContent = link.dataset.contactPlaceholder;
  });
});
