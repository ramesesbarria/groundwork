import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { BuildLoopDiagram } from '@/components/gw/build-loop';
import { StatusPill } from '@/components/gw/status';
import { Shot, WalkClip } from '@/components/gw/walkthrough';
import { Terminal } from '@/components/gw/terminal';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    BuildLoopDiagram,
    StatusPill,
    Terminal,
    WalkClip,
    Shot,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
