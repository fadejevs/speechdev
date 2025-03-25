'use client';
import { useMemo, useState } from 'react';

// @mui
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// @third-party
import { getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';

// @project
import Table from './analytics-behavior-table/Table';
import ActionCell from './analytics-behavior-table/ActionCell';
import { analyticsBehaviorTableData } from './analytics-behavior-table/behavior-table-data';
import Profile from '@/components/Profile';

/***************************  COMPONENT - TABLE  ***************************/

export default function AnalyticsBehaviorTable() {
  const [data, setData] = useState([...analyticsBehaviorTableData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        id: 'user',
        accessorKey: 'user',
        header: 'User',
        cell: ({ row }) => (
          <Profile
            {...{
              ...row.original.user,
              avatar: { src: row.original.user.src },
              title: row.original.user.name,
              sx: { gap: 1.5 }
            }}
          />
        )
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => (
          <Typography variant="body2" color="text.secondary">
            {info.row.original.amount} USD
          </Typography>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          switch (getValue()) {
            case 'success':
              return <Chip label="Success" color="success" />;
            case 'cancel':
              return <Chip label="Cancel" color="error" />;
            default:
              return <Chip label="Success" color="success" />;
          }
        }
      },
      {
        id: 'date',
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'start' }}>
            <Typography variant="body2" color="text.secondary">
              {info.row.original.dateTime.date}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {info.row.original.dateTime.time}
            </Typography>
          </Box>
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
    console.log('User deleted', data);
  };

  // Global filter search
  const onGlobalSearch = (globalFilter) => {
    setGlobalFilter(globalFilter);
  };

  return <Table table={table} onGlobalSearch={onGlobalSearch} />;
}
