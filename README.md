# GitHub Portfolio

A modern, zero-configuration, open-source developer portfolio generator built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

Fork this repository, enable GitHub Pages, and immediately get a polished personal developer website that automatically detects your GitHub account, discovers all of your public repositories, analyzes every `README.md`, and presents your work with rich metadata, live demo links, search, filtering, and sanitized Markdown rendering.

- **100% Static** — Hosted for free on GitHub Pages with no backend or database.
- **Zero Secrets** — Requires no API keys, personal access tokens, registration, or login.
- **Fork-Ready** — Automatically derives the portfolio owner from the deployed GitHub Pages hostname with zero source-code edits.

---

## Live Demo

[https://majidramzi.github.io/github-portfolio/](https://majidramzi.github.io/github-portfolio/)

Once deployed to GitHub Pages, your portfolio is available automatically at:

- **Project Pages:** `https://<username>.github.io/github-portfolio/`
- **User / Organization Pages:** `https://<username>.github.io/`

> Replace `<username>` with your GitHub account name after enabling GitHub Pages.

---

## Screenshots

> Add screenshots of your deployed portfolio (light mode, dark mode, and the project details modal) to `docs/screenshots/` and embed them here:
>
> - Desktop Light Theme (`docs/screenshots/desktop-light.png`)
> - Desktop Dark Theme (`docs/screenshots/desktop-dark.png`)
> - Project Details & Sanitized README Modal (`docs/screenshots/project-details.png`)

---

## Features

- **Automatic GitHub Account Detection** — Works immediately after forking on both Project Pages (`https://<username>.github.io/<repo>/`) and User/Organization Pages (`https://<username>.github.io/`).
- **Complete Repository Discovery** — Retrieves all owned public repositories (including forks by default) with full pagination beyond 100 repositories.
- **Intelligent README Extraction** — Parses repository READMEs to extract introductions, project purpose, key features, technology stack, languages/frameworks, installation requirements, screenshots, live demo links, documentation links, API documentation links, and license info.
- **Explicit Source Provenance** — Clearly distinguishes README-extracted details (`From README`) from GitHub metadata fallbacks (`GitHub Metadata`) and never invents missing fields.
- **Safe Markdown Rendering** — Uses `marked` (with GitHub Flavored Markdown tables, task lists, code blocks, and blockquotes) and `DOMPurify` sanitization, resolving relative image and link paths against each repository's default branch.
- **Instant Local Search & Filtering** — Search across repository names, descriptions, topics, and README content; filter by programming language, topic, Live Demo availability, README presence, and forks; sort by recently updated, stars, alphabetical name, or creation date.
- **Project Details View** — Accessible detail modal synced with URL hash (`#project=<repo>`) for GitHub Pages-compatible deep linking, screenshot lightbox, structured insights, and full rendered README.
- **Cache-First Performance & Rate-Limit Resilience** — Namespaced `localStorage` caching with configurable TTL, progressive lazy README loading with controlled concurrency, `raw.githubusercontent.com` fallback, and graceful cached fallback if GitHub's unauthenticated API rate limit is reached.
- **Polished Responsive UI** — Minimalist developer portfolio design with Light and Dark themes, persistent theme preference, mobile navigation, loading skeletons, accessible keyboard navigation, and dynamic SEO/Open Graph metadata.

---

## Quick Start: Fork & Deploy in 4 Steps

No code editing is required to launch your own portfolio:

1. **Fork the repository** using the **Fork** button at the top right of this repository.
2. **Enable GitHub Pages using GitHub Actions**:
   - Open your forked repository on GitHub.
   - Go to **Settings → Pages**.
   - Under **Build and deployment → Source**, select **GitHub Actions**.
3. **Wait for deployment**:
   - The included workflow (`.github/workflows/deploy.yml`) automatically runs on pushes to `main` or `master` (or trigger it manually from the **Actions** tab via **Run workflow**).
   - It runs all tests, strict TypeScript checks, builds the production bundle, and deploys to GitHub Pages.
4. **Open your own GitHub Pages URL**:
   - Visit `https://<your-username>.github.io/github-portfolio/` (or `https://<your-username>.github.io/` if you renamed the repository to `<your-username>.github.io`).
   - Your profile, statistics, and public repositories will appear automatically.

---

## How Automatic GitHub Account Detection Works

Account resolution is centralized in `src/config/account.ts` and follows strict precedence:

1. **Manual Config Override (`src/config/site.ts`)** — Used only when `githubUsername` is explicitly set (for custom domains).
2. **Build-Time Environment Override (`VITE_GITHUB_USERNAME`)** — Useful for CI custom-domain deployments (GitHub Actions repository variable `GITHUB_USERNAME`) or local development.
3. **Automatic GitHub Pages Hostname Detection** — Inspects `window.location.hostname`:
   - `https://<username>.github.io/github-portfolio/` → detects `<username>` (`project-pages`)
   - `https://<username>.github.io/` → detects `<username>` (`user-pages`)
   - Validates the extracted subdomain against official GitHub username rules and rejects reserved subdomains (such as `www.github.io`).
4. **Clear Configuration Error** — If hosted on a non-GitHub-Pages domain with no override configured, the application displays a clear configuration guide instead of guessing or using a hardcoded account. During local development, that screen also provides a temporary in-session preview input.

The portfolio always shows repositories owned by the account that deployed the site—never the identity of visitors.

---

## How Repository Discovery Works

Repositories are fetched from GitHub's public REST API:

```http
GET https://api.github.com/users/{username}/repos?type=owner&per_page=100&sort=updated&direction=desc
```

- Follows RFC 5988 `Link` headers (`rel="next"`) across all pages until every public repository is retrieved (supports accounts with more than 100 repositories).
- Includes repositories owned by the user (including user-owned forks by default) and defensively excludes repositories owned by other accounts.
- Respects optional exclusions defined in `siteConfig.excludedRepositories`.

---

## How README Parsing Works

For each repository, the application retrieves the README via:

```http
GET https://api.github.com/repos/{owner}/{repo}/readme
```

If the API request fails (for example due to rate limits or transient issues), it automatically falls back to `https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/README.md` (with common filename casing fallbacks). Missing READMEs are handled gracefully and cached without interrupting the rest of the portfolio.

The analyzer (`src/services/readmeAnalyzer.ts`) splits Markdown by headings (ignoring fenced code blocks) and recognizes common heading variations (`About`, `Overview`, `Introduction`, `Description`, `Why`, `Purpose`, `Features`, `Key Features`, `Technologies`, `Tech Stack`, `Built With`, `Installation`, `Getting Started`, `Prerequisites`, `Demo`, `Live Demo`, `Screenshots`, `Documentation`, `API Reference`, `License`) to extract:

- Project introduction & purpose
- Main features
- Technology stack & languages/frameworks
- Installation requirements & command snippet
- Screenshots (ignoring badge images and resolving relative URLs)
- Live Demo URL
- Documentation & API documentation links
- License information

When a README omits a field, the app cleanly falls back to GitHub metadata (repository description, primary language, homepage URL, repository license) and labels the data source transparently. Missing values are omitted rather than invented.

Markdown rendering (`src/services/markdownRenderer.ts`) uses `marked` (GFM) and `DOMPurify` to strip scripts, iframes, event handlers, and dangerous protocols, while rewriting relative images to `raw.githubusercontent.com` and relative links to `github.com/{owner}/{repo}/blob/{branch}/...`.

---

## GitHub API Usage & Rate Limits

This project exclusively calls public unauthenticated GitHub REST API endpoints:

- `GET https://api.github.com/users/{username}`
- `GET https://api.github.com/users/{username}/repos`
- `GET https://api.github.com/repos/{owner}/{repo}/readme`
- Fallback raw content: `https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/README.md`

### Rate Limit Protection

GitHub limits unauthenticated REST API requests to **60 requests per hour per IP address**. To keep the portfolio fast and reliable:

- **Cache-First Loading** — Profile, repositories, and READMEs are cached in `localStorage` with timestamps (default TTL: 60 minutes) and a manual **Refresh** button.
- **Lazy & Controlled Concurrency** — Repositories render immediately; READMEs load progressively as cards enter the viewport (max 2 concurrent requests by default) or on demand when opening project details.
- **Quota Conservation** — Response headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) are tracked continuously. When remaining REST API quota runs low, README lookups automatically shift to `raw.githubusercontent.com`.
- **Graceful Degradation** — On HTTP `403` or `429`, the app displays cached portfolio data when available along with the exact reset time, and uses bounded exponential backoff for transient errors. It never displays a misleading empty repository list during a rate limit.

