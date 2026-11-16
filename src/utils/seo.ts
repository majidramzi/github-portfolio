import type { GitHubUser } from '../types/github';

interface SeoOptions {
  username?: string;
  profile?: GitHubUser | null;
  customTitle?: string;
  repoCount?: number;
}

function setMetaTag(selector: string, attribute: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function updateDocumentSeo({ username, profile, customTitle, repoCount }: SeoOptions): void {
  if (typeof document === 'undefined') {
    return;
  }

  const displayName = profile?.name?.trim();
  const handle = profile?.login ?? username;

  const title = customTitle?.trim()
    ? customTitle.trim()
    : displayName && handle
      ? `${displayName} (@${handle}) — GitHub Portfolio`
      : handle
        ? `@${handle} — GitHub Portfolio`
        : 'GitHub Portfolio';

  const bio = profile?.bio?.trim();
  const repoPhrase =
    typeof repoCount === 'number' && repoCount > 0
      ? `Explore ${repoCount} public ${repoCount === 1 ? 'repository' : 'repositories'}`
      : 'Explore public GitHub repositories';

  const description = bio
    ? `${bio} — ${repoPhrase}${handle ? ` by @${handle}` : ''}.`
    : handle
      ? `${repoPhrase}, technologies, README documentation, and live demos by ${displayName ? `${displayName} (@${handle})` : `@${handle}`}.`
      : 'Automatically generated developer portfolio showcasing public GitHub repositories, extracted README insights, technologies, and live demos.';

  document.title = title;

  setMetaTag('meta[name="description"]', 'name', 'description', description);
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  if (profile?.avatar_url) {
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', profile.avatar_url);
  }
}
