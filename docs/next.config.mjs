import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// Deployed as a GitHub Pages project site at /groundwork/. If the site moves to a custom domain,
// set basePath to '' here and in lib/shared.ts.
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  basePath: '/groundwork',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default withMDX(config);
