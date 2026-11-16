export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  type: 'User' | 'Organization' | string;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepoOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string | null;
  url: string | null;
}

export interface GitHubRepository {
  id: number;
  node_id?: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubRepoOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  url?: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects?: boolean;
  has_downloads?: boolean;
  has_wiki?: boolean;
  has_pages?: boolean;
  forks_count: number;
  archived: boolean;
  disabled?: boolean;
  open_issues_count: number;
  license: GitHubLicense | null;
  topics: string[];
  visibility?: string;
  default_branch: string;
}

export interface GitHubReadmeApiResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file';
  content: string;
  encoding: 'base64' | string;
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  resetAt: number | null; // Unix timestamp in milliseconds
  isLimited: boolean;
}

export type GitHubApiErrorCode =
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INVALID_USERNAME'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'BAD_RESPONSE';

export class GitHubApiError extends Error {
  public readonly code: GitHubApiErrorCode;
  public readonly status?: number;
  public readonly rateLimit?: RateLimitInfo;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: {
      code: GitHubApiErrorCode;
      status?: number;
      rateLimit?: RateLimitInfo;
      retryAfterMs?: number;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = 'GitHubApiError';
    this.code = options.code;
    this.status = options.status;
    this.rateLimit = options.rateLimit;
    this.retryAfterMs = options.retryAfterMs;
  }
}
