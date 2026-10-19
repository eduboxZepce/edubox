'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import BlogPostActions from './BlogPostActions';
import { blogImageUrl } from '@/lib/blog';
import { formatDate } from '@/lib/format';
import type { BlogPostSummary } from '@/lib/schemas/blog.schema';

/** The admin list of posts, newest first. */
export default function BlogPostTable({ posts }: { posts: BlogPostSummary[] }) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Članak</TableCell>
            <TableCell>Tema</TableCell>
            <TableCell>Objavljen</TableCell>
            <TableCell align="right" sx={{ width: 56 }} />
          </TableRow>
        </TableHead>

        <TableBody>
          {posts.map((post) => {
            const imageUrl = blogImageUrl(post.image_path);

            return (
              <TableRow key={post.id} hover>
                <TableCell sx={{ maxWidth: 520 }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'action.hover',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'text.disabled',
                      }}
                    >
                      {imageUrl ? (
                        // A plain <img>, like FormImageUpload's preview: a small,
                        // non-LCP admin thumbnail.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ImageOutlinedIcon fontSize="small" />
                      )}
                    </Box>

                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Link
                        href={`/admin/blog/${post.id}`}
                        variant="body2"
                        underline="hover"
                        sx={{ fontWeight: 600, color: 'text.primary' }}
                      >
                        {post.title}
                      </Link>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        /blog/{post.slug}
                      </Typography>
                    </Stack>
                  </Stack>
                </TableCell>

                <TableCell>
                  {post.category ? (
                    <Chip label={post.category} size="small" variant="outlined" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {formatDate(post.published_at)}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  <BlogPostActions post={post} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
