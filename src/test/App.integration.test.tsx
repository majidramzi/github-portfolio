import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { PortfolioCache } from '../services/cache';
import {
  ALICE_READMES,
  ALICE_REPOS,
  ALICE_USER,
  encodeUtf8ToBase64,
  MARCO_READMES,
  MARCO_REPOS,
  MARCO_USER,
} from './fixtures';

function installMockGitHubApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    const jsonHeaders = {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '52',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
    };

    if (url === 'https://api.github.com/users/alice-builder') {
      return new Response(JSON.stringify(ALICE_USER), { status: 200, headers: jsonHeaders });
    }
    if (url.startsWith('https://api.github.com/users/alice-builder/repos')) {
      return new Response(JSON.stringify(ALICE_REPOS), { status: 200, headers: jsonHeaders });
    }
    if (url.startsWith('https://api.github.com/repos/alice-builder/')) {
      const repoName = url.split('/')[5] ?? '';
      const md = ALICE_READMES[repoName];
      if (md) {
        return new Response(
          JSON.stringify({
            name: 'README.md',
            path: 'README.md',
            encoding: 'base64',
            content: encodeUtf8ToBase64(md),
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (url === 'https://api.github.com/users/marco-systems') {
      return new Response(JSON.stringify(MARCO_USER), { status: 200, headers: jsonHeaders });
    }
    if (url.startsWith('https://api.github.com/users/marco-systems/repos')) {
      return new Response(JSON.stringify(MARCO_REPOS), { status: 200, headers: jsonHeaders });
    }
    if (url.startsWith('https://api.github.com/repos/marco-systems/')) {
      const repoName = url.split('/')[5] ?? '';
      const md = MARCO_READMES[repoName];
      if (md) {
        return new Response(
          JSON.stringify({
            name: 'README.md',
            path: 'README.md',
            encoding: 'base64',
            content: encodeUtf8ToBase64(md),
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    return new Response('Not Found', { status: 404 });
  });
}

describe('GitHub Portfolio App integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-detects Account 1 on GitHub Project Pages, filters by README content, and opens project details modal', async () => {
    installMockGitHubApi();
    const user = userEvent.setup();
    const cache = new PortfolioCache(60_000);

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'alice-builder.github.io', pathname: '/github-portfolio/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    // Profile and dynamic document title load automatically for alice-builder
    expect(await screen.findByRole('heading', { name: 'Alice Builder' })).toBeInTheDocument();
    expect(document.title).toBe('Alice Builder (@alice-builder) — GitHub Portfolio');
    expect(screen.getByText('Nordic Cloud Labs')).toBeInTheDocument();
    expect(screen.getByText('Helsinki, Finland')).toBeInTheDocument();

    // All 3 owned repositories (including fork) render
    expect(screen.getByRole('button', { name: 'realtime-canvas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'edge-cache-cli' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'awesome-forked-lib' })).toBeInTheDocument();

    // Wait for README analysis to enrich realtime-canvas
    await waitFor(() => {
      expect(screen.getByText(/sub-50ms CRDT synchronization/i)).toBeInTheDocument();
    });

    // Search locally by README-only term ("CRDT")
    const searchInput = screen.getByLabelText(/search repositories/i);
    await user.type(searchInput, 'CRDT');

    expect(screen.getByRole('button', { name: 'realtime-canvas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'edge-cache-cli' })).not.toBeInTheDocument();

    // Clear filters restores all projects
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByRole('button', { name: 'edge-cache-cli' })).toBeInTheDocument();

    // Open Project Details modal
    await user.click(screen.getByRole('button', { name: 'realtime-canvas' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'realtime-canvas' })).toBeInTheDocument();
    expect(within(dialog).getAllByText('React 19').length).toBeGreaterThanOrEqual(2);
    expect(
      within(dialog).getAllByText(/Multiplayer cursors powered by WebSockets/i).length
    ).toBeGreaterThanOrEqual(2);
    const liveDemoLinks = within(dialog).getAllByRole('link', { name: /live demo/i });
    expect(liveDemoLinks[0]).toHaveAttribute('href', 'https://canvas-demo.example.dev/');

    // Close modal with close button
    await user.click(within(dialog).getByRole('button', { name: /close project details/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a clear rate-limit error state (not an empty portfolio) when rate-limited with no cache', async () => {
    const cache = new PortfolioCache(60_000);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 1800),
        },
      })
    );

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'alice-builder.github.io', pathname: '/github-portfolio/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    expect(
      await screen.findByRole('heading', { name: /GitHub API Rate Limit Reached/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/No public repositories found/i)).not.toBeInTheDocument();
  });

  it('persists light and dark theme preference and allows local preview on custom hostnames', async () => {
    installMockGitHubApi();
    const user = userEvent.setup();
    const cache = new PortfolioCache(60_000);

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'localhost', pathname: '/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    // Toggle dark theme and confirm persistence
    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('github-portfolio:theme')).toBe('dark');

    // Use local preview input on unconfigured localhost to preview Marco's account
    const input = screen.getByLabelText(/GitHub username to preview locally/i);
    await user.type(input, 'marco-systems');
    await user.click(screen.getByRole('button', { name: /Preview Portfolio/i }));

    expect(await screen.findByRole('heading', { name: 'Marco Systems' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'telemetry-ring' })).toBeInTheDocument();
  });

  it('automatically adapts to Account 2 when forked and deployed on User Pages', async () => {
    installMockGitHubApi();
    const cache = new PortfolioCache(60_000);

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'marco-systems.github.io', pathname: '/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Marco Systems' })).toBeInTheDocument();
    expect(document.title).toBe('Marco Systems (@marco-systems) — GitHub Portfolio');
    expect(screen.getByRole('button', { name: 'telemetry-ring' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'llvm-ir-viewer' })).toBeInTheDocument();
    // Account 1 data must never appear
    expect(screen.queryByText('Alice Builder')).not.toBeInTheDocument();
  });

  it('displays cached portfolio data with a friendly notice when GitHub API rate limit is hit', async () => {
    const cache = new PortfolioCache(60_000);
    const pastTime = Date.now() - 120_000;
    // Seed expired cached snapshot so refresh triggers API call that hits 403 rate limit
    cache.set('alice-builder', 'profile', ALICE_USER, 1_000, pastTime);
    cache.set('alice-builder', 'repos', ALICE_REPOS, 1_000, pastTime);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 1800),
        },
      })
    );

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'alice-builder.github.io', pathname: '/github-portfolio/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    // Should NOT render empty portfolio — should show cached data + friendly rate limit banner
    expect(await screen.findByRole('heading', { name: 'Alice Builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'realtime-canvas' })).toBeInTheDocument();
    expect(screen.getByText(/GitHub API rate limit reached/i)).toBeInTheDocument();
  });

  it('shows a clear configuration error on unresolvable hostnames without hardcoded fallback', async () => {
    const cache = new PortfolioCache(60_000);

    render(
      <App
        cache={cache}
        accountOptions={{
          location: { hostname: 'portfolio.custom-domain.example', pathname: '/' },
          config: { githubUsername: '' },
          envUsername: '',
        }}
      />
    );

    expect(
      screen.getByRole('heading', { name: /GitHub Account Could Not Be Detected/i })
    ).toBeInTheDocument();
    expect(screen.getByText('portfolio.custom-domain.example')).toBeInTheDocument();
  });
});
