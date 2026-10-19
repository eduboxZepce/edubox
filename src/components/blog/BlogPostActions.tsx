'use client';

import * as React from 'react';
import NextLink from 'next/link';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useDeleteBlogPost } from '@/hooks/useBlogPosts';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { BlogPostSummary } from '@/lib/schemas/blog.schema';

/**
 * Row actions for one post: open the public page, edit, delete. Owns the delete
 * mutation and its confirmation, the way `CourseActions` does.
 */
export default function BlogPostActions({ post }: { post: BlogPostSummary }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const deletePost = useDeleteBlogPost();

  const close = () => setAnchorEl(null);

  async function handleDelete() {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success(`Članak „${post.title}” je obrisan.`);
      setConfirmingDelete(false);
    } catch (error) {
      // The dialog stays open so the admin can retry or cancel deliberately.
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label={`Akcije za članak ${post.title}`}
        aria-haspopup="menu"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        {/* `component={NextLink}` is required on MenuItem — see CourseActions. */}
        <MenuItem component={NextLink} href={`/admin/blog/${post.id}`} onClick={close}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Izmijeni</Typography>
        </MenuItem>

        <MenuItem
          component={NextLink}
          href={`/blog/${post.slug}`}
          target="_blank"
          rel="noopener"
          onClick={close}
        >
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Otvori članak</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => {
            close();
            setConfirmingDelete(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography variant="body2">Obriši</Typography>
        </MenuItem>
      </Menu>

      <BlogPostDeleteDialog
        post={post}
        open={confirmingDelete}
        pending={deletePost.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

/** The confirmation, shared with the edit page's delete button. */
export function BlogPostDeleteDialog({
  post,
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  post: Pick<BlogPostSummary, 'title'>;
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Obrisati članak?"
      description={
        <>
          Članak <strong>{post.title}</strong> i njegove slike bit će trajno obrisani, a njegova
          adresa će vraćati „stranica nije pronađena”. Ova akcija se ne može poništiti.
        </>
      }
      confirmLabel="Obriši članak"
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
