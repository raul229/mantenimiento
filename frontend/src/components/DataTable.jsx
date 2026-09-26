import { useEffect, useMemo, useState } from "react";
import { flexRender } from "@tanstack/react-table";
import { getCoreRowModel, getPaginationRowModel, useLegacyTable } from "@tanstack/react-table/legacy";

const TAMANOS = [10, 20, 50];

export function DataTable({
  columns,
  data,
  loading,
  onRowClick,
  selectedId,
  empty = "Sin registros",
  pageSize = 10,
}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const dataKey = data.map((row) => row.id ?? "").join(",");

  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [dataKey]);

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
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { pagination },
    getRowId: (row, i) => String(row.id ?? i),
  });

  const total = data.length;
  const pageCount = table.getPageCount();
  const { pageIndex, pageSize: size } = table.getState().pagination;
  const desde = total === 0 ? 0 : pageIndex * size + 1;
  const hasta = Math.min(total, (pageIndex + 1) * size);

  if (loading) {
    return (
      <div className="flex justify-center rounded-box bg-base-100 p-8">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-box bg-base-100 shadow-sm">
      <div className="overflow-x-auto">
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
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 px-4 py-3">
          <p className="text-sm text-muted">
            {desde}–{hasta} de {total}
          </p>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Anterior
            </button>
            <span className="btn btn-sm join-item btn-ghost pointer-events-none">
              {pageIndex + 1} / {Math.max(pageCount, 1)}
            </span>
            <button
              type="button"
              className="btn btn-sm join-item"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Siguiente
            </button>
          </div>
          <select
            className="select select-bordered select-sm w-24"
            value={size}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            aria-label="Filas por página"
          >
            {TAMANOS.map((n) => (
              <option key={n} value={n}>{n} / pág.</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
