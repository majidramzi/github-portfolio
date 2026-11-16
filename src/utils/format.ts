import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C#': '#178600',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  R: '#198CE7',
  'Jupyter Notebook': '#DA5B0B',
  Dockerfile: '#384d54',
  HCL: '#844FBA',
  Zig: '#ec915c',
  Solidity: '#AA6746',
  SQL: '#e38c00',
  Markdown: '#083fa1',
};

export function getLanguageColor(language: string | null | undefined): string {
  if (!language) {
    return '#64748b';
  }
  return LANGUAGE_COLORS[language] ?? '#6366f1';
}

export function formatRelativeDate(dateInput: string | number | Date | null | undefined): string {
  if (dateInput === null || dateInput === undefined) {
    return '';
  }
  const date =
    typeof dateInput === 'string'
      ? parseISO(dateInput)
      : typeof dateInput === 'number'
        ? new Date(dateInput)
        : dateInput;

  if (!isValid(date)) {
    return '';
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatFullDate(dateInput: string | number | Date | null | undefined): string {
  if (dateInput === null || dateInput === undefined) {
    return '';
  }
  const date =
    typeof dateInput === 'string'
      ? parseISO(dateInput)
      : typeof dateInput === 'number'
        ? new Date(dateInput)
        : dateInput;

  if (!isValid(date)) {
    return '';
  }

  return format(date, 'MMM d, yyyy');
}

export function formatTimestampTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  if (!isValid(date)) {
    return '';
  }
  return format(date, 'p');
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Validate and normalize an external HTTP(S) URL.
 * Returns null for empty strings or dangerous protocols (javascript:, data:, vbscript:).
 */
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Reject explicit non-http(s) schemes immediately
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1]?.toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return null;
    }
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  }

  // Protocol-relative URLs
  if (trimmed.startsWith('//')) {
    try {
      const parsed = new URL(`https:${trimmed}`);
      return parsed.toString();
    } catch {
      return null;
    }
  }

  // Bare domain like "example.com" or "example.com/app"
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/.test(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.toString();
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Resolve a path from a repository README against the repository and default branch.
 * - For images: resolves relative paths to `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/...`
 * - For links: resolves relative paths to `https://github.com/{owner}/{repo}/blob/{branch}/...`
 * - Preserves external http(s) URLs, mailto links, and `#hash` fragments.
 * - Blocks dangerous schemes (`javascript:`, `vbscript:`, `data:text/html`).
 */
export function resolveRepoRelativeUrl(
  rawUrl: string,
  owner: string,
  repo: string,
  defaultBranch: string,
  readmePath = 'README.md',
  mode: 'image' | 'link' = 'link'
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Keep in-page anchor links for links
  if (trimmed.startsWith('#')) {
    return mode === 'link' ? trimmed : null;
  }

  // Check explicit URI scheme
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1]?.toLowerCase();
    if (scheme === 'http' || scheme === 'https') {
      // Convert GitHub blob image links for the same repo into raw image URLs
      if (mode === 'image') {
        const ghBlobMatch =
          /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i.exec(trimmed);
        if (ghBlobMatch) {
          const [, blobOwner, blobRepo, blobBranch, blobPath] = ghBlobMatch;
          const cleanBlobPath = (blobPath ?? '').replace(/\?raw=true$/i, '');
          return `https://raw.githubusercontent.com/${encodeURIComponent(blobOwner ?? owner)}/${encodeURIComponent(blobRepo ?? repo)}/${encodeURIComponent(blobBranch ?? defaultBranch)}/${cleanBlobPath}`;
        }
      }
      return trimmed;
    }
    if (mode === 'link' && scheme === 'mailto') {
      return trimmed;
    }
    // Disallow javascript:, vbscript:, data:, file:, etc.
    return null;
  }

  // Protocol-relative URL
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Compute the directory containing the README (e.g. "docs/README.md" -> "docs/")
  const normalizedReadme = readmePath.replace(/^\/+/, '');
  const lastSlash = normalizedReadme.lastIndexOf('/');
  const readmeDir = lastSlash >= 0 ? normalizedReadme.slice(0, lastSlash + 1) : '';

  const baseOrigin =
    mode === 'image'
      ? `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(defaultBranch)}/`
      : `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${encodeURIComponent(defaultBranch)}/`;

  // Split query/hash from path so relative path resolution works cleanly
  const suffixIndex = trimmed.search(/[?#]/);
  const pathPart = suffixIndex >= 0 ? trimmed.slice(0, suffixIndex) : trimmed;
  const suffixPart = suffixIndex >= 0 ? trimmed.slice(suffixIndex) : '';

  // Root-relative paths inside the repo (e.g. "/docs/screenshot.png") resolve from repo root
  const combinedRelative = pathPart.startsWith('/')
    ? pathPart.replace(/^\/+/, '')
    : `${readmeDir}${pathPart}`;

  // Normalize "." and ".." segments without escaping the repo root
  const segments = combinedRelative.split('/');
  const normalizedSegments: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      normalizedSegments.pop();
    } else {
      normalizedSegments.push(encodeURIComponent(decodeURIComponentSafe(segment)));
    }
  }

  return `${baseOrigin}${normalizedSegments.join('/')}${suffixPart}`;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getDisplayHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getInitials(name: string | null | undefined, username: string): string {
  const source = (name || username || '?').trim();
  const parts = source.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
