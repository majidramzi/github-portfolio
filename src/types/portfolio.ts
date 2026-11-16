import type { GitHubApiErrorCode, GitHubRepository, RateLimitInfo } from './github';

export type FieldSource = 'readme' | 'metadata' | 'none';

export interface SourcedValue<T> {
  value: T;
  source: FieldSource;
}

export interface ExtractedLink {
  label: string;
  url: string;
}

export interface ExtractedScreenshot {
  alt: string;
  url: string;
}

export interface ReadmeExtraction {
  introduction: string | null;
  purpose: string | null;
  features: string[];
  techStack: string[];
  languagesAndFrameworks: string[];
  installationRequirements: string[];
  installationSnippet: string | null;
  screenshots: ExtractedScreenshot[];
  liveDemoUrl: string | null;
  documentationLinks: ExtractedLink[];
  apiDocumentationLinks: ExtractedLink[];
  licenseInfo: string | null;
  plainText: string;
}

export type ReadmeLoadStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';

export type ReadmeFetchOrigin = 'api' | 'raw-fallback' | 'none';

export interface ReadmeRecord {
  status: ReadmeLoadStatus;
  rawMarkdown: string | null;
  readmePath: string;
  origin: ReadmeFetchOrigin;
  extracted: ReadmeExtraction | null;
  fetchedAt: number | null;
  errorMessage: string | null;
}

export interface EnrichedProject {
  repo: GitHubRepository;
  readme: ReadmeRecord;
  /** Resolved summary: README introduction first, fallback to repo.description */
  summary: SourcedValue<string | null>;
  /** Resolved technologies: README tech stack first, fallback to repo.language */
  technologies: SourcedValue<string[]>;
  /** Resolved Live Demo URL: README liveDemoUrl first, fallback to repo.homepage */
  liveDemo: SourcedValue<string | null>;
  /** Resolved license: README licenseInfo first, fallback to repo.license */
  license: SourcedValue<string | null>;
}

export interface LanguageStat {
  language: string;
  count: number;
  percentage: number;
}

export interface PortfolioStats {
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  languageCount: number;
  liveDemoCount: number;
  languages: LanguageStat[];
}

export type SortOption = 'updated' | 'stars' | 'name' | 'created';

export interface FilterState {
  search: string;
  language: string;
  topic: string;
  onlyLiveDemo: boolean;
  onlyWithReadme: boolean;
  hideForks: boolean;
  sortBy: SortOption;
}

export type AccountSource = 'config' | 'env' | 'github-pages' | 'preview';
export type DeploymentType = 'project-pages' | 'user-pages' | 'custom-domain' | 'local';

export type AccountResolution =
  | {
      status: 'resolved';
      username: string;
      source: AccountSource;
      deploymentType: DeploymentType;
      repositoryName: string | null;
      hostname: string;
    }
  | {
      status: 'error';
      reason: 'unresolvable-hostname' | 'invalid-username';
      message: string;
      hostname: string;
      attemptedValue?: string;
    };

export interface PortfolioError {
  code: GitHubApiErrorCode;
  title: string;
  message: string;
  rateLimit?: RateLimitInfo;
}

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface SiteConfig {
  /**
   * Optional manual GitHub username override.
   * Leave empty ('') to automatically detect the repository owner from GitHub Pages.
   * Only required when hosting on a custom domain without GitHub Pages hostname detection.
   */
  githubUsername?: string;
  /** Optional custom site title. When empty, generated automatically from the detected account. */
  siteTitle?: string;
  /** Optional custom introductory sentence displayed in the hero section. */
  introText?: string;
  /** Default color theme before the visitor chooses one ('system' | 'light' | 'dark'). */
  defaultTheme?: ThemePreference;
  /** Optional list of repository names to hide from the portfolio (case-insensitive). */
  excludedRepositories?: string[];
  /** Cache expiration window in minutes (default: 60). */
  cacheTtlMinutes?: number;
  /** Maximum concurrent README requests during progressive loading (default: 2). */
  readmeConcurrency?: number;
}
