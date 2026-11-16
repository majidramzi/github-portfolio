import type { GitHubRepository } from '../types/github';
import type {
  EnrichedProject,
  ExtractedLink,
  ExtractedScreenshot,
  ReadmeExtraction,
  ReadmeRecord,
} from '../types/portfolio';
import { normalizeExternalUrl, resolveRepoRelativeUrl } from '../utils/format';

export interface ReadmeAnalysisContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  readmePath?: string;
}

interface MarkdownSection {
  heading: string;
  normalizedHeading: string;
  level: number;
  content: string;
}

const BADGE_URL_PATTERNS: RegExp[] = [
  /img\.shields\.io/i,
  /shields\.io/i,
  /badgen\.net/i,
  /badge\.fury\.io/i,
  /codecov\.io/i,
  /coveralls\.io/i,
  /travis-ci\.(org|com)/i,
  /circleci\.com/i,
  /david-dm\.org/i,
  /nodei\.co/i,
  /vercel\.com\/button/i,
  /netlify\.com\/img\/deploy/i,
  /deploy\.workers\.cloudflare\.com/i,
  /heroku\.com\/deploy/i,
  /buymeacoffee\.com/i,
  /ko-fi\.com/i,
  /patreon\.com/i,
  /github\.com\/[^/]+\/[^/]+\/actions\/workflows\/.+\/badge\.svg/i,
  /github\.com\/[^/]+\/[^/]+\/workflows\/.+\/badge\.svg/i,
  /komarev\.com\/ghpvc/i,
  /hits\.seeyoufarm\.com/i,
  /sonarcloud\.io\/api\/project_badges/i,
  /snyk\.io\/test\/github/i,
  /codeclimate\.com/i,
  /deepsource\.io/i,
  /badges\.gitter\.im/i,
  /flat\.badgen\.net/i,
];

const KNOWN_LANGUAGES_AND_FRAMEWORKS = new Set([
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'golang',
  'java',
  'c#',
  'c++',
  'c',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'dart',
  'scala',
  'elixir',
  'haskell',
  'zig',
  'lua',
  'r',
  'sql',
  'html',
  'html5',
  'css',
  'css3',
  'scss',
  'sass',
  'react',
  'react native',
  'next.js',
  'nextjs',
  'vue',
  'vue.js',
  'nuxt',
  'nuxt.js',
  'svelte',
  'sveltekit',
  'angular',
  'astro',
  'solid',
  'solidjs',
  'remix',
  'node.js',
  'nodejs',
  'deno',
  'bun',
  'express',
  'fastify',
  'nestjs',
  'django',
  'flask',
  'fastapi',
  'spring',
  'spring boot',
  'rails',
  'ruby on rails',
  'laravel',
  'flutter',
  'tailwind',
  'tailwind css',
  'tailwindcss',
  'bootstrap',
  'vite',
  'webpack',
  'graphql',
  'pytorch',
  'tensorflow',
  'langchain',
  'scikit-learn',
  'pandas',
  'numpy',
  'electron',
  'tauri',
]);

