function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function labelFontSize(text: string) {
  return text.length > 46
    ? 11
    : text.length > 40
      ? 12.5
      : text.length > 34
        ? 14.5
        : 17;
}

export function buildStandaloneLabelHtml(lines: string[]) {
  const rows = lines
    .slice(0, 4)
    .map(
      (line, index) =>
        `<p class="line-${index + 1}" style="font-size:${labelFontSize(line)}pt">${escapeHtml(line.toUpperCase())}</p>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title></title><style>
    @page { size: 150mm 100mm; margin: 0; }
    html, body { width: 150mm; height: 100mm; margin: 0; padding: 0; overflow: hidden; }
    body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-weight: 700; }
    .label { position: relative; width: 150mm; height: 100mm; overflow: hidden; }
    p { position: absolute; left: 15mm; width: 120mm; margin: 0; line-height: 1; white-space: nowrap; font-weight: 700; }
    .line-1 { bottom: 75mm; }
    .line-2 { bottom: 62mm; }
    .line-3 { bottom: 49mm; }
    .line-4 { bottom: 36mm; }
  </style></head><body><article class="label">${rows}</article></body></html>`;
}

export function printStandaloneLabel(lines: string[]) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: '0',
    right: '0',
    bottom: '0',
  });
  document.body.appendChild(frame);

  const labelDocument = frame.contentDocument;
  if (!labelDocument) {
    frame.remove();
    return;
  }

  labelDocument.open();
  labelDocument.write(buildStandaloneLabelHtml(lines));
  labelDocument.close();

  const cleanup = () => setTimeout(() => frame.remove(), 500);
  setTimeout(() => {
    const labelWindow = frame.contentWindow;
    if (!labelWindow) return cleanup();
    labelWindow.addEventListener('afterprint', cleanup, { once: true });
    labelWindow.focus();
    labelWindow.print();
  }, 150);
  setTimeout(() => frame.isConnected && frame.remove(), 60000);
}
