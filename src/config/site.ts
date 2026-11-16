import type { SiteConfig } from '../types/portfolio';

/**
 * Fork-friendly portfolio configuration.
 *
 * Default behavior requires ZERO edits after forking:
 * When deployed to GitHub Pages (https://<username>.github.io/<repo>/ or
 * https://<username>.github.io/), the portfolio owner is detected automatically
 * from the hostname.
 *
 * Custom domain? Set `githubUsername` below (or configure the repository variable
 * `GITHUB_USERNAME` in GitHub Actions) and leave everything else as desired.
 */
export const siteConfig: SiteConfig = {
  githubUsername: '',
  siteTitle: '',
  introText: '',
  defaultTheme: 'system',
  excludedRepositories: [],
  cacheTtlMinutes: 60,
  readmeConcurrency: 2,
};
