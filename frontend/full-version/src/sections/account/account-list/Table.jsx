import PropTypes from 'prop-types';
import { Fragment } from 'react';

// @mui
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

// @third-party
import { flexRender } from '@tanstack/react-table';

// @project
import RowDetails from './RowDetails';
import Toolbar from './Toolbar';
import MainCard from '@/components/MainCard';
import EmptyTable from '@/components/third-party/table/EmptyTable';
import HeaderCell from '@/components/third-party/table/HeaderCell';

/***************************  TABLE - CARD  ***************************/

export default function TableCard({ table, onDelete, onGlobalSearch }) {
  return (
    <MainCard sx={{ p: 0 }}>
      <Toolbar table={table} onDelete={onDelete} onGlobalSearch={onGlobalSearch} />
      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <HeaderCell key={header.id} header={header} />
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const isItemSelected = table
                  .getSelectedRowModel()
                  .rows.map((item) => item.original.id)
                  .includes(row.original.id);

                return (
                  <Fragment key={row.id}>
                    <TableRow hover selected={isItemSelected}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} {...cell.column.columnDef.meta}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {row.getIsExpanded() && (
                      <TableRow>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                        <TableCell colSpan={row.getVisibleCells().length - 2} sx={{ p: 2.5 }}>
                          <RowDetails data={row.original} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} sx={{ height: 300 }}>
                  <EmptyTable msg="No Data" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {table.getRowModel().rows.length > 0 && (
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', px: { xs: 0.5, sm: 2.5 }, py: 1.5 }}>
          <Pagination count={10} />
        </Stack>
      )}
    </MainCard>
  );
}

TableCard.propTypes = { table: PropTypes.object, onDelete: PropTypes.func, onGlobalSearch: PropTypes.func };