---

## Technology Stack

- **Framework:** React 19 + TypeScript (strict mode)
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Markdown & Security:** `marked` + `DOMPurify`
- **Dates:** `date-fns`
- **Testing:** Vitest + React Testing Library + `@testing-library/jest-dom` + `jsdom`
- **Deployment:** GitHub Actions + GitHub Pages

---

## Installation & Local Development

### Prerequisites

- Node.js 20 or newer (GitHub Actions deploys with Node.js 22)
- npm 10+

### Setup

```bash
git clone https://github.com/<username>/github-portfolio.git
cd github-portfolio
npm install
```

### Run Locally

Because `localhost` is not a `*.github.io` hostname, you can either pass a GitHub username via environment variable or use the built-in local preview prompt:

```bash
# Option A: Preview a specific GitHub account immediately
VITE_GITHUB_USERNAME=octocat npm run dev

# Option B: Start without an env var and enter any public username in the local preview screen
npm run dev
```

---

## Testing & Production Build

```bash
# Run unit and integration tests (uses mocked GitHub API responses, zero live network calls)
npm test

# Run tests in watch mode
npm run test:watch

# Run strict TypeScript checks
npm run typecheck

# Build production static bundle into ./dist
npm run build

# Preview the built production bundle locally
npm run preview
```

