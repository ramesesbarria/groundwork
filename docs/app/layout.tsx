import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Provider } from '@/components/provider';
import { asset } from '@/lib/shared';
import './global.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://ramesesbarria.github.io/groundwork/'),
  title: { default: 'Groundwork', template: '%s · Groundwork' },
  description:
    'Project memory for coding agents: any session, tool or model resumes where the last one stopped. A handoff stamped against git, a map, decisions, lessons and a journal, in your repo, for Claude Code, OpenCode, Codex, Cursor, Gemini CLI and any AI coding tool.',
  icons: { icon: asset('/favicon.svg') },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
