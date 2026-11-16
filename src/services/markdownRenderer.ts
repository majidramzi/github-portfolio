import { Marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import { resolveRepoRelativeUrl } from '../utils/format';

export interface MarkdownRenderContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  readmePath?: string;
}

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'strong',
  'b',
  'em',
  'i',
  'del',
  's',
  'sub',
  'sup',
  'kbd',
  'mark',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'details',
  'summary',
  'dl',
  'dt',
  'dd',
  'figure',
  'figcaption',
  'picture',
  'source',
  'div',
  'span',
  'input',
];

const ALLOWED_ATTR = [
  'href',
  'src',
  'srcset',
  'alt',
  'title',
  'target',
  'rel',
  'class',
  'id',
  'align',
  'width',
  'height',
  'loading',
  'decoding',
  'type',
  'checked',
  'disabled',
  'colspan',
  'rowspan',
  'open',
  'media',
];

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render repository Markdown to safe, sanitized HTML.
 * - Uses `marked` with GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks).
 * - Resolves relative image paths to `raw.githubusercontent.com/{owner}/{repo}/{branch}/...`.
 * - Resolves relative links to `github.com/{owner}/{repo}/blob/{branch}/...`.
 * - Forces external links to open safely in a new tab with `rel="noopener noreferrer nofollow"`.
 * - Uses `DOMPurify` to strip all unsafe HTML, scripts, iframes, event handlers, and dangerous URLs.
 */
export function renderSafeReadmeMarkdown(
  markdown: string,
  ctx: MarkdownRenderContext
): string {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  const readmePath = ctx.readmePath || 'README.md';

  const markedInstance = new Marked({
    gfm: true,
    breaks: false,
  });

  markedInstance.use({
    renderer: {
      heading(this: { parser: { parseInline: (tokens: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const innerHtml = this.parser.parseInline(token.tokens);
        const slug = slugifyHeading(token.text);
        const idAttr = slug ? ` id="${escapeAttr(slug)}"` : '';
        return `<h${token.depth}${idAttr}>${innerHtml}</h${token.depth}>\n`;
      },
      table(this: { parser: { parseInline: (tokens: Tokens.Generic[]) => string } }, token: Tokens.Table) {
        let headerCells = '';
        for (let i = 0; i < token.header.length; i += 1) {
          const cell = token.header[i];
          if (!cell) continue;
          const align = token.align[i];
          const alignAttr = align ? ` align="${escapeAttr(align)}"` : '';
          headerCells += `<th${alignAttr}>${this.parser.parseInline(cell.tokens)}</th>`;
        }

        let bodyRows = '';
        for (const row of token.rows) {
          let rowCells = '';
          for (let i = 0; i < row.length; i += 1) {
            const cell = row[i];
            if (!cell) continue;
            const align = token.align[i];
            const alignAttr = align ? ` align="${escapeAttr(align)}"` : '';
            rowCells += `<td${alignAttr}>${this.parser.parseInline(cell.tokens)}</td>`;
          }
          bodyRows += `<tr>${rowCells}</tr>\n`;
        }

        return `<div class="md-table-wrap"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>\n`;
      },
      checkbox(token: Tokens.Checkbox) {
        return `<input type="checkbox" disabled${token.checked ? ' checked' : ''} class="md-task-checkbox" /> `;
      },
    },
  });

  let parsedHtml = '';
  try {
    const result = markedInstance.parse(markdown, { async: false });
    parsedHtml = typeof result === 'string' ? result : '';
  } catch {
    // Graceful fallback if malformed Markdown triggers a parser error
    const escaped = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    parsedHtml = `<pre><code>${escaped}</code></pre>`;
  }

  // Register a scoped DOMPurify hook to resolve relative URLs (including raw HTML <img>/<a> tags)
  // and enforce safe link/input attributes during sanitization.
  const afterSanitizeHook = (node: Element) => {
    const tagName = node.tagName?.toLowerCase();

    if (tagName === 'img') {
      const rawSrc = node.getAttribute('src');
      if (rawSrc) {
        const resolved = resolveRepoRelativeUrl(
          rawSrc,
          ctx.owner,
          ctx.repo,
          ctx.defaultBranch,
          readmePath,
          'image'
        );
        if (resolved) {
          node.setAttribute('src', resolved);
        } else {
          node.removeAttribute('src');
        }
      }
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    }

    if (tagName === 'source') {
      const rawSrcset = node.getAttribute('srcset');
      if (rawSrcset) {
        const resolved = resolveRepoRelativeUrl(
          rawSrcset.split(',')[0]?.trim().split(/\s+/)[0] ?? '',
          ctx.owner,
          ctx.repo,
          ctx.defaultBranch,
          readmePath,
          'image'
        );
        if (resolved) {
          node.setAttribute('srcset', resolved);
        } else {
          node.removeAttribute('srcset');
        }
      }
    }

    if (tagName === 'a') {
      const rawHref = node.getAttribute('href');
      if (rawHref) {
        const resolved = resolveRepoRelativeUrl(
          rawHref,
          ctx.owner,
          ctx.repo,
          ctx.defaultBranch,
          readmePath,
          'link'
        );
        if (resolved) {
          node.setAttribute('href', resolved);
          if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer nofollow');
          } else {
            node.removeAttribute('target');
            node.removeAttribute('rel');
          }
        } else {
          node.removeAttribute('href');
          node.removeAttribute('target');
          node.removeAttribute('rel');
        }
      }
    }

    if (tagName === 'input') {
      const inputType = node.getAttribute('type')?.toLowerCase();
      if (inputType !== 'checkbox') {
        node.remove();
        return;
      }
      node.setAttribute('disabled', '');
    }
  };

  DOMPurify.addHook('afterSanitizeAttributes', afterSanitizeHook);
  try {
    return DOMPurify.sanitize(parsedHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'form',
        'textarea',
        'select',
        'button',
        'svg',
        'math',
      ],
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    });
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
}
