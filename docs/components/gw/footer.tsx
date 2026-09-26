import Link from 'next/link';
import { repoUrl } from '@/lib/shared';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="page-container flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-xs">MIT licensed · © Rameses Barria</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
                    <Link href="/proof" className="hover:text-foreground">Proof</Link>
          <Link href="/quickstart" className="hover:text-foreground">Quickstart</Link>
                    <a href={repoUrl} className="hover:text-foreground">GitHub</a>
          <a href="https://www.npmjs.com/package/groundwork-ai" className="hover:text-foreground">npm</a>
        </nav>
      </div>
    </footer>
  );
}
