import type { GitHubRepository, GitHubUser } from '../types/github';

export function makeMockUser(overrides: Partial<GitHubUser> = {}): GitHubUser {
  const login = overrides.login ?? 'alice-builder';
  return {
    id: 1001,
    login,
    name: 'Alice Builder',
    avatar_url: `https://avatars.githubusercontent.com/u/1001?v=4`,
    html_url: `https://github.com/${login}`,
    bio: 'Staff full-stack engineer building developer tools and AI systems.',
    company: '@OpenForge',
    blog: 'https://alicebuilder.dev',
    location: 'Helsinki, Finland',
    email: null,
    hireable: true,
    twitter_username: null,
    public_repos: 3,
    public_gists: 2,
    followers: 140,
    following: 28,
    type: 'User',
    created_at: '2020-01-15T10:00:00Z',
    updated_at: '2026-10-01T12:00:00Z',
    ...overrides,
  };
}

export function makeMockRepo(overrides: Partial<GitHubRepository> = {}): GitHubRepository {
  const ownerLogin = overrides.owner?.login ?? 'alice-builder';
  const name = overrides.name ?? 'vector-search-ui';
  return {
    id: overrides.id ?? Math.floor(Math.random() * 100_000) + 1,
    name,
    full_name: `${ownerLogin}/${name}`,
    private: false,
    owner: {
      login: ownerLogin,
      id: 1001,
      avatar_url: 'https://avatars.githubusercontent.com/u/1001?v=4',
      html_url: `https://github.com/${ownerLogin}`,
      type: 'User',
      ...overrides.owner,
    },
    html_url: `https://github.com/${ownerLogin}/${name}`,
    description: 'Interactive vector similarity search interface.',
    fork: false,
    created_at: '2025-03-10T09:00:00Z',
    updated_at: '2026-11-10T15:30:00Z',
    pushed_at: '2026-11-10T15:30:00Z',
    homepage: null,
    size: 1200,
    stargazers_count: 42,
    watchers_count: 42,
    language: 'TypeScript',
    has_issues: true,
    forks_count: 7,
    archived: false,
    open_issues_count: 2,
    license: {
      key: 'mit',
      name: 'MIT License',
      spdx_id: 'MIT',
      url: 'https://api.github.com/licenses/mit',
    },
    topics: ['react', 'typescript', 'search'],
    default_branch: 'main',
    ...overrides,
  };
}

export const ALICE_USER: GitHubUser = makeMockUser({
  id: 1001,
  login: 'alice-builder',
  name: 'Alice Builder',
  bio: 'Distributed systems and frontend tooling engineer.',
  company: 'Nordic Cloud Labs',
  location: 'Helsinki, Finland',
  blog: 'alicebuilder.dev',
  public_repos: 3,
});

export const ALICE_REPOS: GitHubRepository[] = [
  makeMockRepo({
    id: 101,
    name: 'realtime-canvas',
    description: 'Collaborative diagramming web application.',
    language: 'TypeScript',
    stargazers_count: 128,
    forks_count: 19,
    open_issues_count: 4,
    topics: ['canvas', 'collaboration', 'typescript'],
    homepage: null,
    updated_at: '2026-11-12T10:00:00Z',
    created_at: '2025-01-12T10:00:00Z',
    owner: {
      login: 'alice-builder',
      id: 1001,
      avatar_url: ALICE_USER.avatar_url,
      html_url: ALICE_USER.html_url,
      type: 'User',
    },
  }),
  makeMockRepo({
    id: 102,
    name: 'edge-cache-cli',
    description: 'Zero-dependency command line inspector for HTTP cache headers.',
    language: 'Go',
    stargazers_count: 64,
    forks_count: 8,
    open_issues_count: 1,
    topics: ['cli', 'http', 'caching'],
    homepage: 'https://edge-cache.example.org',
    updated_at: '2026-10-20T08:00:00Z',
    created_at: '2024-06-05T08:00:00Z',
    owner: {
      login: 'alice-builder',
      id: 1001,
      avatar_url: ALICE_USER.avatar_url,
      html_url: ALICE_USER.html_url,
      type: 'User',
    },
  }),
  makeMockRepo({
    id: 103,
    name: 'awesome-forked-lib',
    description: null,
    language: 'Python',
    stargazers_count: 5,
    forks_count: 1,
    open_issues_count: 0,
    fork: true,
    archived: false,
    topics: ['python'],
    homepage: null,
    updated_at: '2026-09-01T12:00:00Z',
    created_at: '2026-08-01T12:00:00Z',
    license: null,
    owner: {
      login: 'alice-builder',
      id: 1001,
      avatar_url: ALICE_USER.avatar_url,
      html_url: ALICE_USER.html_url,
      type: 'User',
    },
  }),
];