const SECTION_PATTERNS = {
  introduction:
    /^(about(\s+the\s+project|\s+this\s+project)?|overview|introduction|intro|description|summary|project\s+overview|what\s+is\b)/i,
  purpose:
    /^(purpose|why(\s+this|\s+use|\s+build|\s+[a-z0-9-]+)?|motivation|background|problem(\s+statement)?|goals?|objectives?|use\s+cases?)/i,
  features:
    /^(features?|key\s+features?|core\s+features?|main\s+features?|highlights?|capabilities|what\s+it\s+does|functionality)/i,
  techStack:
    /^(technologies(\s+used)?|technology(\s+stack)?|tech\s+stack|built\s+with|stack|frameworks?(\s+(&|and)\s+libraries)?|languages?(\s+(&|and)\s+frameworks?)?|tools?(\s+(&|and)\s+technologies)?|core\s+stack|made\s+with)/i,
  installation:
    /^(installation|install|getting\s+started|quick\s*start|setup|set\s+up|prerequisites?|requirements?|system\s+requirements?|local\s+development|running\s+locally)/i,
  demo: /^(live\s+demo|demo|live\s+site|live\s+preview|live\s+app|online\s+demo|deployment|try\s+it(\s+out)?|hosted\s+demo)/i,
  screenshots: /^(screenshots?|gallery|ui\s+preview|preview|visuals?|media|demo\s+screenshots?)/i,
  documentation: /^(documentation|docs|guides?|user\s+guide|manual|wiki|handbook)/i,
  apiDocs:
    /^(api(\s+documentation|\s+docs|\s+reference|\s+endpoints?)?|rest\s+api|graphql\s+api|endpoints?|swagger|openapi|sdk\s+reference)/i,
  license: /^(licen[cs]e|licensing)/i,
};

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function normalizeHeadingText(rawHeading: string): string {
  return rawHeading
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // strip inline images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // unwrap markdown links
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/[*_`~]/g, '') // strip emphasis
    .replace(/[^\p{L}\p{N}\s&+-]/gu, ' ') // strip emojis & punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitMarkdownSections(markdown: string): {
  preamble: string;
  sections: MarkdownSection[];
} {
  const cleaned = stripHtmlComments(markdown).replace(/\r\n/g, '\n');
  const lines = cleaned.split('\n');

  const preambleLines: string[] = [];
  const sections: MarkdownSection[] = [];
  let currentSection: { heading: string; level: number; lines: string[] } | null = null;
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let sawTopH1 = false;

  for (const line of lines) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      const char = marker[0] ?? '`';
      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLen = marker.length;
      } else if (char === fenceChar && marker.length >= fenceLen) {
        inFence = false;
      }
    }

    if (!inFence) {
      const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (headingMatch) {
        const level = (headingMatch[1] ?? '#').length;
        const headingText = (headingMatch[2] ?? '').trim();

        // Treat the very first H1 (project title) as part of the preamble boundary,
        // so paragraphs directly beneath `# Project Name` remain in preamble.
        if (level === 1 && !sawTopH1 && sections.length === 0 && !currentSection) {
          sawTopH1 = true;
          continue;
        }

        if (currentSection) {
          sections.push({
            heading: currentSection.heading,
            normalizedHeading: normalizeHeadingText(currentSection.heading),
            level: currentSection.level,
            content: currentSection.lines.join('\n').trim(),
          });
        }
        currentSection = { heading: headingText, level, lines: [] };
        continue;
      }
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      normalizedHeading: normalizeHeadingText(currentSection.heading),
      level: currentSection.level,
      content: currentSection.lines.join('\n').trim(),
    });
  }

  return {
    preamble: preambleLines.join('\n').trim(),
    sections,
  };
}

function isBadgeUrl(url: string): boolean {
  return BADGE_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // remove inline images/badges
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // keep link text
    .replace(/<[^>]+>/g, ' ') // strip HTML tags
    .replace(/`([^`]+)`/g, '$1') // unwrap inline code
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // unwrap bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // unwrap italic
    .replace(/~~(.*?)~~/g, '$1') // unwrap strikethrough
    .replace(/^>\s?/gm, '') // unwrap blockquotes
    .replace(/\s+/g, ' ')
    .trim();
}

function removeFencedCodeBlocks(content: string): string {
  return content.replace(/^\s*(`{3,}|~{3,})[\s\S]*?^\s*\1\s*$/gm, '');
}

function isBadgeOrDecorativeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  // Pure horizontal rule
  if (/^([-*_])\1{2,}$/.test(trimmed)) {
    return true;
  }
  // HTML-only layout/image/badge wrappers (e.g., <p align="center"><img ...></p>)
  const withoutBadgeSyntax = trimmed
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?(p|div|a|br|hr|center|picture|source|h1|strong|b|sub|sup)\b[^>]*>/gi, '')
    .replace(/[|·•\-/]+/g, '')
    .trim();

  return withoutBadgeSyntax.length === 0;
}

function extractProseParagraphs(content: string): string[] {
  const withoutCode = removeFencedCodeBlocks(content);
  const blocks = withoutCode.split(/\n\s*\n/);
  const paragraphs: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      continue;
    }

    // Skip lists, tables, and headings
    if (
      lines.every((l) => /^([-*+]|\d+\.)\s+/.test(l)) ||
      lines.some((l) => /^\|.*\|$/.test(l)) ||
      lines.every((l) => /^#{1,6}\s+/.test(l))
    ) {
      continue;
    }

    // Skip badge-only or pure-image blocks
    if (lines.every(isBadgeOrDecorativeLine)) {
      continue;
    }

    // Skip navigation/TOC link bars like "[Demo](#demo) · [Docs](#docs) · [License](#license)"
    const nonLinkResidue = lines
      .join(' ')
      .replace(/\[[^\]]+\]\([^)]*\)/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[|·•—–\-/,\s]+/g, '');
    if (nonLinkResidue.length === 0) {
      continue;
    }

    const cleaned = stripInlineMarkdown(
      lines.filter((line) => !isBadgeOrDecorativeLine(line)).join(' ')
    );

    if (cleaned.length >= 16) {
      paragraphs.push(cleaned);
    }
  }

  return paragraphs;
}

