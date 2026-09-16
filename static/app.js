'use strict';
// Server-rendered forms remain functional if JavaScript is unavailable.
for (const form of document.querySelectorAll('form[data-busy]')) {
  form.addEventListener('submit', (event) => {
    if (form.dataset.submitting === 'true') { event.preventDefault(); return; }
    if (!form.reportValidity()) return;
    form.dataset.submitting = 'true';
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = form.enctype === 'multipart/form-data' ? '正在保存，请稍候…' : '正在登录…';
    button.setAttribute('aria-busy', 'true');
  });
}
for (const form of document.querySelectorAll('form[data-confirm]')) {
  form.addEventListener('submit', (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
}
const file = document.querySelector('#package');
if (file) {
  const help = document.querySelector('#file-help');
  const original = help.textContent;
  file.addEventListener('change', () => {
    const chosen = file.files[0];
    let error = '';
    if (chosen && !chosen.name.toLowerCase().endsWith('.zip')) error = '请选择 ZIP 压缩包。';
    else if (chosen && chosen.size > 100000000) error = '压缩包不能超过 100 MB。';
    file.setCustomValidity(error);
    help.textContent = error || (chosen ? `${chosen.name} · ${(chosen.size / 1000000).toFixed(2)} MB，${document.body.dataset.localPublish ? '保存到本机后还需发布到公网。' : '保存后可供访客下载。'}` : original);
    help.classList.toggle('field-error', Boolean(error));
    if (error) file.reportValidity();
  });
}
window.addEventListener('pageshow', (event) => {
  // Restore forms returned through the browser's back/forward cache.
  if (event.persisted && document.querySelector('[data-submitting="true"]')) window.location.reload();
});