export const ALICE_READMES: Record<string, string> = {
  'realtime-canvas': `# Realtime Canvas

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

## Overview

Realtime Canvas enables engineering teams to sketch architecture diagrams together with sub-50ms CRDT synchronization.

## Why

Existing whiteboards struggled with large system topology diagrams and offline editing reliability.

## Key Features

- Multiplayer cursors powered by WebSockets and CRDT state merging
- Offline-first persistence with automatic conflict resolution
- Instant SVG and PNG diagram export

## Tech Stack

- **React 19** — Declarative UI rendering
- **TypeScript** — End-to-end static type safety
- **Tailwind CSS** — Responsive utility styling
- **WebSockets** — Low-latency sync transport

## Installation

### Prerequisites

- Node.js 20 or newer
- npm 10+

\`\`\`bash
npm install
npm run dev
\`\`\`

## Live Demo

Try the hosted app at [Live Demo](https://canvas-demo.example.dev).

## Screenshots

![Workspace Editor](./docs/editor-preview.png)

## Documentation

- [User Guide](./docs/guide.md)

## API Reference

- [Sync Protocol API](https://canvas-demo.example.dev/api-docs)

## License

MIT License
`,
  'edge-cache-cli': `# Edge Cache CLI

Inspect Cache-Control, ETag, and Vary headers directly from your terminal with clear diagnostic tables.

## Features

- Colorized HTTP cache header inspection
- JSON output mode for CI pipelines
`,
};

export const MARCO_USER: GitHubUser = makeMockUser({
  id: 2002,
  login: 'marco-systems',
  name: 'Marco Systems',
  bio: 'Rust compiler tools and embedded telemetry pipelines.',
  company: null,
  location: 'Zurich, Switzerland',
  blog: '',
  public_repos: 2,
});

export const MARCO_REPOS: GitHubRepository[] = [
  makeMockRepo({
    id: 201,
    name: 'telemetry-ring',
    description: 'Lock-free ring buffer for embedded sensor telemetry.',
    language: 'Rust',
    stargazers_count: 310,
    forks_count: 29,
    open_issues_count: 3,
    topics: ['rust', 'embedded', 'telemetry'],
    homepage: 'https://telemetry-ring.example.io',
    updated_at: '2026-11-14T11:00:00Z',
    created_at: '2025-05-01T11:00:00Z',
    owner: {
      login: 'marco-systems',
      id: 2002,
      avatar_url: MARCO_USER.avatar_url,
      html_url: MARCO_USER.html_url,
      type: 'User',
    },
  }),
  makeMockRepo({
    id: 202,
    name: 'llvm-ir-viewer',
    description: 'Browser-based LLVM IR control flow graph visualizer.',
    language: 'TypeScript',
    stargazers_count: 85,
    forks_count: 11,
    open_issues_count: 0,
    topics: ['llvm', 'compilers'],
    homepage: null,
    updated_at: '2026-10-05T09:00:00Z',
    created_at: '2025-08-19T09:00:00Z',
    owner: {
      login: 'marco-systems',
      id: 2002,
      avatar_url: MARCO_USER.avatar_url,
      html_url: MARCO_USER.html_url,
      type: 'User',
    },
  }),
];

export const MARCO_READMES: Record<string, string> = {
  'telemetry-ring': `# Telemetry Ring

A no_std lock-free ring buffer designed for deterministic microsecond telemetry ingestion on ARM Cortex-M microcontrollers.

## Built With

- Rust
- Cargo

## Features

- Zero heap allocations
- Deterministic O(1) push and pop operations
`,
};

export function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