---

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy.yml`, which uses the official GitHub Pages deployment actions:

1. Triggers on pushes to `main` or `master` and manual `workflow_dispatch`.
2. Sets up Node.js 22 and installs dependencies with `npm ci`.
3. Executes `npm test` and `npm run typecheck`.
4. Runs `npm run build` (using relative asset paths `./` so both Project Pages and User/Organization Pages load cleanly without hardcoding a repository path).
5. Uploads `./dist` via `actions/upload-pages-artifact@v3` and deploys via `actions/deploy-pages@v4`.

---

## Custom Domain Configuration

If you attach a custom domain (such as `portfolio.example.com`) to GitHub Pages, the hostname will no longer end with `.github.io`. Configure your username using either method:

### Option 1: GitHub Actions Repository Variable (Recommended)

In your repository on GitHub, navigate to **Settings → Secrets and variables → Actions → Variables** and create:

- **Name:** `GITHUB_USERNAME`
- **Value:** `your-github-username`

Re-run the deploy workflow. This keeps your source files completely clean for upstream updates.

### Option 2: Configuration File (`src/config/site.ts`)

```ts
export const siteConfig: SiteConfig = {
  githubUsername: 'your-github-username',
  siteTitle: '',
  introText: '',
  defaultTheme: 'system',
  excludedRepositories: [],
  cacheTtlMinutes: 60,
  readmeConcurrency: 2,
};
```

---

## Configuration Options (`src/config/site.ts`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `githubUsername` | `string` | `''` | Optional manual GitHub username override for custom domains. Leave empty for automatic GitHub Pages detection. |
| `siteTitle` | `string` | `''` | Optional custom document title. Auto-generated from profile name and username when empty. |
| `introText` | `string` | `''` | Optional extra introductory text rendered below your GitHub bio. |
| `defaultTheme` | `'system' \| 'light' \| 'dark'` | `'system'` | Default color theme before the visitor selects a preference. |
| `excludedRepositories` | `string[]` | `[]` | Case-insensitive list of repository names to hide from the portfolio. |
| `cacheTtlMinutes` | `number` | `60` | Minutes before cached GitHub profile, repository, and README data expire. |
| `readmeConcurrency` | `number` | `2` | Maximum concurrent README requests during progressive loading (clamped to `1–4`). |

---

## Privacy Information

- **Client-Side Only:** All requests go directly from the visitor's browser to GitHub's public endpoints (`api.github.com` and `raw.githubusercontent.com`).
- **No Tracking or Analytics:** No third-party trackers, cookies, or telemetry scripts are included.
- **Local Storage Only:** Browser `localStorage` is used strictly to cache public GitHub responses and remember the visitor's Light/Dark theme preference.
- **No Authentication:** Visitors are never asked to sign in or enter tokens.

---

## Project Structure

```text
github-portfolio/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated test, typecheck, build, and GitHub Pages deploy
├── public/
│   └── favicon.svg                 # Vector favicon
├── src/
│   ├── components/
│   │   ├── ConfigErrorState.tsx    # Clear setup guidance when hostname cannot be resolved
│   │   ├── ErrorState.tsx          # Friendly API, network, 404, and rate-limit error states
│   │   ├── FilterBar.tsx           # Search, language/topic/demo/README/fork filters, sort
│   │   ├── Footer.tsx              # Minimal portfolio footer
│   │   ├── Header.tsx              # Sticky nav, owner badge, refresh, theme toggle, mobile menu
│   │   ├── Hero.tsx                # Developer hero with avatar, bio, metadata, and CTAs
│   │   ├── LoadingSkeleton.tsx     # Accessible skeleton loading states
│   │   ├── ProjectCard.tsx         # Lazy-enriched repository card with source provenance
│   │   ├── ProjectDetailModal.tsx  # Hash-synced modal with insights, gallery, and safe README
│   │   ├── ProjectGrid.tsx         # Responsive project grid and empty states
│   │   ├── RateLimitBanner.tsx     # Cached-data notice with reset window during rate limits
│   │   └── StatsSection.tsx        # Calculated portfolio metrics & language distribution bar
│   ├── config/
│   │   ├── account.ts              # Centralized GitHub Pages / override username resolution
│   │   └── site.ts                 # Fork-friendly optional site configuration
│   ├── hooks/
│   │   ├── usePortfolio.ts         # Cache-first data fetching & controlled README queue
│   │   └── useTheme.ts             # Light/Dark theme persistence
│   ├── services/
│   │   ├── cache.ts                # Namespaced localStorage cache with TTL & stale fallback
│   │   ├── githubApi.ts            # Paginated GitHub REST API client, backoff & rate limits
│   │   ├── markdownRenderer.ts     # marked + DOMPurify renderer with relative URL resolution
│   │   └── readmeAnalyzer.ts       # Heading-aware README parser & metadata provenance builder
│   ├── test/                       # Vitest unit & React Testing Library integration tests
│   ├── types/
│   │   ├── github.ts               # Strict GitHub REST API TypeScript interfaces
│   │   └── portfolio.ts            # Portfolio models, sourced values, filters, and config types
│   ├── utils/
│   │   ├── filters.ts              # Local search, filtering, sorting, and statistics
│   │   ├── format.ts               # date-fns formatters, URL normalization, language colors
│   │   └── seo.ts                  # Dynamic page title, meta description & Open Graph tags
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Contributing

Contributions, bug reports, and improvements are welcome:

1. Fork the repository and create a descriptive feature branch (`git checkout -b feat/improve-readme-parser`).
2. Keep changes strictly typed and avoid hardcoding any personal GitHub username.
3. Add or update unit/integration tests under `src/test/`.
4. Verify everything passes locally before opening a Pull Request:
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```

---

## License

This project is open source and available under the [MIT License](./LICENSE).
