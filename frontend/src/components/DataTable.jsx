import { useMemo } from "react";
import { flexRender } from "@tanstack/react-table";
import { getCoreRowModel, useLegacyTable } from "@tanstack/react-table/legacy";

export function DataTable({ columns, data, loading, onRowClick, selectedId, empty = "Sin registros" }) {
  const columnDefs = useMemo(
    () =>
      columns.map((col, i) => ({
        id: String(col.key || col.accessor || col.header || i),
        accessorKey: col.accessor,
        header: () => (col.headerRender ? col.headerRender() : col.header),
        cell: ({ row }) => (col.render ? col.render(row.original) : row.original[col.accessor]),
      })),
    [columns],
  );

  const table = useLegacyTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, i) => String(row.id ?? i),
  });

  if (loading) {
    return (
      <div className="flex justify-center rounded-box bg-base-100 p-8">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td className="py-8 text-center text-muted" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={`${onRowClick ? "cursor-pointer hover:bg-base-200" : ""} ${selectedId === row.original.id ? "bg-primary/10" : ""}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
