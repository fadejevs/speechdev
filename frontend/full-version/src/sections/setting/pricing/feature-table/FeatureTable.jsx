'use client';
import { useMemo, useState } from 'react';

// @mui
import { useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @third-party
import { getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';

// @project
import { featureTable } from './features-data';
import DynamicIcon from '@/components/DynamicIcon';
import { Table, ActionCell } from '@/sections/setting/pricing/feature-table';

//@type

/***************************  COMPONENT - TABLE  ***************************/

export default function TableComponent() {
  const theme = useTheme();

  const [data, setData] = useState([...featureTable]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const iconSize = 16;
  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => <Typography variant="subtitle2">{info.row.original.name}</Typography>
      },
      {
        id: 'basic',
        accessorKey: 'basic',
        header: 'Basic',
        cell: (info) => (
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: iconSize, height: iconSize }}>
              <DynamicIcon
                name={info.row.original.basic.icons}
                color={info.row.original.basic.isAvailable ? theme.palette.success.main : theme.palette.grey[600]}
                size={iconSize}
              />
            </Box>
            <Typography variant="body2">{info.row.original.basic.title}</Typography>
          </Stack>
        )
      },
      {
        id: 'starter',
        accessorKey: 'starter',
        header: 'Starter',
        cell: (info) => (
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: iconSize, height: iconSize }}>
              <DynamicIcon
                name={info.row.original.starter.icons}
                color={info.row.original.starter.isAvailable ? theme.palette.success.main : theme.palette.grey[600]}
                size={iconSize}
              />
            </Box>
            <Typography variant="body2">{info.row.original.starter.title}</Typography>
          </Stack>
        )
      },
      {
        id: 'enterprise',
        accessorKey: 'enterprise',
        header: 'Enterprise',
        cell: (info) => (
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ width: iconSize, height: iconSize }}>
              <DynamicIcon
                name={info.row.original.enterprise.icons}
                color={info.row.original.enterprise.isAvailable ? theme.palette.success.main : theme.palette.grey[600]}
                size={iconSize}
              />
            </Box>
            <Typography variant="body2">{info.row.original.enterprise.title}</Typography>
          </Stack>
        )
      },
      {
        id: 'action',
        cell: ({ row }) => <ActionCell row={row.original} onDelete={(id) => onDeleteRow(id)} />
      }
    ], // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true
  });

  // Delete single row by id from dialog
  const onDeleteRow = (id) => {
    setData((prev) => prev.filter((item) => item.id !== id));
    console.log('Feature deleted', data);
  };

  // Global filter search
  const onGlobalSearch = (globalFilter) => {
    setGlobalFilter(globalFilter);
  };

  return <Table table={table} onGlobalSearch={onGlobalSearch} />;
}
