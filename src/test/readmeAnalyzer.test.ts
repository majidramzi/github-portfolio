import { describe, expect, it } from 'vitest';
import {
  analyzeReadme,
  buildEnrichedProject,
  createIdleReadmeRecord,
} from '../services/readmeAnalyzer';
import { ALICE_READMES, makeMockRepo } from './fixtures';

describe('README analysis and metadata fallback provenance', () => {
  it('extracts structured fields from a full developer README', () => {
    const extracted = analyzeReadme(ALICE_READMES['realtime-canvas']!, {
      owner: 'alice-builder',
      repo: 'realtime-canvas',
      defaultBranch: 'main',
      readmePath: 'README.md',
    });

    expect(extracted.introduction).toContain('sub-50ms CRDT synchronization');
    expect(extracted.purpose).toContain('large system topology diagrams');
    expect(extracted.features).toEqual([
      'Multiplayer cursors powered by WebSockets and CRDT state merging',
      'Offline-first persistence with automatic conflict resolution',
      'Instant SVG and PNG diagram export',
    ]);
    expect(extracted.techStack).toEqual([
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'WebSockets',
    ]);
    expect(extracted.languagesAndFrameworks).toEqual([
      'React 19',
      'TypeScript',
      'Tailwind CSS',
    ]);
    expect(extracted.installationRequirements).toEqual(['Node.js 20 or newer', 'npm 10+']);
    expect(extracted.installationSnippet).toContain('npm install');
    expect(extracted.liveDemoUrl).toBe('https://canvas-demo.example.dev/');
    expect(extracted.screenshots).toEqual([
      {
        alt: 'Workspace Editor',
        url: 'https://raw.githubusercontent.com/alice-builder/realtime-canvas/main/docs/editor-preview.png',
      },
    ]);
    expect(extracted.documentationLinks).toEqual([
      {
        label: 'User Guide',
        url: 'https://github.com/alice-builder/realtime-canvas/blob/main/docs/guide.md',
      },
    ]);
    expect(extracted.apiDocumentationLinks).toEqual([
      {
        label: 'Sync Protocol API',
        url: 'https://canvas-demo.example.dev/api-docs',
      },
    ]);
    expect(extracted.licenseInfo).toBe('MIT License');
  });

  it('recognizes alternate headings (About, Built With, Getting Started, Demo) and ignores badges', () => {
    const markdown = `# Metric Hub

[![CI](https://github.com/org/metric-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/org/metric-hub/actions)
![License](https://img.shields.io/badge/license-Apache_2.0-blue)

## About

Metric Hub collects structured OpenTelemetry spans with minimal CPU overhead.

## Built With

- Frontend: Vue, Vite
- Backend: Rust, PostgreSQL

## Getting Started

- Rust 1.80+
- Docker Compose

\`\`\`sh
cargo run --release
\`\`\`

Check out the [View Demo](https://metrics.example.org/app) online.
`;

    const extracted = analyzeReadme(markdown, {
      owner: 'org',
      repo: 'metric-hub',
      defaultBranch: 'master',
    });

    expect(extracted.introduction).toContain('OpenTelemetry spans');
    expect(extracted.techStack).toEqual(['Vue', 'Vite', 'Rust', 'PostgreSQL']);
    expect(extracted.installationRequirements).toEqual(['Rust 1.80+', 'Docker Compose']);
    expect(extracted.installationSnippet).toBe('cargo run --release');
    expect(extracted.liveDemoUrl).toBe('https://metrics.example.org/app');
    expect(extracted.screenshots).toEqual([]); // Badges must not be treated as screenshots
    expect(extracted.licenseInfo).toBe('Apache 2.0');
  });

  it('does not invent missing fields when README is minimal or empty', () => {
    const extracted = analyzeReadme('# Empty Notes\n', {
      owner: 'alice-builder',
      repo: 'notes',
      defaultBranch: 'main',
    });

    expect(extracted.introduction).toBeNull();
    expect(extracted.purpose).toBeNull();
    expect(extracted.features).toEqual([]);
    expect(extracted.techStack).toEqual([]);
    expect(extracted.liveDemoUrl).toBeNull();
    expect(extracted.screenshots).toEqual([]);
    expect(extracted.licenseInfo).toBeNull();
  });

  it('clearly distinguishes README-extracted fields from GitHub metadata fallbacks', () => {
    const repoWithMetadata = makeMockRepo({
      name: 'edge-cache-cli',
      description: 'Metadata description from GitHub',
      language: 'Go',
      homepage: 'https://edge-cache.example.org',
      license: { key: 'apache-2.0', name: 'Apache License 2.0', spdx_id: 'Apache-2.0', url: null },
    });

    // Without README -> falls back cleanly to GitHub metadata with source === 'metadata'
    const fallbackProject = buildEnrichedProject(repoWithMetadata, createIdleReadmeRecord());
    expect(fallbackProject.summary).toEqual({
      value: 'Metadata description from GitHub',
      source: 'metadata',
    });
    expect(fallbackProject.technologies).toEqual({
      value: ['Go'],
      source: 'metadata',
    });
    expect(fallbackProject.liveDemo).toEqual({
      value: 'https://edge-cache.example.org/',
      source: 'metadata',
    });
    expect(fallbackProject.license).toEqual({
      value: 'Apache License 2.0',
      source: 'metadata',
    });

    // With full README -> prioritizes extracted README values with source === 'readme'
    const extracted = analyzeReadme(ALICE_READMES['realtime-canvas']!, {
      owner: 'alice-builder',
      repo: 'realtime-canvas',
      defaultBranch: 'main',
    });
    const readmeProject = buildEnrichedProject(repoWithMetadata, {
      status: 'loaded',
      rawMarkdown: ALICE_READMES['realtime-canvas']!,
      readmePath: 'README.md',
      origin: 'api',
      extracted,
      fetchedAt: Date.now(),
      errorMessage: null,
    });

    expect(readmeProject.summary.source).toBe('readme');
    expect(readmeProject.technologies.source).toBe('readme');
    expect(readmeProject.liveDemo.source).toBe('readme');
    expect(readmeProject.license.source).toBe('readme');

    // Repo missing both README and metadata -> source === 'none'
    const bareRepo = makeMockRepo({
      description: null,
      language: null,
      homepage: null,
      license: null,
    });
    const bareProject = buildEnrichedProject(bareRepo, createIdleReadmeRecord());
    expect(bareProject.summary).toEqual({ value: null, source: 'none' });
    expect(bareProject.technologies).toEqual({ value: [], source: 'none' });
    expect(bareProject.liveDemo).toEqual({ value: null, source: 'none' });
    expect(bareProject.license).toEqual({ value: null, source: 'none' });
  });
});
