import { notFound } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Image from 'next/image';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MarkdownContent from '@/components/markdown/MarkdownContent';
import { estimateReadingMinutes, type BlogPost } from '@/lib/blog';
import { getBlogPost, listBlogSlugs } from '@/lib/server/blog';
import { formatDate } from '@/lib/format';
import JsonLd from '@/components/seo/JsonLd';
import { absoluteUrl, organizationJsonLd, pageMetadata } from '@/lib/seo';

/**
 * One blog post.
 *
 * A Server Component reading `blog_posts` (migration 0035) through the
 * cookie-free public client, so a post is static HTML with no client
 * JavaScript — the point of having a blog at all.
 *
 * ## ISR
 *
 * `generateStaticParams` pre-renders every post at build time. A post written
 * since is rendered on its first visit and cached; admin edits mark the pages
 * stale through `revalidateBlog()`, with `revalidate` as an hourly fallback.
 *
 * ## An unknown slug is a soft 404, knowingly
 *
 * This used to be `dynamicParams = false` over a fixed array, which made an
 * unknown slug a genuine 404 status. Posts are no longer fixed, so new slugs
 * must be allowed — and then `notFound()` runs inside the `loading.tsx`
 * boundaries (this route's and `/blog`'s), after the response has committed as
 * 200. Next marks it `noindex`, so it stays out of search results. Measured,
 * not assumed: removing this route's `loading.tsx` alone does not change it,
 * since `/blog/loading.tsx` wraps the segment too. Same trade as
 * `/courses/[slug]`; a real status would need the check in `proxy.ts`, a
 * database read on every blog request.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listBlogSlugs()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const post = await getBlogPost(slug);

  if (!post) notFound();

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: 'article',
    publishedTime: post.publishedAt,
    image: post.image ? { url: post.image.src, alt: post.image.alt } : null,
  });
}

/**
 * Article structured data. Lets a search engine show the post's date and image
 * in results, and ties it to the site's organisation as publisher.
 */
function blogPostingJsonLd(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    inLanguage: 'bs',
    url,
    mainEntityOfPage: url,
    ...(post.image && { image: absoluteUrl(post.image.src) }),
    ...(post.category && { articleSection: post.category }),
    author: organizationJsonLd(),
    publisher: organizationJsonLd(),
  };
}

export default async function BlogPostPage(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const post = await getBlogPost(slug);

  //An unknown slug is genuine 404, handled by `app/not-found.tsx`. Rendering
  //an empty article instead would leave a URL that looks real and says
  //nothing.
  if (!post) notFound();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 7 } }}>
      <JsonLd data={blogPostingJsonLd(post)} />
      <Stack spacing={0.75} sx={{ mb: 1 }}>
        <Button
          href="/blog"
          size="small"
          color="inherit"
          startIcon={<ArrowBackIcon fontSize="small" />}
          sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
        >
          Svi tekstovi
        </Button>
      </Stack>

      <Stack spacing={2} sx={{ mb: 4 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {post.category && (
            <Chip label={post.category} size="small" color="primary" variant="outlined" />
          )}
          <Typography variant="caption" color="text.secondary">
            {/* <time> gives crawlers the machine-readable date behind the formatted one. */}
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{' '}
            {estimateReadingMinutes(post.content)} MIN
          </Typography>
        </Stack>

        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 30, md: 42 } }}>
          {post.title}
        </Typography>

        <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 400 }}>
          {post.excerpt}
        </Typography>
      </Stack>

      {post.image ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 5,
          }}
        >
          <Image
            src={post.image.src}
            alt={post.image.alt}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 900px) 100vw, 800px"
            priority
          />
        </Box>
      ) : null}

      {/* 
        A Server Component, so the whole article is parsed here and arrives in
        the initial HTML. That is the point of having a blog at all - a 
        crawler must not have to run JavaScript to read it.
        */}
      <MarkdownContent content={post.content} />

      <Divider sx={{ my: 5 }} />

      <Stack direction="row">
        <Button href="/blog" color="inherit" startIcon={<ArrowBackIcon />}>
          Svi tekstovi
        </Button>
      </Stack>
    </Container>
  );
}
