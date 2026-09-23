'use strict';
const MAX_SUBMISSION_SIZE = 20000000;
const MAX_SUBMISSION_FILES = 5;

function cleanFileName(name) { return name.replace(/\.zip$/i, ''); }

const submissionPage = document.querySelector('.submission-page[data-api]');
if (submissionPage) {
  const form = document.querySelector('#submission-form');
  const files = document.querySelector('#submission-files');
  const help = document.querySelector('#submission-file-help');
  const items = document.querySelector('#submission-items');
  const template = document.querySelector('#submission-item-template');
  const save = document.querySelector('#submit-skills');
  const status = document.querySelector('#submission-status');
  let selected = [];

  function resetTurnstile() {
    if (window.turnstile) window.turnstile.reset();
  }

  files.addEventListener('change', () => {
    selected = [...files.files].slice(0, MAX_SUBMISSION_FILES);
    items.replaceChildren();
    let invalid = files.files.length > MAX_SUBMISSION_FILES ? '每次最多选择 5 个 ZIP。' : '';
    for (const [index, file] of selected.entries()) {
      if (!file.name.toLowerCase().endsWith('.zip')) invalid ||= `${file.name} 不是 ZIP 文件。`;
      if (!file.size || file.size > MAX_SUBMISSION_SIZE) invalid ||= `${file.name} 超过 20 MB。`;
      const row = template.content.firstElementChild.cloneNode(true);
      row.dataset.index = String(index);
      row.querySelector('.submission-filename').textContent = `${file.name} · ${(file.size / 1000000).toFixed(2)} MB`;
      const name = row.querySelector('[name="name"]');
      const summary = row.querySelector('[name="summary"]');
      name.value = cleanFileName(file.name);
      summary.value = `下载「${name.value}」技能包，使用前请阅读包内说明。`;
      let summaryEdited = false;
      summary.addEventListener('input', () => { summaryEdited = true; });
      name.addEventListener('input', () => { if (!summaryEdited) summary.value = `下载「${name.value}」技能包，使用前请阅读包内说明。`; });
      items.append(row);
    }
    files.setCustomValidity(invalid);
    help.textContent = invalid || (selected.length ? `已选择 ${selected.length} 个技能，请检查自动填写内容。` : '请选择 ZIP。');
    help.classList.toggle('field-error', Boolean(invalid));
    save.disabled = !selected.length || Boolean(invalid);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || !selected.length) return;
    const token = form.querySelector('[name="cf-turnstile-response"]')?.value || '';
    if (!token) { status.textContent = '请先完成人机验证。'; return; }
    const rows = [...items.querySelectorAll('.submission-item')];
    const body = new FormData();
    body.set('turnstile_token', token);
    body.set('rights_confirmed', document.querySelector('#rights-confirmed').checked ? 'yes' : 'no');
    body.set('nickname', document.querySelector('#submitter-nickname').value);
    body.set('contact', document.querySelector('#submitter-contact').value);
    const metadata = [];
    rows.forEach((row, index) => {
      const values = Object.fromEntries([...row.querySelectorAll('[name]')].map(field => [field.name, field.value]));
      metadata.push(values);
      body.set(`package_${index}`, selected[index], selected[index].name);
      row.querySelector('.submission-item-state').textContent = '上传中';
    });
    body.set('items', JSON.stringify(metadata));
    save.disabled = true;
    status.textContent = '正在提交，请不要关闭页面…';
    try {
      const response = await fetch(submissionPage.dataset.api + '/v1/submissions/batch', {method: 'POST', body});
      const result = await response.json();
      if ((!response.ok && response.status !== 207) || !result.ok) throw new Error(result.error || '提交失败。');
      let successes = 0;
      rows.forEach((row, index) => {
        const receipt = result.submissions[index];
        if (!receipt?.ok) {
          row.querySelector('.submission-item-state').textContent = '提交失败';
          const note = document.createElement('div');
          note.className = 'submission-receipt field-error';
          note.textContent = receipt?.error || '保存失败，请稍后重试。';
          row.append(note);
          return;
        }
        successes++;
        row.querySelector('.submission-item-state').textContent = '已提交';
        const note = document.createElement('div');
        note.className = 'submission-receipt';
        note.textContent = `投稿编号：${receipt.id}\n查询码：${receipt.query_code}`;
        row.append(note);
      });
      status.innerHTML = '';
      status.append(`成功提交 ${successes} 项。请立即保存每项的投稿编号和查询码。`);
      const link = document.createElement('a');
      link.href = submissionPage.dataset.statusUrl;
      link.textContent = ' 前往查询页面';
      status.append(link);
      const failed = [];
      rows.forEach((row, index) => {
        if (result.submissions[index]?.ok) return;
        failed.push({file: selected[index], row});
      });
      if (failed.length) {
        selected = failed.map(item => item.file);
        items.replaceChildren(...failed.map((item, index) => {
          item.row.dataset.index = String(index);
          return item.row;
        }));
        save.textContent = '重试未成功项';
        save.disabled = false;
        resetTurnstile();
        status.prepend(`剩余 ${failed.length} 项未成功，可修改后重试；`);
      } else {
        selected = [];
        save.textContent = '已全部提交';
      }
    } catch (error) {
      rows.forEach(row => { row.querySelector('.submission-item-state').textContent = '结果待核对'; });
      status.textContent = `${error.message || '提交失败。'} 如上传期间网络中断，请不要立即重复提交。`;
      save.disabled = false;
      resetTurnstile();
    }
  });
}

const queryPage = document.querySelector('.status-page[data-api]');
if (queryPage) {
  const form = document.querySelector('#submission-query-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const resultBox = document.querySelector('#query-result');
    resultBox.textContent = '正在查询…';
    const query = new URLSearchParams({id: document.querySelector('#submission-id').value.trim(), code: document.querySelector('#submission-code').value.trim()});
    try {
      const response = await fetch(queryPage.dataset.api + '/v1/status?' + query);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || '查询失败。');
      const labels = {pending: '待审核', rejected: '审核未通过', approved: '审核已通过，等待网站发布', published: '已公开', expired: '已过期'};
      resultBox.replaceChildren(document.createTextNode(labels[result.status] || '状态未知'));
      if (result.reason) resultBox.append(document.createTextNode(`：${result.reason}`));
      if (result.detail_url) {
        const link = document.createElement('a'); link.href = result.detail_url; link.textContent = ' 查看已公开技能';
        resultBox.append(link);
      }
    } catch (error) { resultBox.textContent = error.message || '查询失败，请稍后重试。'; }
  });
}
