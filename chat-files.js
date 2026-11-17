// File messages share one renderer and one set of actions for live/history views.
const icon = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const documentIcon = icon('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>');
const downloadIcon = icon('<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>');
const types = { pdf: 'PDF 文档', txt: '文本文档', md: 'Markdown 文档', doc: 'Word 文档', docx: 'Word 文档', xls: 'Excel 表格', xlsx: 'Excel 表格', csv: '数据表格', ppt: '演示文稿', pptx: '演示文稿', zip: '压缩文件', rar: '压缩文件', '7z': '压缩文件' };
const textTypes = new Set(['txt', 'md', 'csv', 'json', 'log', 'py', 'js', 'css', 'yaml', 'yml']);
const imageTypes = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']);
const mediaTypes = new Set(['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'mov']);
const extension = name => name.includes('.') ? name.split('.').pop().toLowerCase() : '';
const canPreview = ext => ext === 'pdf' || textTypes.has(ext) || imageTypes.has(ext) || mediaTypes.has(ext);
const sizeLabel = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = value => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('File URL is required');
  const url = new URL(String(value), document.baseURI);
  if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new TypeError('File URL must use http, https, or blob');
  return url.href;
};

// file: { name, url, size?, previewUrl? }. The host owns storage and auth.
export function fileCard(file) {
  if (!file || typeof file.name !== 'string' || !file.name.trim()) throw new TypeError('File name is required');
  const name = file.name, ext = extension(name);
  const url = safeUrl(file.url), previewUrl = safeUrl(file.previewUrl || file.url), preview = canPreview(ext);
  const kind = types[ext] || (imageTypes.has(ext) ? '图片' : mediaTypes.has(ext) ? '影音文件' : (ext ? ext.toUpperCase() + ' 文件' : '文件'));
  return `<span class="chat-file" data-name="${escapeHtml(name)}" data-url="${escapeHtml(url)}" data-preview-url="${escapeHtml(previewUrl)}" data-ext="${escapeHtml(ext)}">
    <span class="chat-file-main"><span class="chat-file-icon" data-type="${ext === 'pdf' ? 'pdf' : 'document'}">${documentIcon}<span>${escapeHtml(ext.slice(0, 5).toUpperCase() || 'FILE')}</span></span>
    <span class="chat-file-body"><b title="${escapeHtml(name)}">${escapeHtml(name)}</b><small>${escapeHtml(kind)}${Number.isFinite(file.size) && file.size >= 0 ? ' · ' + sizeLabel(file.size) : ''}</small></span></span>
    <span class="chat-file-actions">${preview ? '<button type="button" data-file-preview>预览</button>' : '<span class="chat-file-hint">用对应应用打开</span>'}<a href="${escapeHtml(url)}" download="${escapeHtml(name)}" data-file-download>${downloadIcon}<span>下载文件</span></a></span>
    <span class="chat-file-status" role="status" aria-live="polite" hidden></span>
  </span>`;
}

async function checkedResponse(url, signal) {
  const response = await fetch(url, { credentials: 'same-origin', signal });
  if (!response.ok) throw new Error(response.status === 404 ? '文件不存在或已删除' : response.status === 401 ? '登录已过期，请刷新后重试' : `获取文件失败（HTTP ${response.status}）`);
  return response;
}

async function downloadFile(link, card) {
  if (link.getAttribute('aria-disabled') === 'true') return;
  const status = card.querySelector('.chat-file-status'), label = link.querySelector('span');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
  const say = text => { status.hidden = false; status.textContent = text; };
  link.setAttribute('aria-disabled', 'true'); card.dataset.state = 'loading';
  label.textContent = '下载中…'; say('正在获取文件…');
  try {
    const response = await checkedResponse(link.href, controller.signal);
    const total = Number(response.headers.get('content-length'));
    let blob;
    if (response.body?.getReader) {
      const reader = response.body.getReader(), parts = []; let received = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        parts.push(value); received += value.length;
        say(total ? `正在下载 ${Math.min(100, Math.round(received / total * 100))}% · ${sizeLabel(total)}` : `已接收 ${sizeLabel(received)}`);
      }
      blob = new Blob(parts, { type: response.headers.get('content-type') || 'application/octet-stream' });
    } else blob = await response.blob();
    // Give the browser a real local file and its original name; keep the chat open.
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = card.dataset.name; document.body.append(anchor);
    anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    card.dataset.state = 'ready'; label.textContent = '再次下载';
    say('已发起保存 · 请在浏览器下载列表或「文件」中查看');
  } catch (err) {
    card.dataset.state = 'error'; label.textContent = '重试下载';
    say(err.name === 'AbortError' ? '下载超时，请重试' : err.message === 'Failed to fetch' ? '网络连接失败，请重试' : err.message);
  } finally { clearTimeout(timeout); link.removeAttribute('aria-disabled'); }
}

