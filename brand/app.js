document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.querySelectorAll('.faq-question').forEach((button) => {
  button.addEventListener('click', () => {
    const item = button.closest('.faq-item');
    if (!item) return;

    const isOpen = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach((faqItem) => {
      faqItem.classList.remove('active');
    });

    if (!isOpen) {
      item.classList.add('active');
    }
  });
});

const leadForm = document.getElementById('leadForm');
const successMessage = document.getElementById('formSuccess');

if (leadForm && successMessage) {
  leadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();

    if (!name || !email) {
      successMessage.textContent = '請填寫姓名與 Email 後再提交。';
      successMessage.classList.add('show');
      return;
    }

    successMessage.textContent = '感謝您的需求，我們會在 1 個工作天內聯繫您。';
    successMessage.classList.add('show');
    leadForm.reset();
  });
}
