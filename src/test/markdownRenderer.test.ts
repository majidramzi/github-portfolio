import { describe, expect, it } from 'vitest';
import { renderSafeReadmeMarkdown } from '../services/markdownRenderer';

describe('README Markdown rendering and sanitization', () => {
  const ctx = {
    owner: 'alice-builder',
    repo: 'realtime-canvas',
    defaultBranch: 'main',
    readmePath: 'README.md',
  };

  it('renders headings, lists, tables, blockquotes, code blocks, inline code, and task lists', () => {
    const md = `# Overview

> Architectural note with \`inlineCode()\`.

- [x] Ship static build
- [ ] Add dark theme

| Feature | Status |
| --- | --- |
| Search | Ready |

\`\`\`ts
const answer: number = 42;
\`\`\`
`;

    const html = renderSafeReadmeMarkdown(md, ctx);

    expect(html).toContain('<h1 id="overview">Overview</h1>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<code>inlineCode()</code>');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('<div class="md-table-wrap"><table>');
    expect(html).toContain('<td>Search</td>');
    expect(html).toContain('<pre><code');
  });

  it('resolves relative image and link paths against repository and default branch', () => {
    const md = `
![Relative Image](./docs/ui.png)
![Root Relative](/assets/banner.jpg)
<img src="images/diagram.svg" alt="HTML Image" />

See [Contributing Guide](./CONTRIBUTING.md), [Jump Section](#overview), and [External Site](https://example.org/docs).
`;

    const html = renderSafeReadmeMarkdown(md, {
      ...ctx,
      defaultBranch: 'develop',
      readmePath: 'docs/README.md',
    });

    // Relative to docs/README.md -> docs/docs/ui.png
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/alice-builder/realtime-canvas/develop/docs/docs/ui.png"'
    );
    // Root-relative path resolves from repo root -> assets/banner.jpg
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/alice-builder/realtime-canvas/develop/assets/banner.jpg"'
    );
    // Raw HTML img relative to docs/ -> docs/images/diagram.svg
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/alice-builder/realtime-canvas/develop/docs/images/diagram.svg"'
    );
    // Relative markdown link resolves to GitHub blob URL and opens safely in new tab
    expect(html).toContain(
      'href="https://github.com/alice-builder/realtime-canvas/blob/develop/docs/CONTRIBUTING.md"'
    );
    // In-page anchor link stays local without target="_blank"
    expect(html).toContain('<a href="#overview">Jump Section</a>');
    // External links include safe rel and target attributes
    expect(html).toContain('href="https://example.org/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('sanitizes XSS payloads, embedded scripts, iframes, and javascript: URLs via DOMPurify', () => {
    const maliciousMd = `
# Safe Title

<script>window.__xssExecuted = true;</script>
<img src="x" onerror="alert('xss')" />
<iframe src="https://evil.example.com"></iframe>
<svg onload="alert(1)"></svg>
<a href="javascript:alert('xss')" onclick="evil()">Click me</a>
<input type="text" value="phishing" />
`;

    const html = renderSafeReadmeMarkdown(maliciousMd, ctx);

    expect(html).toContain('Safe Title');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('__xssExecuted');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('type="text"');
  });
});
