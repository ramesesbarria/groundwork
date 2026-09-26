import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, repoUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="font-mono text-[15px] font-semibold tracking-tight">
          <span className="text-muted">~/</span>
          {appName.toLowerCase()}
        </span>
      ),
    },
    links: [
      { text: 'Docs', url: '/docs', active: 'nested-url' },
      { text: 'Proof', url: '/proof' },
      { text: 'Quickstart', url: '/quickstart' },
    ],
    githubUrl: repoUrl,
  };
}
