import { Clip } from './clip';
import { Source } from './source';
import { Terminal } from './terminal';
import { asset, blobUrl } from '@/lib/shared';

// A walkthrough clip in a terminal frame, captioned with a word-for-word quote from the phase 1
// main chat and a link to the line it starts on (?plain=1 makes GitHub number the lines).
export function WalkClip({ file, quote, after, line }: { file: string; quote: string; after?: string; line: number }) {
  return (
    <figure className="not-prose my-6">
      <Terminal title={`opencode — ${file.replace('.mp4', '')}`}>
        <Clip src={asset(`/clips/${file}`)} label={quote} />
      </Terminal>
      <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-fd-muted-foreground">
        <span>
          <span className="font-mono text-fd-foreground">“{quote}”</span>
          {after && <> — {after}</>}
        </span>
        <Source href={`${blobUrl('transcripts/phase-1/main/transcript.md')}?plain=1#L${line}`}>transcript L{line}</Source>
      </figcaption>
    </figure>
  );
}

// A screenshot in a terminal frame. A plain <img>, so MDX's image handling (next/image) and the
// base path don't get in the way.
export function Shot({ src, alt, title }: { src: string; alt: string; title: string }) {
  return (
    <figure className="not-prose my-6">
      <Terminal title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(src)} alt={alt} className="block w-full" />
      </Terminal>
    </figure>
  );
}
