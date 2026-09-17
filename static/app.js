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
  const autofill = file.form.hasAttribute('data-single-autofill');
  const name = file.form.querySelector('[name="name"]');
  const summary = file.form.querySelector('[name="summary"]');
  let nameEdited = Boolean(name.value);
  let summaryEdited = Boolean(summary.value);
  const updateSummary = () => {
    if (!summaryEdited) summary.value = `下载「${name.value}」技能包，使用前请阅读包内说明。`;
  };
  const validateName = () => {
    name.setCustomValidity(!name.value.trim() ? '请填写技能名称。' :
      name.value.length > name.maxLength ? '技能名称不能超过 80 字，请手动修改。' : '');
  };
  if (autofill) {
    name.addEventListener('input', () => {
      nameEdited = true;
      updateSummary();
      validateName();
    });
    summary.addEventListener('input', () => { summaryEdited = true; });
    validateName();
  }
  file.addEventListener('change', () => {
    const chosen = file.files[0];
    let error = '';
    if (chosen && !chosen.name.toLowerCase().endsWith('.zip')) error = '请选择 ZIP 压缩包。';
    else if (chosen && chosen.size > 100000000) error = '压缩包不能超过 100 MB。';
    file.setCustomValidity(error);
    if (autofill && chosen && !error) {
      if (!nameEdited) name.value = chosen.name.replace(/\.zip$/i, '');
      updateSummary();
      validateName();
    }
    help.textContent = error || (chosen ? `${chosen.name} · ${(chosen.size / 1000000).toFixed(2)} MB，${document.body.dataset.localPublish ? '保存到本机后还需发布到公网。' : '保存后可供访客下载。'}` : original);
    help.classList.toggle('field-error', Boolean(error));
    if (error) file.reportValidity();
  });
}
window.addEventListener('pageshow', (event) => {
  // Restore forms returned through the browser's back/forward cache.
  if (event.persisted && document.querySelector('[data-submitting="true"]')) window.location.reload();
});

// Delegate to include category selectors in dynamically added batch items.
document.body.classList.add('category-options-ready');
document.addEventListener('change', event => {
  if (!event.target.matches('.category-select') || !event.target.value) return;
  const input = event.target.closest('.category-field').querySelector('[name="category"]');
  input.value = event.target.value;
  input.dispatchEvent(new Event('input', {bubbles:true}));
});
document.addEventListener('input', event => {
  if (!event.target.matches('.category-field [name="category"]')) return;
  const select = event.target.closest('.category-field').querySelector('.category-select');
  if (select.value !== event.target.value) select.value = '';
});

const copyInstallPrompt = document.querySelector('#copy-install-prompt');
if (copyInstallPrompt) {
  copyInstallPrompt.hidden = false;
  const prompt = document.querySelector('#install-prompt');
  const status = document.querySelector('#copy-install-status');
  copyInstallPrompt.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(prompt.value);
      status.textContent = '已复制，请粘贴给智能体。';
    } catch (_) {
      prompt.focus();
      prompt.select();
      status.textContent = '未能自动复制，请手动复制已选中的文字。';
    }
  });
}
