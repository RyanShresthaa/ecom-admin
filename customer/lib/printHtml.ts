/**
 * Open the browser print dialog for an HTML invoice/receipt.
 * Avoids `window.open(..., 'noopener')` which returns null and breaks print.
 */
export function printHtmlDocument(html: string): boolean {
  const content = String(html || '').trim();
  if (!content || typeof document === 'undefined') return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Print invoice');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(content);
  doc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.remove();
    }, 1000);
  };

  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      // Fallback when iframe print is blocked
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const popup = window.open(url, '_blank', 'width=900,height=1000');
      if (popup) {
        const onLoad = () => {
          popup.focus();
          popup.print();
          URL.revokeObjectURL(url);
        };
        popup.addEventListener('load', onLoad);
        // Blob URLs often load before the listener is attached
        setTimeout(onLoad, 250);
      } else {
        URL.revokeObjectURL(url);
        return false;
      }
    } finally {
      cleanup();
    }
    return true;
  };

  // Give the document a tick to layout before printing
  setTimeout(runPrint, 250);

  return true;
}

/** Download invoice HTML as a file (user can open / print to PDF from the file). */
export function downloadHtmlDocument(html: string, filename = 'invoice.html'): boolean {
  const content = String(html || '').trim();
  if (!content || typeof document === 'undefined') return false;
  try {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/** Print an already-rendered invoice iframe (needs allow-modals on sandbox). */
export function printIframe(iframe: HTMLIFrameElement | null): boolean {
  const win = iframe?.contentWindow;
  if (!win) return false;
  try {
    win.focus();
    win.print();
    return true;
  } catch {
    return false;
  }
}