function truncateCleanly(text: string, maxLength = 360): string {
  if (text.length <= maxLength) {
    return text;
  }
  const sliced = text.slice(0, maxLength);
  const lastPeriod = sliced.lastIndexOf('. ');
  if (lastPeriod >= maxLength * 0.55) {
    return sliced.slice(0, lastPeriod + 1).trim();
  }
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function extractListItems(content: string): string[] {
  const withoutCode = removeFencedCodeBlocks(content);
  const lines = withoutCode.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const match = /^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.+)$/.exec(line);
    if (!match || !match[1]) {
      continue;
    }
    const cleaned = stripInlineMarkdown(match[1]);
    if (cleaned.length >= 2) {
      items.push(cleaned);
    }
  }

  return items;
}

function dedupeCaseInsensitive(values: string[], limit?: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
    if (limit && result.length >= limit) {
      break;
    }
  }
  return result;
}

function cleanTechnologyName(rawItem: string): string | null {
  let item = rawItem.trim();
  if (!item) {
    return null;
  }

  // Handle "React 19 — Component UI library" or "TypeScript: Static typing"
  const splitMatch = /^([^:—–-]{2,42}?)\s*(?::|—|–|\s-\s)\s+.+$/.exec(item);
  if (splitMatch && splitMatch[1]) {
    item = splitMatch[1].trim();
  }

  // Strip surrounding version parens only if overly noisy, keep clean versions like "React 19"
  item = item.replace(/[.;,]+$/, '').trim();

  // Reject sentences that are clearly prose rather than technology names
  if (item.length < 2 || item.length > 40 || item.split(/\s+/).length > 5) {
    return null;
  }

  // Reject generic boilerplate labels
  if (/^(license|mit|apache|gpl|build|passing|coverage|version|stars|forks|downloads)$/i.test(item)) {
    return null;
  }

  return item;
}

function extractBadgeLabelsFromSection(content: string): string[] {
  const labels: string[] = [];
  const imgRegex = /!\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(content)) !== null) {
    const alt = (match[1] ?? '').trim();
    const url = (match[2] ?? '').trim();
    if (isBadgeUrl(url) && alt) {
      const cleaned = cleanTechnologyName(alt);
      if (cleaned) {
        labels.push(cleaned);
      }
    }
  }
  return labels;
}

