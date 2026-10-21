import Link from 'next/link';
import { asset } from '@/lib/shared';

// A docs page that moved. GitHub Pages can't redirect, so the old URL forwards in the browser.
export function Moved({ to }: { to: string }) {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${asset(to)}`} />
      <link rel="canonical" href={asset(to)} />
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${JSON.stringify(asset(to))} + location.hash)` }} />
      <p>
        This page moved: <Link href={to}>{to}</Link>
      </p>
    </>
  );
}
