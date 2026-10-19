'use client';

import * as React from 'react';
import NextLink from 'next/link';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ConfirmDialog from '@/components/feedback/ConfirmDialog';
import { useDeleteCourse } from '@/hooks/useCourses';
import { errorMessage } from '@/lib/api/errorMessage';
import { toast } from '@/store/useToastStore';
import type { Course } from '@/lib/schemas/courses.schema';

/**
 * Row actions for one course: edit, manage modules, delete.
 *
 * It owns the delete mutation and its confirmation rather than taking them as
 * props, so both the table and the grid can drop it in and neither has to know
 * how deletion works. That's the pattern to copy for other resources: the list
 * renders records, a small component like this owns what you can *do* to one.
 */
export default function CourseActions({ course }: { course: Course }) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const deleteCourse = useDeleteCourse();

  const close = () => setAnchorEl(null);

  async function handleDelete() {
    try {
      await deleteCourse.mutateAsync(course.id);
      toast.success(`Obuka „${course.name}” je obrisana.`);
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
        aria-label={`Akcije za obuku ${course.name}`}
        aria-haspopup="menu"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        {/*
          `component={NextLink}` is required on MenuItem and *only* on MenuItem.
          The theme's global `LinkComponent` doesn't reach it: ButtonBase swaps
          in that component only while its root is the default `'button'`, and
          MenuItem overrides the root with `'li'`. Without this, `href` lands on
          an `<li>` and the item silently does nothing when clicked. Safe here
          because this is a Client Component — see the note in `theme.ts`.
        */}
        <MenuItem component={NextLink} href={`/admin/courses/${course.id}`} onClick={close}>
          <ListItemIcon>
            <InsightsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          {/*
            "Pregled" was ambiguous next to "Izmijeni" — every item in this menu
            opens something, so it said nothing about *what*. This page is the
            course's numbers: enrolment, completion, pending submissions.
          */}
          <Typography variant="body2">Statistika obuke</Typography>
        </MenuItem>

        <MenuItem component={NextLink} href={`/admin/courses/${course.id}/edit`} onClick={close}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Izmijeni</Typography>
        </MenuItem>

        <MenuItem component={NextLink} href={`/admin/courses/${course.id}/modules`} onClick={close}>
          <ListItemIcon>
            <ViewModuleOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Moduli</Typography>
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

      <ConfirmDialog
        open={confirmingDelete}
        title="Obrisati obuku?"
        description={
          <>
            Obuka <strong>{course.name}</strong> i sav njen sadržaj — moduli, kvizovi, zadaci i
            datoteke — bit će trajno obrisani. Ova akcija se ne može poništiti.
          </>
        }
        confirmLabel="Obriši obuku"
        pending={deleteCourse.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
