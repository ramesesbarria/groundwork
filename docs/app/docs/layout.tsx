import Link from 'next/link';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

// The docs keep their own sidebar; the site's top links (Proof, Receipts) stay on the home layout,
// so the only way out of the docs is back home.
export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      links={[]}
      sidebar={{
        banner: (
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-[13px] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
          >
            <span aria-hidden>←</span> Back to home
          </Link>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
