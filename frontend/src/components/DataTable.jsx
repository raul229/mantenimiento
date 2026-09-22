export function DataTable({ columns, data, loading, onRowClick, selectedId, empty = "Sin registros" }) {
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
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.header}>{col.headerRender ? col.headerRender() : col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td className="py-8 text-center text-muted" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? "cursor-pointer hover:bg-base-200" : ""} ${selectedId === row.id ? "bg-primary/10" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key || col.header}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
