import { siteConfig } from './site';
import type { AccountResolution, DeploymentType, SiteConfig } from '../types/portfolio';

/**
 * GitHub username rules:
 * - 1 to 39 characters
 * - Alphanumeric characters or single hyphens
 * - Cannot begin or end with a hyphen
 * - Cannot contain consecutive hyphens
 */
const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

/**
 * Subdomains under github.io that do not correspond to user/org portfolios.
 */
const RESERVED_GITHUB_PAGES_SUBDOMAINS = new Set(['www', 'pages', 'status', 'api', 'docs']);

export function isValidGitHubUsername(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return GITHUB_USERNAME_REGEX.test(trimmed);
}

export interface LocationSnapshot {
  hostname: string;
  pathname: string;
}

export interface ResolveAccountOptions {
  location?: LocationSnapshot;
  config?: SiteConfig;
  envUsername?: string;
  previewUsername?: string;
}

/**
 * Derive project repository slug from a GitHub Pages pathname if present.
 * E.g. `/github-portfolio/` -> `github-portfolio`, `/` -> `null`.
 */
function extractProjectRepositoryFromPath(pathname: string): string | null {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '');
  if (!cleaned) {
    return null;
  }
  const firstSegment = cleaned.split('/')[0]?.trim();
  if (!firstSegment || firstSegment === 'index.html') {
    return null;
  }
  return firstSegment;
}

/**
 * Extract the GitHub account name from standard GitHub Pages hostnames:
 * - Project Pages: https://<username>.github.io/<repository>/
 * - User or Organization Pages: https://<username>.github.io/
 */
export function detectUsernameFromGitHubPagesHostname(hostname: string): string | null {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized.endsWith('.github.io')) {
    return null;
  }

  const suffix = '.github.io';
  const subdomain = normalized.slice(0, normalized.length - suffix.length);

  // Must be a single DNS label directly beneath github.io
  if (!subdomain || subdomain.includes('.')) {
    return null;
  }

  if (RESERVED_GITHUB_PAGES_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  if (!isValidGitHubUsername(subdomain)) {
    return null;
  }

  return subdomain;
}

function getDefaultLocation(): LocationSnapshot {
  if (typeof window !== 'undefined' && window.location) {
    return {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
    };
  }
  return { hostname: '', pathname: '/' };
}

function getDefaultEnvUsername(): string | undefined {
  const raw = import.meta.env?.VITE_GITHUB_USERNAME;
  return typeof raw === 'string' ? raw : undefined;
}

/**
 * Centralized GitHub account resolution.
 *
 * Precedence:
 * 1. Explicit manual override in `src/config/site.ts` (`githubUsername`) — for custom domains.
 * 2. Build-time environment override (`VITE_GITHUB_USERNAME`) — for CI/custom domains/local dev.
 * 3. Automatic GitHub Pages hostname detection (`<username>.github.io`).
 * 4. Optional local preview override (only used interactively on non-configured hosts).
 * 5. Clear configuration error if no valid GitHub account can be resolved.
 */
export function resolveGitHubAccount(options: ResolveAccountOptions = {}): AccountResolution {
  const loc = options.location ?? getDefaultLocation();
  const cfg = options.config ?? siteConfig;
  const envUser =
    options.envUsername !== undefined ? options.envUsername : getDefaultEnvUsername();
  const hostname = loc.hostname.trim();
  const repoFromPath = extractProjectRepositoryFromPath(loc.pathname);

  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '' ||
    hostname.endsWith('.local');

  // 1. Manual configuration override (src/config/site.ts)
  const configuredUsername = cfg.githubUsername?.trim() ?? '';
  if (configuredUsername) {
    if (!isValidGitHubUsername(configuredUsername)) {
      return {
        status: 'error',
        reason: 'invalid-username',
        hostname,
        attemptedValue: configuredUsername,
        message: `The configured GitHub username "${configuredUsername}" in src/config/site.ts is not a valid GitHub account name.`,
      };
    }

    const pagesHostUser = detectUsernameFromGitHubPagesHostname(hostname);
    const deploymentType: DeploymentType = pagesHostUser
      ? repoFromPath
        ? 'project-pages'
        : 'user-pages'
      : isLocalHost
        ? 'local'
        : 'custom-domain';

    return {
      status: 'resolved',
      username: configuredUsername,
      source: 'config',
      deploymentType,
      repositoryName: repoFromPath,
      hostname,
    };
  }

  // 2. Build-time environment override (VITE_GITHUB_USERNAME)
  const trimmedEnvUser = envUser?.trim() ?? '';
  if (trimmedEnvUser) {
    if (!isValidGitHubUsername(trimmedEnvUser)) {
      return {
        status: 'error',
        reason: 'invalid-username',
        hostname,
        attemptedValue: trimmedEnvUser,
        message: `The environment variable VITE_GITHUB_USERNAME="${trimmedEnvUser}" is not a valid GitHub account name.`,
      };
    }

    const pagesHostUser = detectUsernameFromGitHubPagesHostname(hostname);
    const deploymentType: DeploymentType = pagesHostUser
      ? repoFromPath
        ? 'project-pages'
        : 'user-pages'
      : isLocalHost
        ? 'local'
        : 'custom-domain';

    return {
      status: 'resolved',
      username: trimmedEnvUser,
      source: 'env',
      deploymentType,
      repositoryName: repoFromPath,
      hostname,
    };
  }

  // 3. Automatic GitHub Pages hostname detection
  const detectedFromPages = detectUsernameFromGitHubPagesHostname(hostname);
  if (detectedFromPages) {
    const deploymentType: DeploymentType = repoFromPath ? 'project-pages' : 'user-pages';
    return {
      status: 'resolved',
      username: detectedFromPages,
      source: 'github-pages',
      deploymentType,
      repositoryName: repoFromPath,
      hostname,
    };
  }

  // 4. Optional local preview mode (only when automatic detection did not match)
  const previewUser = options.previewUsername?.trim() ?? '';
  if (previewUser) {
    if (!isValidGitHubUsername(previewUser)) {
      return {
        status: 'error',
        reason: 'invalid-username',
        hostname,
        attemptedValue: previewUser,
        message: `"${previewUser}" is not a valid GitHub username. Usernames may only contain alphanumeric characters and single hyphens.`,
      };
    }

    return {
      status: 'resolved',
      username: previewUser,
      source: 'preview',
      deploymentType: isLocalHost ? 'local' : 'custom-domain',
      repositoryName: null,
      hostname,
    };
  }

  // 5. Clear configuration error
  return {
    status: 'error',
    reason: 'unresolvable-hostname',
    hostname: hostname || 'unknown-host',
    message:
      'Could not automatically detect a GitHub account from the current URL. Deploy this repository to GitHub Pages (https://<username>.github.io/) for zero-config automatic detection, or configure a custom domain override in src/config/site.ts.',
  };
}
