'use client';
import { useMemo, useState } from 'react';

// @mui
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @third-party
import { getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';

// @project
import AvatarGroup from '@/components/third-party/table/AvatarGroup';

import { Table, ActionCell } from '@/sections/setting/pricing/pricing-plan-table';
import { pricingPlanData } from '@/sections/setting/pricing/pricing-plan-table/pricing-plan-data';

/***************************  COMPONENT - TABLE  ***************************/

export default function PricingPlanTable() {
  const [data, setData] = useState([...pricingPlanData]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        id: 'pricing-plan',
        accessorKey: 'pricing-plan',
        header: 'Pricing Plan',
        cell: (info) => (
          <Stack sx={{ gap: 0.25 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2">{info.row.original.plan.title}</Typography>
              {info.row.original.plan.label && <Chip label={info.row.original.plan.label} color="primary" size="small" />}
            </Stack>
            <Typography variant="caption" sx={{ color: 'grey.700' }}>
              {info.row.original.plan.description}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'pricing-model',
        accessorKey: 'pricing-model',
        header: 'Pricing Model',
        cell: (info) => (
          <Stack sx={{ gap: 0.25 }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2">{info.row.original.model.title}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'grey.700' }}>
              {info.row.original.model.description}
            </Typography>
          </Stack>
        )
      },
      {
        id: 'subscription',
        accessorKey: 'subscription',
        header: 'Subscriber',
        cell: ({ row }) => <AvatarGroup list={row.original.users} max={5} />,
        meta: { className: 'cell-right' }
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          switch (getValue()) {
            case 'published':
              return <Chip label="Published" color="success" />;
            case 'custom-plan':
              return <Chip label="Custom Plan" color="warning" />;
            default:
              return <Chip label="Published" color="success" />;
          }
        }
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
    console.log('Pricing plan deleted', data);
  };

  // Global filter search
  const onGlobalSearch = (globalFilter) => {
    setGlobalFilter(globalFilter);
  };

  return <Table table={table} onGlobalSearch={onGlobalSearch} />;
}
