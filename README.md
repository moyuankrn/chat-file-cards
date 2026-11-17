# Chat File Cards

A small browser module for file messages in a chat. It renders file type, size, preview and download actions. Text previews are inserted as text, downloads show progress, and a failed download can be retried. Extracted from the Xiaoke panel and adapted so the host supplies its own file URLs.

## Try the demo

```sh
python3 -m http.server 8000
# open http://127.0.0.1:8000/
```

The demo creates three sample files in the browser. It does not upload anything or contact an API.

## Use it

Include `chat-files.css` and call the module with a file name and a URL:

```html
<link rel="stylesheet" href="chat-files.css">
<div id="messages"></div>
<script type="module">
  import { fileCard, mountFileActions } from './chat-files.js';

  const messages = document.querySelector('#messages');
  messages.innerHTML = fileCard({
    name: 'report.pdf',
    url: '/api/files/123456abcdef_report.pdf',
    size: 48217,
  });
  const unmount = mountFileActions(messages);
  // Call unmount() when removing the message view.
</script>
```

`previewUrl` is optional. Supply it when inline preview and download need different URLs, for example `/api/files/id?preview=1`. URLs may be relative, HTTP(S), or `blob:`. Fetch requests use same-origin credentials; your server controls access and response headers.

The file extension determines the preview: text and code are shown safely as plain text (up to 2 MiB); images, PDF, video, and audio use native browser elements. Other files can still be downloaded. The browser handles media support and PDF rendering.

The module does not upload files, store them, or define a backend protocol. Override the color variables at the top of `chat-files.css` to match an application. No runtime dependencies or build step are needed.

## Test

```sh
npm install
npx playwright install chromium
npm test
```

The browser test checks text preview safety, download contents and filename, retry after a 404, and a 320px layout.

MIT licensed. See [LICENSE](LICENSE).