function previewFile(card) {
  const { name, previewUrl, ext } = card.dataset;
  const dialog = document.createElement('dialog'), controller = new AbortController();
  dialog.className = 'file-preview';
  dialog.innerHTML = `<div class="file-preview-head"><div><small>文件预览</small><b>${escapeHtml(name)}</b></div><button type="button" aria-label="关闭预览">×</button></div><div class="file-preview-stage"><p role="status">正在加载文件…</p></div><div class="file-preview-foot"><span>预览不完整？可在新窗口打开</span><a href="${escapeHtml(previewUrl)}" target="_blank" rel="noopener">打开文件 ↗</a></div>`;
  document.body.append(dialog);
  const previousFocus = document.activeElement, stage = dialog.querySelector('.file-preview-stage');
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  const previewId = `file-${Date.now()}-${Math.random()}`;
  const onPop = e => { if (e.state?.filePreview !== previewId && dialog.open) dialog.close(); };
  history.pushState({ ...history.state, filePreview: previewId }, '');
  addEventListener('popstate', onPop);
  dialog.addEventListener('close', () => {
    controller.abort(); removeEventListener('popstate', onPop); dialog.remove(); previousFocus?.focus();
    if (history.state?.filePreview === previewId) history.back();
  }, { once: true });
  dialog.showModal();
  (async () => {
    try {
      if (textTypes.has(ext)) {
        const response = await checkedResponse(previewUrl, controller.signal);
        if (Number(response.headers.get('content-length')) > 2 * 1024 * 1024) { await response.body?.cancel(); throw new Error('文件较大，请下载后查看完整内容'); }
        const reader = response.body?.getReader(); let text;
        if (reader) {
          const chunks = []; let size = 0;
          while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('文件较大，请下载后查看完整内容'); } chunks.push(value); }
          text = await new Blob(chunks).text();
        } else text = await response.text();
        const pre = document.createElement('pre'); pre.textContent = text || '（空文件）'; stage.replaceChildren(pre);
      } else {
        const el = document.createElement(ext === 'pdf' ? 'iframe' : imageTypes.has(ext) ? 'img' : ['mp4', 'webm', 'mov'].includes(ext) ? 'video' : 'audio');
        el.title = name; if (el.tagName === 'IMG') el.alt = name;
        if (['VIDEO', 'AUDIO'].includes(el.tagName)) el.controls = true;
        if (el.tagName === 'VIDEO') el.playsInline = true;
        el.onerror = () => { stage.textContent = '暂时无法预览，请下载后打开'; };
        el.src = previewUrl; stage.replaceChildren(el);
      }
    } catch (err) { if (err.name !== 'AbortError') stage.textContent = err.message; }
  })();
}

export function mountFileActions(box) {
  const onClick = e => {
    const card = e.target.closest('.chat-file'); if (!card) return;
    const link = e.target.closest('[data-file-download]');
    if (link) { e.preventDefault(); downloadFile(link, card); }
    else if (e.target.closest('[data-file-preview]')) previewFile(card);
  };
  box.addEventListener('click', onClick);
  return () => box.removeEventListener('click', onClick);
}
