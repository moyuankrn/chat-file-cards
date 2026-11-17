---
name: chat-file-cards
description: Add accessible file message cards with preview, download progress, and retry behavior to a browser chat interface. Use when integrating file attachments into an existing web chat UI that supplies its own file URLs.
---

# Chat file cards

Use the bundled `chat-files.js` and `chat-files.css` as a reference implementation for browser chat file messages. The host application supplies file URLs, storage, and access control. This skill is for integration into a web app; it does not provide a backend or upload service.

## Work on the user's app

1. Inspect how the app renders messages and obtains authorized file URLs. Establish the data shape for `{ name, url, size?, previewUrl? }`. Keep server authorization on the file endpoint; a card is not an access-control mechanism.
2. Integrate `fileCard(file)` into the message renderer and call `mountFileActions(container)` once for the relevant chat view. Keep and invoke its returned unmount function when the view is removed. If the app uses a virtual DOM, adapt the markup and event lifecycle rather than repeatedly mounting listeners.
3. Bring in the component styles, but scope or replace the demo-wide `:root`, `*`, `body`, and generic form-control rules before adding them to an existing app. Map the color variables to the app's theme. Check 320px layout and keyboard focus.
4. Test a text preview, a download with the original filename, a missing-file response followed by retry, and a narrow screen. Confirm text previews are inserted through `textContent` and cannot execute markup. Check an authenticated file endpoint with the app's actual cookie or token model.
5. Report the integration points, file types tested, and browser behavior observed. Explain that media and PDF preview depend on browser support and server response headers.

## Boundaries

- The module accepts relative, HTTP(S), and `blob:` URLs. It uses `fetch` with same-origin credentials. Cross-origin files require the host's own CORS and authentication design.
- Text and code previews are limited to 2 MiB. Other preview behavior is delegated to native browser elements. The module does not upload or store files.
- Existing browser tests cover Chromium. Do not claim equivalent behavior in other engines without checking them.

The reference implementation is MIT licensed: https://github.com/moyuankrn/chat-file-cards .