function extractTechnologies(sections: MarkdownSection[]): {
  techStack: string[];
  languagesAndFrameworks: string[];
} {
  const matchingSections = sections.filter((s) =>
    SECTION_PATTERNS.techStack.test(s.normalizedHeading)
  );
  if (matchingSections.length === 0) {
    return { techStack: [], languagesAndFrameworks: [] };
  }

  const rawItems: string[] = [];

  for (const section of matchingSections) {
    // 1. Bullet/numbered list items
    const listItems = extractListItems(section.content);
    for (const item of listItems) {
      // Handle categorized items like "Frontend: React, TypeScript, Tailwind CSS"
      const categoryMatch = /^(?:frontend|backend|database|testing|tooling|styling|infra|infrastructure|devops|languages?|frameworks?|stack|core|runtime|ui)\s*:\s*(.+)$/i.exec(
        item
      );
      if (categoryMatch && categoryMatch[1]) {
        const subItems = categoryMatch[1].split(/[,/|•]+/);
        for (const sub of subItems) {
          const cleaned = cleanTechnologyName(sub);
          if (cleaned) {
            rawItems.push(cleaned);
          }
        }
      } else {
        const cleaned = cleanTechnologyName(item);
        if (cleaned) {
          rawItems.push(cleaned);
        }
      }
    }

    // 2. Shields/badge alt labels inside the Tech Stack section
    rawItems.push(...extractBadgeLabelsFromSection(section.content));

    // 3. Markdown tables inside Tech Stack section (first or second column)
    const tableLines = removeFencedCodeBlocks(section.content)
      .split('\n')
      .filter((line) => /^\|.+\|$/.test(line.trim()));
    if (tableLines.length >= 3) {
      for (const row of tableLines.slice(2)) {
        const cells = row
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => stripInlineMarkdown(c));
        // Skip category cell if first column is generic like "Frontend" and second has tech
        const firstCell = cells[0] ?? '';
        const secondCell = cells[1] ?? '';
        if (
          /^(frontend|backend|ui|styling|testing|database|build|language|framework|runtime|deployment)$/i.test(
            firstCell
          ) &&
          secondCell
        ) {
          for (const part of secondCell.split(/[,/]+/)) {
            const cleaned = cleanTechnologyName(part);
            if (cleaned) {
              rawItems.push(cleaned);
            }
          }
        } else if (firstCell) {
          const cleaned = cleanTechnologyName(firstCell);
          if (cleaned) {
            rawItems.push(cleaned);
          }
        }
      }
    }

    // 4. Comma-separated inline list if no list/table/badges existed
    if (rawItems.length === 0) {
      const paragraphs = extractProseParagraphs(section.content);
      for (const para of paragraphs) {
        if (para.includes(',') && para.length < 180) {
          for (const token of para.split(/[,•|]+/)) {
            const cleaned = cleanTechnologyName(token);
            if (cleaned) {
              rawItems.push(cleaned);
            }
          }
        }
      }
    }
  }

  const techStack = dedupeCaseInsensitive(rawItems, 20);
  const languagesAndFrameworks = techStack.filter((item) => {
    const normalized = item.toLowerCase().replace(/\s+\d+(\.\d+)*$/, '').trim();
    return KNOWN_LANGUAGES_AND_FRAMEWORKS.has(normalized);
  });

  return { techStack, languagesAndFrameworks };
}

function extractFeatures(sections: MarkdownSection[]): string[] {
  const featureSections = sections.filter((s) =>
    SECTION_PATTERNS.features.test(s.normalizedHeading)
  );
  if (featureSections.length === 0) {
    return [];
  }

  const features: string[] = [];
  for (const section of featureSections) {
    const listItems = extractListItems(section.content);
    for (const item of listItems) {
      if (item.length >= 4 && item.length <= 220) {
        features.push(item);
      }
    }
  }

  // If a Features H2 section uses H3 subheadings instead of bullet items
  if (features.length === 0) {
    for (let i = 0; i < sections.length; i += 1) {
      const current = sections[i];
      if (!current || !SECTION_PATTERNS.features.test(current.normalizedHeading)) {
        continue;
      }
      for (let j = i + 1; j < sections.length; j += 1) {
        const sub = sections[j];
        if (!sub || sub.level <= current.level) {
          break;
        }
        const cleaned = stripInlineMarkdown(sub.heading);
        if (cleaned.length >= 3) {
          features.push(cleaned);
        }
      }
    }
  }

  return dedupeCaseInsensitive(features, 12);
}

function extractInstallation(sections: MarkdownSection[]): {
  requirements: string[];
  snippet: string | null;
} {
  const installSections = sections.filter((s) =>
    SECTION_PATTERNS.installation.test(s.normalizedHeading)
  );
  if (installSections.length === 0) {
    return { requirements: [], snippet: null };
  }

  const requirements: string[] = [];
  let snippet: string | null = null;

  for (const section of installSections) {
    const isPrereqSection = /^(prerequisites?|requirements?|system\s+requirements?)/i.test(
      section.normalizedHeading
    );
    const items = extractListItems(section.content);
    if (isPrereqSection) {
      requirements.push(...items.slice(0, 8));
    } else if (requirements.length === 0) {
      // Pick prerequisite-looking list items (Node, Python, Git, Docker, npm, Go, Rust, etc.)
      const prereqMatches = items.filter((item) =>
        /\b(node(\.js)?|npm|pnpm|yarn|bun|python|pip|docker|git|go|rust|cargo|java|jdk|ruby|php|composer|postgres|redis|sqlite|>=?\s*\d|v?\d+\.\d+)/i.test(
          item
        )
      );
      requirements.push(...prereqMatches.slice(0, 6));
    }

    if (!snippet) {
      const codeMatch = /```(?:bash|sh|shell|zsh|console|powershell|cmd)?\s*\n([\s\S]*?)```/i.exec(
        section.content
      );
      if (codeMatch && codeMatch[1]?.trim()) {
        const lines = codeMatch[1].trim().split('\n').slice(0, 8);
        snippet = lines.join('\n');
      }
    }
  }

  return {
    requirements: dedupeCaseInsensitive(requirements, 8),
    snippet,
  };
}

