import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Groundwork';
// Must match basePath in next.config.mjs. Next adds it to <Link> and next/image, but not to plain
// <video>/<img> src or fetch URLs, so those go through asset().
export const basePath = '/groundwork';
export const asset = (path: string) => `${basePath}${path}`;

export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'ramesesbarria',
  repo: 'groundwork',
  branch: 'main',
};
export const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
export const blobUrl = (path: string) => `${repoUrl}/blob/${gitConfig.branch}/${path}`;

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
