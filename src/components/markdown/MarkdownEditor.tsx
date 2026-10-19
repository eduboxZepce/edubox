'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { usePaintedColorScheme } from '@/theme/usePaintedColorScheme';
import MarkdownContent from './MarkdownContent';
import { imageFilesFrom, useImagePaste } from './useImagePaste';
import '@uiw/react-md-editor/markdown-editor.css';

/**
 * A Markdown editor with a toolbar, for people who do not know Markdown.
 *
 * ## What it stores
 *
 * Raw Markdown, always. The toolbar inserts syntax into the text rather than
 * maintaining a separate document model, so `value` is exactly what goes into
 * the database and exactly what `<MarkdownContent>` renders. Nothing is
 * converted on the way in or out.
 *
 * That is why this is a Markdown editor and not a WYSIWYG one: a rich-text
 * editor like TipTap is HTML-native, so storing Markdown would mean converting
 * both ways and losing fidelity on every round trip. Keeping the stored form
 * portable also matters because the blog is earmarked to move to `.md` files on
 * disk if it grows.
 *
 * ## The preview is ours, not the library's
 *
 * `components.preview` overrides `@uiw/react-md-editor`'s built-in renderer
 * with `<MarkdownContent>` — the same component the blog and the legal pages
 * use. So the preview pane is not an approximation of the published page, it is
 * the published page's own code path.
 *
 * Two things follow. An author cannot be misled by a preview that styles things
 * differently from the live site. And the library's renderer, which allows raw
 * HTML by default and would need `rehype-sanitize` bolted on, never runs at
 * all — the security question is answered by not having a second renderer
 * rather than by configuring one.
 *
 * ## Images are pasted, dropped, or neither
 *
 * `allowImages` turns on paste and drop handling: the file is uploaded and
 * `![alt](url)` is appended. It is opt-in because the two callers differ — a
 * newsletter is emailed, so its images must live at a public URL a mail client
 * can fetch anonymously, while the legal documents are rendered in-app and have
 * no such need. Turning it on where it is not wanted would put an upload
 * affordance on a screen with nowhere sensible to put the file.
 *
 * ## Why the dynamic import
 *
 * The editor touches `window` at module scope, so it must never reach a server
 * render. `ssr: false` is required, not a bundle-size optimisation — without it
 * the page 500s on the server.
 */
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" height={420} />,
});

export default function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  height = 460,
  helperText,
  allowImages = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  height?: number;
  helperText?: string;
  /** Enables paste/drop image upload. See the note above. */
  allowImages?: boolean;
}) {
  const colorMode = usePaintedColorScheme();
  const { uploadImage, uploading } = useImagePaste();

  /*
   * `onChange` is read through a ref inside the handlers below. Without it the
   * paste listener would close over the `value` from the render that attached
   * it, so pasting a second image would overwrite the first — the classic stale
   * closure, and one that only shows up on the second attempt.
   */
  const latest = React.useRef({ value, onChange });
  // Updated in an effect, not during render — writing a ref while rendering is
  // a tearing hazard under concurrent rendering, and lint rejects it. An effect
  // with no dependency array runs after every commit, which is early enough:
  // the handlers below only ever fire in response to a user event, long after
  // paint.
  React.useEffect(() => {
    latest.current = { value, onChange };
  });

  const insertImages = React.useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const url = await uploadImage(file);
        if (!url) continue;
        const current = latest.current.value;
        const separator = current.endsWith('\n') || current === '' ? '' : '\n\n';
        latest.current.onChange(`${current}${separator}![${file.name}](${url})\n`);
      }
    },
    [uploadImage],
  );

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (!allowImages || disabled) return;
      const files = imageFilesFrom(event.nativeEvent as ClipboardEvent);
      if (files.length === 0) return;
      // Only once there is actually an image: a plain text paste must go
      // through untouched.
      event.preventDefault();
      void insertImages(files);
    },
    [allowImages, disabled, insertImages],
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      if (!allowImages || disabled) return;
      const files = imageFilesFrom(event.nativeEvent as DragEvent);
      if (files.length === 0) return;
      event.preventDefault();
      void insertImages(files);
    },
    [allowImages, disabled, insertImages],
  );

  /*
   * The library themes itself from a `data-color-mode` attribute rather than
   * from our theme, so it has to be told — and it is told the scheme the page
   * is *painted* in, not MUI's mode. Those differ whenever a page is held light
   * (the `themeSwitch` flag off, for one), and following MUI's mode is what
   * made the editor render black on a light page.
   */

  return (
    <Box>
      <Box
        data-color-mode={colorMode}
        onPaste={handlePaste}
        onDrop={handleDrop}
        // Without this the browser navigates away to the dropped file.
        onDragOver={allowImages ? (event) => event.preventDefault() : undefined}
        sx={{
          // Match the app's inputs rather than the library's own chrome.
          '& .w-md-editor': {
            borderRadius: 1.5,
            border: 1,
            borderColor: 'divider',
            boxShadow: 'none',
            backgroundColor: 'background.paper',
          },
          '& .w-md-editor-toolbar': {
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            backgroundColor: 'action.hover',
          },
          // The preview pane is our own renderer, so strip the library's
          // typography reset and let MUI's styles through untouched.
          '& .w-md-editor-preview': { boxShadow: 'none', padding: 16 },
          '& .wmde-markdown': { background: 'transparent', fontFamily: 'inherit' },
          ...(disabled ? { opacity: 0.6, pointerEvents: 'none' } : null),
        }}
      >
        <MDEditor
          value={value}
          // The library hands back `string | undefined`; an empty document is
          // `''`, not "no value", and passing undefined upward would make the
          // field look uncontrolled.
          onChange={(next) => onChange(next ?? '')}
          height={height}
          // Toolbar + editor + live preview, which is the arrangement that
          // makes this usable without knowing the syntax.
          preview="live"
          components={{
            preview: (source) => <MarkdownContent content={source} />,
          }}
          textareaProps={{ disabled }}
        />
      </Box>

      {uploading ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">
            Slika se otprema…
          </Typography>
        </Stack>
      ) : null}

      {helperText ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