function extractImagesFromMarkdown(
  content: string,
  ctx: ReadmeAnalysisContext
): ExtractedScreenshot[] {
  const withoutCode = removeFencedCodeBlocks(content);
  const results: ExtractedScreenshot[] = [];

  // 1. Markdown image syntax ![alt](url "optional title")
  const mdImgRegex = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdImgRegex.exec(withoutCode)) !== null) {
    const alt = (match[1] ?? '').trim();
    const rawUrl = (match[2] ?? '').trim();
    if (!rawUrl || isBadgeUrl(rawUrl)) {
      continue;
    }
    const resolved = resolveRepoRelativeUrl(
      rawUrl,
      ctx.owner,
      ctx.repo,
      ctx.defaultBranch,
      ctx.readmePath,
      'image'
    );
    if (resolved && !isBadgeUrl(resolved)) {
      results.push({ alt: alt || `${ctx.repo} screenshot`, url: resolved });
    }
  }

  // 2. HTML <img src="..." alt="...">
  const htmlImgRegex = /<img\b[^>]*>/gi;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlImgRegex.exec(withoutCode)) !== null) {
    const tag = htmlMatch[0];
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(tag);
    if (!srcMatch || !srcMatch[1]) {
      continue;
    }
    const rawUrl = srcMatch[1].trim();
    if (!rawUrl || isBadgeUrl(rawUrl)) {
      continue;
    }

    // Skip tiny explicit icon images (e.g. width="20")
    const widthMatch = /\bwidth=["']?(\d+)(?:px)?["']?/i.exec(tag);
    if (widthMatch && Number(widthMatch[1]) > 0 && Number(widthMatch[1]) < 64) {
      continue;
    }

    const altMatch = /\balt=["']([^"']*)["']/i.exec(tag);
    const resolved = resolveRepoRelativeUrl(
      rawUrl,
      ctx.owner,
      ctx.repo,
      ctx.defaultBranch,
      ctx.readmePath,
      'image'
    );
    if (resolved && !isBadgeUrl(resolved)) {
      results.push({
        alt: altMatch?.[1]?.trim() || `${ctx.repo} screenshot`,
        url: resolved,
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter((img) => {
    if (seen.has(img.url)) {
      return false;
    }
    seen.add(img.url);
    return true;
  });
}

function extractScreenshots(
  sections: MarkdownSection[],
  fullMarkdown: string,
  ctx: ReadmeAnalysisContext
): ExtractedScreenshot[] {
  const screenshotSections = sections.filter((s) =>
    SECTION_PATTERNS.screenshots.test(s.normalizedHeading)
  );

  const fromDedicatedSections: ExtractedScreenshot[] = [];
  for (const section of screenshotSections) {
    fromDedicatedSections.push(...extractImagesFromMarkdown(section.content, ctx));
  }
  if (fromDedicatedSections.length > 0) {
    return fromDedicatedSections.slice(0, 8);
  }

  // Fallback: look for non-badge, screenshot-like images elsewhere in the README
  const allImages = extractImagesFromMarkdown(fullMarkdown, ctx).filter((img) => {
    const lowerUrl = img.url.toLowerCase();
    const lowerAlt = img.alt.toLowerCase();
    if (/\b(logo|icon|avatar|sponsor|badge|banner-small)\b/.test(lowerAlt)) {
      return false;
    }
    if (/(favicon|badge|sponsor|star-history)/i.test(lowerUrl)) {
      return false;
    }
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(lowerUrl) || /screenshot|preview|demo/i.test(lowerAlt);
  });

  return allImages.slice(0, 6);
}

interface RawLink {
  label: string;
  url: string;
}

function extractLinksFromMarkdown(content: string): RawLink[] {
  const withoutCode = removeFencedCodeBlocks(content);
  const links: RawLink[] = [];

  // Markdown links [label](url), skipping images ![alt](url)
  const mdLinkRegex = /(?<!!)\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRegex.exec(withoutCode)) !== null) {
    const label = stripInlineMarkdown(match[1] ?? '');
    const url = (match[2] ?? '').trim();
    if (url && !isBadgeUrl(url)) {
      links.push({ label: label || url, url });
    }
  }

  // HTML <a href="url">label</a>
  const htmlLinkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlLinkRegex.exec(withoutCode)) !== null) {
    const url = (htmlMatch[1] ?? '').trim();
    const label = stripInlineMarkdown(htmlMatch[2] ?? '');
    if (url && !isBadgeUrl(url)) {
      links.push({ label: label || url, url });
    }
  }

  // Bare http(s) URLs not already captured
  const bareUrlRegex = /(?<![("'=])(https?:\/\/[^\s<>)\]"']+)/g;
  let bareMatch: RegExpExecArray | null;
  while ((bareMatch = bareUrlRegex.exec(withoutCode)) !== null) {
    const url = (bareMatch[1] ?? '').replace(/[.,;:!?]+$/, '');
    if (url && !isBadgeUrl(url) && !links.some((l) => l.url === url)) {
      links.push({ label: url, url });
    }
  }

  return links;
}

function isLikelyLiveDemoCandidate(url: string, owner: string, repo: string): boolean {
  const normalized = normalizeExternalUrl(url);
  if (!normalized || isBadgeUrl(normalized)) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    // Exclude links pointing to the repository source itself on github.com
    if (host === 'github.com' || host === 'www.github.com') {
      const repoPrefix = `/${owner.toLowerCase()}/${repo.toLowerCase()}`;
      if (parsed.pathname.toLowerCase().startsWith(repoPrefix)) {
        return false;
      }
      // Also exclude generic github.com links as live demos
      return false;
    }
    if (host === 'raw.githubusercontent.com' || host === 'user-images.githubusercontent.com') {
      return false;
    }
    // Exclude direct image files
    if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(parsed.pathname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractLiveDemoUrl(
  sections: MarkdownSection[],
  fullMarkdown: string,
  ctx: ReadmeAnalysisContext
): string | null {
  // 1. Check dedicated Live Demo / Demo sections
  const demoSections = sections.filter((s) => SECTION_PATTERNS.demo.test(s.normalizedHeading));
  for (const section of demoSections) {
    const links = extractLinksFromMarkdown(section.content);
    for (const link of links) {
      if (isLikelyLiveDemoCandidate(link.url, ctx.owner, ctx.repo)) {
        return normalizeExternalUrl(link.url);
      }
    }
  }

  // 2. Check explicitly labeled demo links anywhere in the README
  const allLinks = extractLinksFromMarkdown(fullMarkdown);
  for (const link of allLinks) {
    if (
      /\b(live\s+demo|view\s+demo|online\s+demo|live\s+site|live\s+preview|live\s+app|try\s+it(\s+out)?|open\s+demo|demo)\b/i.test(
        link.label
      ) &&
      isLikelyLiveDemoCandidate(link.url, ctx.owner, ctx.repo)
    ) {
      return normalizeExternalUrl(link.url);
    }
  }

  // 3. Check lines like "**Live Demo:** https://..."
  const lineDemoRegex =
    /(?:live\s+demo|demo\s+url|live\s+site|deployed\s+at)\s*[:—–-]\s*<?(https?:\/\/[^\s<>)\]"']+)>?/i;
  const lineMatch = lineDemoRegex.exec(removeFencedCodeBlocks(fullMarkdown));
  if (lineMatch && lineMatch[1] && isLikelyLiveDemoCandidate(lineMatch[1], ctx.owner, ctx.repo)) {
    return normalizeExternalUrl(lineMatch[1]);
  }

  return null;
}

function resolveAndDedupeLinks(
  rawLinks: RawLink[],
  ctx: ReadmeAnalysisContext,
  limit = 6
): ExtractedLink[] {
  const seen = new Set<string>();
  const resolvedList: ExtractedLink[] = [];

  for (const item of rawLinks) {
    if (item.url.startsWith('#')) {
      continue;
    }
    const resolved = resolveRepoRelativeUrl(
      item.url,
      ctx.owner,
      ctx.repo,
      ctx.defaultBranch,
      ctx.readmePath,
      'link'
    );
    if (!resolved || isBadgeUrl(resolved) || seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    resolvedList.push({
      label: item.label.length > 80 ? `${item.label.slice(0, 77)}…` : item.label,
      url: resolved,
    });
    if (resolvedList.length >= limit) {
      break;
    }
  }

  return resolvedList;
}

function extractDocumentationLinks(
  sections: MarkdownSection[],
  fullMarkdown: string,
  ctx: ReadmeAnalysisContext
): {
  documentationLinks: ExtractedLink[];
  apiDocumentationLinks: ExtractedLink[];
} {
  const apiRaw: RawLink[] = [];
  const docRaw: RawLink[] = [];

  for (const section of sections) {
    if (SECTION_PATTERNS.apiDocs.test(section.normalizedHeading)) {
      apiRaw.push(...extractLinksFromMarkdown(section.content));
    } else if (SECTION_PATTERNS.documentation.test(section.normalizedHeading)) {
      docRaw.push(...extractLinksFromMarkdown(section.content));
    }
  }

  // Also detect explicitly labeled docs/API links outside dedicated sections
  const allLinks = extractLinksFromMarkdown(fullMarkdown);
  for (const link of allLinks) {
    if (/\b(api\s+docs?|api\s+reference|swagger|openapi|rest\s+api|graphql\s+api)\b/i.test(link.label)) {
      apiRaw.push(link);
    } else if (
      /\b(documentation|read\s+the\s+docs|full\s+docs|user\s+guide|developer\s+guide|wiki)\b/i.test(
        link.label
      )
    ) {
      docRaw.push(link);
    }
  }

  const apiDocumentationLinks = resolveAndDedupeLinks(apiRaw, ctx, 6);
  const apiUrlSet = new Set(apiDocumentationLinks.map((l) => l.url));
  const documentationLinks = resolveAndDedupeLinks(docRaw, ctx, 6).filter(
    (link) => !apiUrlSet.has(link.url)
  );

  return { documentationLinks, apiDocumentationLinks };
}

function extractLicenseInfo(sections: MarkdownSection[], fullMarkdown: string): string | null {
  const licenseSection = sections.find((s) =>
    SECTION_PATTERNS.license.test(s.normalizedHeading)
  );

  if (licenseSection) {
    const paragraphs = extractProseParagraphs(licenseSection.content);
    const candidate = paragraphs[0] ?? stripInlineMarkdown(licenseSection.content);
    if (candidate) {
      // Check for well-known SPDX/license names first for crisp display
      const knownMatch =
        /\b(MIT License|Apache License(?:\s+2\.0)?|Apache-2\.0|GNU General Public License(?:\s+v?[23](?:\.0)?)?|GPLv[23]|LGPLv?[23]?|MPL(?:\s*2\.0)?|BSD(?:\s+[23]-Clause)?\s+License|ISC License|Unlicense|CC0|AGPL(?:\s*v?3)?|MIT)\b/i.exec(
          candidate
        );
      if (knownMatch && knownMatch[1]) {
        return knownMatch[1].trim();
      }
      return truncateCleanly(candidate, 120);
    }
  }

  // Fallback: inspect shields.io license badge in README
  const licenseBadge = /!\[[^[\]]*licen[cs]e[^[\]]*\]\([^)]*badge\/licen[cs]e-([^/?)-]+)/i.exec(
    fullMarkdown
  );
  if (licenseBadge && licenseBadge[1]) {
    return decodeURIComponent(licenseBadge[1].replace(/--/g, '-').replace(/_/g, ' '));
  }

  return null;
}

/**
 * Analyze raw README Markdown and extract structured project information.
 * Never fabricates missing data — unavailable fields remain null or empty arrays.
 */
export function analyzeReadme(
  rawMarkdown: string,
  ctx: ReadmeAnalysisContext
): ReadmeExtraction {
  const { preamble, sections } = splitMarkdownSections(rawMarkdown);

  // 1. Introduction: dedicated intro/about/overview section first, then preamble paragraphs
  const introSection = sections.find((s) =>
    SECTION_PATTERNS.introduction.test(s.normalizedHeading)
  );
  const introParagraphs = introSection ? extractProseParagraphs(introSection.content) : [];
  const preambleParagraphs = extractProseParagraphs(preamble);

  const introductionRaw = introParagraphs[0] ?? preambleParagraphs[0] ?? null;
  const introduction = introductionRaw ? truncateCleanly(introductionRaw, 380) : null;

  // 2. Purpose: dedicated purpose/why/motivation section, or distinct second paragraph in overview
  const purposeSection = sections.find((s) =>
    SECTION_PATTERNS.purpose.test(s.normalizedHeading)
  );
  let purpose: string | null = null;
  if (purposeSection) {
    const purposeParas = extractProseParagraphs(purposeSection.content);
    if (purposeParas[0]) {
      purpose = truncateCleanly(purposeParas[0], 380);
    } else {
      const purposeBullets = extractListItems(purposeSection.content);
      if (purposeBullets.length > 0) {
        purpose = truncateCleanly(purposeBullets.slice(0, 3).join('; '), 380);
      }
    }
  } else if (introParagraphs.length > 1 && introParagraphs[1]) {
    purpose = truncateCleanly(introParagraphs[1], 380);
  }

  // 3. Features
  const features = extractFeatures(sections);

  // 4. Tech stack + languages/frameworks
  const { techStack, languagesAndFrameworks } = extractTechnologies(sections);

  // 5. Installation requirements & snippet
  const { requirements: installationRequirements, snippet: installationSnippet } =
    extractInstallation(sections);

  // 6. Screenshots
  const screenshots = extractScreenshots(sections, rawMarkdown, ctx);

  // 7. Live Demo URL
  const liveDemoUrl = extractLiveDemoUrl(sections, rawMarkdown, ctx);

  // 8. Documentation & API documentation links
  const { documentationLinks, apiDocumentationLinks } = extractDocumentationLinks(
    sections,
    rawMarkdown,
    ctx
  );

  // 9. License
  const licenseInfo = extractLicenseInfo(sections, rawMarkdown);

  // Plain text index for local README search
  const plainText = stripInlineMarkdown(removeFencedCodeBlocks(stripHtmlComments(rawMarkdown)));

  return {
    introduction,
    purpose,
    features,
    techStack,
    languagesAndFrameworks,
    installationRequirements,
    installationSnippet,
    screenshots,
    liveDemoUrl,
    documentationLinks,
    apiDocumentationLinks,
    licenseInfo,
    plainText,
  };
}

export function createIdleReadmeRecord(): ReadmeRecord {
  return {
    status: 'idle',
    rawMarkdown: null,
    readmePath: 'README.md',
    origin: 'none',
    extracted: null,
    fetchedAt: null,
    errorMessage: null,
  };
}

/**
 * Combine repository metadata and README extraction with explicit source provenance.
 * Clearly distinguishes README-extracted fields from GitHub metadata fallbacks.
 */
export function buildEnrichedProject(
  repo: GitHubRepository,
  readme: ReadmeRecord = createIdleReadmeRecord()
): EnrichedProject {
  const extracted = readme.extracted;

  // Summary: README introduction -> fallback to GitHub repository description
  const cleanDescription = repo.description?.trim() || null;
  const summary = extracted?.introduction
    ? { value: extracted.introduction, source: 'readme' as const }
    : cleanDescription
      ? { value: cleanDescription, source: 'metadata' as const }
      : { value: null, source: 'none' as const };

  // Technologies: README tech stack -> fallback to primary repository language
  const technologies =
    extracted && extracted.techStack.length > 0
      ? { value: extracted.techStack, source: 'readme' as const }
      : repo.language
        ? { value: [repo.language], source: 'metadata' as const }
        : { value: [], source: 'none' as const };

  // Live Demo: README Live Demo link -> fallback to GitHub homepage URL
  const normalizedHomepage = normalizeExternalUrl(repo.homepage);
  const liveDemo = extracted?.liveDemoUrl
    ? { value: extracted.liveDemoUrl, source: 'readme' as const }
    : normalizedHomepage
      ? { value: normalizedHomepage, source: 'metadata' as const }
      : { value: null, source: 'none' as const };

  // License: README license info -> fallback to GitHub repository license metadata
  const repoLicenseName =
    repo.license?.name && repo.license.key !== 'other'
      ? repo.license.name
      : repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION'
        ? repo.license.spdx_id
        : null;
  const license = extracted?.licenseInfo
    ? { value: extracted.licenseInfo, source: 'readme' as const }
    : repoLicenseName
      ? { value: repoLicenseName, source: 'metadata' as const }
      : { value: null, source: 'none' as const };

  return {
    repo,
    readme,
    summary,
    technologies,
    liveDemo,
    license,
  };
}
