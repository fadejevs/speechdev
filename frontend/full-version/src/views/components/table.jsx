'use client';
import { useMemo, useState } from 'react';

// @mui
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

// @third-party
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';

// @project
import Profile from '@/components/Profile';
import LinearProgressWithLabel, { LinearProgressType } from '@/components/progress/LinearProgressWithLabel';
import AvatarGroup from '@/components/third-party/table/AvatarGroup';
import TagList from '@/components/third-party/table/TagList';

import { Table, ActionCell } from '@/sections/components/table';
import defaultData from '@/sections/components/table/table-data.json';

// @assets
import { IconCancel, IconChevronDown, IconChevronRight } from '@tabler/icons-react';

/***************************  COMPONENT - TABLE  ***************************/

export default function TableComponent() {
  const [data, setData] = useState([...defaultData]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            inputProps={{ 'aria-label': 'Select all rows' }}
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler()
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            size="small"
            inputProps={{ 'aria-label': 'Select row' }}
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler()
            }}
          />
        ),
        meta: { className: 'cell-center', style: { width: 40 } }
      },
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <IconButton
              color={row.getIsExpanded() ? 'primary' : 'secondary'}
              onClick={row.getToggleExpandedHandler()}
              size="small"
              aria-label="expand"
            >
              {row.getIsExpanded() ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
            </IconButton>
          ) : (
            <IconButton color="secondary" size="small" disabled aria-label="cancel">
              <IconCancel />
            </IconButton>
          );
        },
        meta: { className: 'cell-center', style: { width: 40 } }
      },
      {
        id: 'switch',
        cell: ({ row }) => (
          <Switch
            size="small"
            checked={!row.original.isBlocked}
            onChange={() => onBlock(row.original.id, !row.original.isBlocked)}
            inputProps={{ 'aria-label': 'block switch' }}
            sx={{ p: 0 }}
          />
        ),
        meta: { className: 'cell-center', style: { width: 40 } }
      },
      {
        id: 'profile',
        accessorKey: 'profile',
        header: 'Profile',
        cell: ({ row }) => (
          <Profile
            {...{
              ...row.original.profile,
              avatar: { src: row.original.profile.src },
              title: row.original.profile.name,
              caption: row.original.profile.username,
              label: <Chip label="Label" color="primary" size="small" />,
              sx: { gap: 1.5 }
            }}
          />
        )
      },
      {
        id: 'roles',
        accessorKey: 'roles',
        header: 'Roles',
        cell: (info) => <TagList list={info.row.original.roles} />
      },
      {
        id: 'lastActivity',
        accessorKey: 'lastActivity',
        header: 'Last Activity',
        cell: (info) => (
          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="body2">{info.row.original.lastActivity.title}</Typography>
            <Typography variant="caption" color="grey.700">
              {info.row.original.lastActivity.date}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'users',
        accessorKey: 'users',
        header: 'Users',
        cell: ({ row }) => <AvatarGroup list={row.original.users} max={4} />,
        meta: { className: 'cell-right' }
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => (
          <Typography variant="body2" color="text.secondary">
            {info.row.original.date}
          </Typography>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          switch (getValue()) {
            case 'Active':
              return <Chip label="Active" color="success" />;
            case 'Pending':
              return <Chip label="Pending" color="warning" />;
            case 'Reported':
              return <Chip label="Reported" color="error" />;
            case 'Blocked':
              return <Chip label="Blocked" color="primary" />;
            default:
              return <Chip label="Active" color="success" />;
          }
        }
      },
      {
        id: 'progress',
        header: 'Profile Progress',
        cell: ({ row }) => (
          <LinearProgressWithLabel
            value={row.original.progress}
            sx={{ height: 8 }}
            type={LinearProgressType.LIGHT}
            aria-label="Profile Progress"
          />
        ),
        accessorKey: 'progress'
      },
      {
        id: 'action',
        cell: ({ row }) => (
          <ActionCell row={row.original} onDelete={(id) => onDeleteRow(id)} onBlock={(id, checked) => onBlock(id, checked)} />
        )
      }
    ], // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, sorting, globalFilter },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true
  });

  // Delete selected rows by checkbox selection
  const onDelete = () => {
    if (!table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()) return;
    const selectedRow = table.getSelectedRowModel().rows.map((row) => row.original.id);
    setData((prev) => prev.filter((item) => !selectedRow.includes(item.id)));
    table.resetRowSelection();
  };

  // Delete single row by id from dialog
  const onDeleteRow = (id) => {
    setData((prev) => prev.filter((item) => item.id !== id));
    console.log('User deleted', data);
  };

  // Block/Unblock single row by id from dialog and switch
  const onBlock = (id, checked) => {
    setData((prev) =>
      prev.map((item) => {
        if (item.id === id) item.isBlocked = checked;
        return item;
      })
    );
  };

  // Global filter search
  const onGlobalSearch = (globalFilter) => {
    setGlobalFilter(globalFilter);
  };

  return <Table table={table} onDelete={onDelete} onGlobalSearch={onGlobalSearch} />;
}
