'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { estimateReadingMinutes, type BlogPost } from '@/lib/blog';
import { formatDate } from '@/lib/format';

const PER_PAGE = 9;

/**
 * Filterable blog list: category pills + search, a featured (newest
 * matching) post, then a paginated 3-column grid of the rest.
 *
 * A Client Component — filtering/pagination are local UI state over data
 * that's already fully loaded (no per-filter network request), so this
 * stays a plain client-side array filter rather than server pagination.
 *
 * Receives all posts as a prop from the (Server Component) blog index
 * page, which keeps metadata/SEO concerns server-side.
 */
export default function BlogList({
  posts,
  categories,
}: {
  posts: BlogPost[];
  categories: string[];
}) {
  const [category, setCategory] = useState<string>('Sve teme');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory = category === 'Sve teme' || post.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q || post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [posts, category, search]);

  const [featured, ...rest] = filtered;
  const pageCount = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const pageItems = rest.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function handleFilterChange(next: string) {
    setCategory(next);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <Stack spacing={5}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
            {['Sve teme', ...categories].map((c) => (
              <Chip
                key={c}
                label={c}
                variant={c === category ? 'filled' : 'outlined'}
                color={c === category ? 'primary' : 'default'}
                onClick={() => handleFilterChange(c)}
              />
            ))}
          </Stack>

          {/* Shorter than the theme's form inputs (paddingBlock 11) so it sits
              level with the chips beside it rather than towering over them. */}
          <TextField
            placeholder="Pretraži članke"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            size="small"
            sx={{
              width: { xs: '100%', md: 280 },
              flexShrink: 0,
              '& .MuiInputBase-input': { py: 0.75 },
            }}
          />
        </Stack>

        <Divider />
      </Stack>

      {!featured ? (
        <Typography color="text.secondary">Nema rezultata za zadanu pretragu.</Typography>
      ) : (
        <>
          <FeaturedPost post={featured} />
          <Divider />

          {pageItems.length > 0 && (
            <Grid container spacing={4}>
              {pageItems.map((post, index) => (
                <Grid key={post.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                  <PostCard post={post} priority={index < 3} />
                </Grid>
              ))}
            </Grid>
          )}

          {pageCount > 1 && (
            <Stack sx={{ alignItems: 'center' }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Grid container spacing={4} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, md: 5 }}>
        {post.image ? (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3 / 2',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Image
              src={post.image.src}
              alt={post.image.alt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 900px) 100vw, 42vw"
              priority
            />
          </Box>
        ) : (
          <Box
            sx={{
              aspectRatio: '3 / 2',
              bgcolor: 'action.hover',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Naslovna fotografija članka
            </Typography>
          </Box>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Stack
          spacing={2}
          component="a"
          href={`/blog/${post.slug}`}
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {post.category && (
              <Chip label={post.category} size="small" color="primary" variant="outlined" />
            )}
            <Typography variant="caption" color="text.secondary">
              {formatDate(post.publishedAt)} · {estimateReadingMinutes(post.content)} MIN
            </Typography>
          </Stack>

          <Typography variant="h4" component="h2">
            {post.title}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {post.excerpt}
          </Typography>

          <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
            Pročitaj članak
          </Typography>
        </Stack>
      </Grid>
    </Grid>
  );
}

function PostCard({ post, priority }: { post: BlogPost; priority: boolean }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea
        href={`/blog/${post.slug}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            bgcolor: 'action.hover',
          }}
        >
          {post.image ? (
            <Image
              src={post.image.src}
              alt={post.image.alt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              priority={priority}
            />
          ) : (
            <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Slika članka
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack spacing={1} sx={{ p: 3, flex: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {post.category && (
              <Chip label={post.category} size="small" color="primary" variant="outlined" />
            )}
            <Typography variant="caption" color="text.secondary">
              {estimateReadingMinutes(post.content)} MIN
            </Typography>
          </Stack>

          <Typography variant="h6" component="h3">
            {post.title}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {post.excerpt}
          </Typography>

          <Divider sx={{ mt: 1 }} />

          <Typography variant="caption" color="text.secondary">
            {formatDate(post.publishedAt)}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
