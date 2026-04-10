/**
 * Lightweight cURL syntax highlighter — single-pass tokenizer that wraps
 * tokens with Tailwind color classes matching the design tokens in index.css.
 */

export function highlightCurl(code: string): string {
  // Escape HTML entities first
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Single-pass: match each construct in priority order so HTML from earlier
  // replacements is never re-processed by later ones.
  //   1. Quoted strings  ("..." or '...')
  //   2. URLs            (https?://...)
  //   3. curl command    (\bcurl\b)
  //   4. Flags           (-X, -H, --data, etc.) — preceded by captured whitespace
  const tokenPattern =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(https?:\/\/[^\s'"<>&]+)|(\bcurl\b)|(\s)(-[A-Z]\b|--[\w-]+)/g;

  return escaped.replace(
    tokenPattern,
    (_match, quoted: string | undefined, url: string | undefined, curlCmd: string | undefined, space: string | undefined, flag: string | undefined) => {
      if (quoted) {
        const inner = quoted.slice(1, -1);
        if (inner.includes(': ') || inner.includes('application/') || inner.includes('text/')) {
          return `<span class="text-curl-header-value">${quoted}</span>`;
        }
        return `<span class="text-curl-string">${quoted}</span>`;
      }
      if (url) return `<span class="text-curl-url">${url}</span>`;
      if (curlCmd) return `<span class="text-curl-command">${curlCmd}</span>`;
      if (flag) return `${space}<span class="text-curl-flag">${flag}</span>`;
      return _match;
    },
  );
}
