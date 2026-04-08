/**
 * Shared JSON utilities extracted from RequestPreview for reuse across
 * ApiFlowStep and other components.
 */

/**
 * Lightweight JSON syntax highlighter — tokenizes and wraps with Tailwind
 * color classes matching the design tokens in index.css.
 */
export function highlightJson(json: string): string {
  return json
    .replace(
      /("(?:\\.|[^"\\])*")\s*:/g,
      '<span class="text-json-key">$1</span>:',
    )
    .replace(
      /:\s*("(?:\\.|[^"\\])*")/g,
      ': <span class="text-json-string">$1</span>',
    )
    .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span class="text-json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-json-bool">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-json-null">$1</span>')
    .replace(/([{}\[\]])/g, '<span class="text-json-bracket">$1</span>');
}

export function formatJson(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
