/** Student project — no external branding middleware. */
export default defineEventHandler(() => {});

function defineEventHandler(fn: () => void) {
  return fn;
}
