export function CrudTable({ columns, data, onEdit, onDelete, loading }) {
  if (loading) {
    return <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md text-primary" /></div>;
  }

  return (
    <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.header}>{col.header}</th>
            ))}
            {(onEdit || onDelete) && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              {columns.map((col) => (
                <td key={col.key || col.header}>
                  {col.render ? col.render(item) : item[col.accessor]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="flex flex-wrap gap-2">
                  {onEdit && (
                    <button type="button" className="btn btn-warning btn-sm" onClick={() => onEdit(item)}>
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className="btn btn-error btn-sm" onClick={() => onDelete(item.id)}>
                      Eliminar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
