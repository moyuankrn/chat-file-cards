const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

test('preview, safe text, download, retry, and narrow layout', async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 760, height: 700 }, acceptDownloads: true });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.locator('.chat-file').first().waitFor();
    assert.equal(await page.locator('.chat-file').count(), 3);

    await page.locator('[data-file-preview]').first().click();
    await page.locator('.file-preview pre').waitFor();
    assert.match(await page.locator('.file-preview pre').textContent(), /textContent/);
    await page.getByRole('button', { name: '关闭预览' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-file-download]').first().click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'project-note.txt');
    assert.match(fs.readFileSync(await download.path(), 'utf8'), /browser demo/);

    await page.evaluate(async () => {
      const { fileCard } = await import('/chat-files.js');
      const text = new Blob(['<script>window.__unsafe = true</script>'], { type: 'text/plain' });
      document.getElementById('samples').insertAdjacentHTML('beforeend', fileCard({ name: 'unsafe.txt', url: URL.createObjectURL(text) }));
    });
    await page.locator('.chat-file').last().locator('[data-file-preview]').click();
    await page.locator('.file-preview pre').waitFor();
    assert.equal(await page.locator('.file-preview pre script').count(), 0);
    assert.equal(await page.evaluate(() => window.__unsafe), undefined);
    await page.getByRole('button', { name: '关闭预览' }).click();

    let missing = true;
    await page.route('**/missing.txt', route => missing
      ? route.fulfill({ status: 404, body: 'missing' })
      : route.fulfill({ status: 200, contentType: 'text/plain', body: 'recovered' }));
    await page.evaluate(async () => {
      const { fileCard } = await import('/chat-files.js');
      document.getElementById('samples').insertAdjacentHTML('beforeend', fileCard({ name: 'missing.txt', url: '/missing.txt' }));
    });
    const retry = page.locator('.chat-file').last();
    await retry.locator('[data-file-download]').click();
    await retry.locator('.chat-file-status').getByText('文件不存在或已删除').waitFor();
    missing = false;
    const retryDownload = page.waitForEvent('download');
    await retry.locator('[data-file-download]').click();
    assert.equal((await retryDownload).suggestedFilename(), 'missing.txt');

    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
