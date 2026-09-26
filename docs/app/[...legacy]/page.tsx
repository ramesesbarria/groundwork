import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asset } from '@/lib/shared';

// The old VitePress site served docs at the root (/concepts/cost). GitHub Pages can't redirect,
// so each old path gets a tiny page that forwards to its new home. The README and npm page link
// to these, so keep them.
const moved: Record<string, string> = {
  why: '/docs/why',
  faq: '/docs/faq',
  glossary: '/docs/glossary',
  'guides/walkthrough': '/docs/guides/walkthrough',
  walkthrough: '/docs/guides/walkthrough',
};
for (const p of [
  'getting-started/installation',
  'getting-started/first-10-minutes',
  'getting-started/approval-modes',
  'concepts/cards-and-phases',
  'concepts/the-build-loop',
  'concepts/evidence-and-approval',
  'concepts/handoff',
  'concepts/right-sizing',
  'concepts/lessons-ledger',
  'concepts/cost',
  'guides/existing-projects',
  'guides/ui-and-animation',
  'guides/decisions',
  'reference/agent-commands',
  'reference/cli',
  'reference/configuration',
  'reference/project-files',
  'adapters/claude-code',
  'adapters/opencode',
  'adapters/other-tools',
]) {
  moved[p] = `/docs/${p}`;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(moved).map((p) => ({ legacy: p.split('/') }));
}

export default async function Legacy({ params }: PageProps<'/[...legacy]'>) {
  const { legacy } = await params;
  const to = moved[legacy.join('/')];
  if (!to) notFound();
  return (
    <main className="page-container flex-1 py-24">
      <meta httpEquiv="refresh" content={`0; url=${asset(to)}`} />
      <link rel="canonical" href={asset(to)} />
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(asset(to))} + location.hash)` }} />
      <p className="font-mono text-sm text-muted">
        This page moved: <Link href={to} className="text-foreground underline underline-offset-4">{to}</Link>
      </p>
    </main>
  );
}
