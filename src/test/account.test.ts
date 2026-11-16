import { describe, expect, it } from 'vitest';
import {
  detectUsernameFromGitHubPagesHostname,
  isValidGitHubUsername,
  resolveGitHubAccount,
} from '../config/account';
import { siteConfig } from '../config/site';

describe('GitHub account automatic detection', () => {
  it('has no hardcoded username in default siteConfig', () => {
    expect(siteConfig.githubUsername).toBe('');
  });

  it('validates GitHub username syntax strictly', () => {
    expect(isValidGitHubUsername('octocat')).toBe(true);
    expect(isValidGitHubUsername('alice-builder-42')).toBe(true);
    expect(isValidGitHubUsername('a')).toBe(true);

    expect(isValidGitHubUsername('')).toBe(false);
    expect(isValidGitHubUsername('-leading-hyphen')).toBe(false);
    expect(isValidGitHubUsername('trailing-hyphen-')).toBe(false);
    expect(isValidGitHubUsername('double--hyphen')).toBe(false);
    expect(isValidGitHubUsername('has_underscore')).toBe(false);
    expect(isValidGitHubUsername('a'.repeat(40))).toBe(false);
  });

  it('detects username from GitHub Project Pages URL (https://<user>.github.io/github-portfolio/)', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'alice-builder.github.io',
        pathname: '/github-portfolio/',
      },
      config: { githubUsername: '' },
      envUsername: '',
    });

    expect(result).toEqual({
      status: 'resolved',
      username: 'alice-builder',
      source: 'github-pages',
      deploymentType: 'project-pages',
      repositoryName: 'github-portfolio',
      hostname: 'alice-builder.github.io',
    });
  });

  it('detects username from User or Organization Pages URL (https://<user>.github.io/)', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'marco-systems.github.io',
        pathname: '/',
      },
      config: { githubUsername: '' },
      envUsername: '',
    });

    expect(result).toEqual({
      status: 'resolved',
      username: 'marco-systems',
      source: 'github-pages',
      deploymentType: 'user-pages',
      repositoryName: null,
      hostname: 'marco-systems.github.io',
    });
  });

  it('handles renamed forked repositories and uppercase hostnames automatically', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'Dev-Forker.GITHUB.IO.',
        pathname: '/my-developer-site/',
      },
      config: { githubUsername: '' },
      envUsername: '',
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.username).toBe('dev-forker');
      expect(result.deploymentType).toBe('project-pages');
      expect(result.repositoryName).toBe('my-developer-site');
    }
  });

  it('rejects reserved github.io subdomains and multi-level subdomains', () => {
    expect(detectUsernameFromGitHubPagesHostname('www.github.io')).toBeNull();
    expect(detectUsernameFromGitHubPagesHostname('pages.github.io')).toBeNull();
    expect(detectUsernameFromGitHubPagesHostname('sub.alice.github.io')).toBeNull();
    expect(detectUsernameFromGitHubPagesHostname('github.io')).toBeNull();
  });

  it('supports manual override in siteConfig for custom domains', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'portfolio.example.com',
        pathname: '/',
      },
      config: { githubUsername: 'custom-domain-dev' },
      envUsername: '',
    });

    expect(result).toEqual({
      status: 'resolved',
      username: 'custom-domain-dev',
      source: 'config',
      deploymentType: 'custom-domain',
      repositoryName: null,
      hostname: 'portfolio.example.com',
    });
  });

  it('supports VITE_GITHUB_USERNAME environment override', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'localhost',
        pathname: '/',
      },
      config: { githubUsername: '' },
      envUsername: 'env-account',
    });

    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.username).toBe('env-account');
      expect(result.source).toBe('env');
      expect(result.deploymentType).toBe('local');
    }
  });

  it('returns a clear configuration error on custom domains without override', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'example.com',
        pathname: '/',
      },
      config: { githubUsername: '' },
      envUsername: '',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('unresolvable-hostname');
      expect(result.hostname).toBe('example.com');
      expect(result.message).toMatch(/GitHub Pages|src\/config\/site\.ts/i);
    }
  });

  it('returns an invalid-username error when manual config contains an invalid username', () => {
    const result = resolveGitHubAccount({
      location: {
        hostname: 'example.com',
        pathname: '/',
      },
      config: { githubUsername: 'bad--username' },
      envUsername: '',
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('invalid-username');
      expect(result.attemptedValue).toBe('bad--username');
    }
  });
});
