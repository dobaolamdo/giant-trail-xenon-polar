/** No-op stubs — branding removed. */
export function acceptsHtml() { return false; }
export function createHeadInjector() {
  return { push: () => [], flush: () => [] };
}
export function injectGrokPwaHead(html) { return html; }
export function isDocumentPath() { return false; }
export function isInstallQuery() { return false; }
export function renderInstallPageHtml() { return ""; }
export function renderWebManifest() { return "{}"; }
export function snapshotOgIdentity() { return {}; }
