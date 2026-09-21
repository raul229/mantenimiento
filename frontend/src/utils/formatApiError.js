export function formatApiError(error) {
  // Return an array of user-facing error messages in Spanish.
  if (!error) return ["Error desconocido"];
  const resp = error.response?.data;

  if (!resp) {
    const base = error.message || "Error desconocido";
    return [translateMessage(base)];
  }

  // If it's a string
  if (typeof resp === 'string') return [translateMessage(resp)];

  // If it's an object, flatten values into individual messages
  try {
    const vals = [];
    for (const key of Object.keys(resp)) {
      const v = resp[key];
      if (Array.isArray(v)) {
        for (const item of v) vals.push(translateMessage(String(item)));
      } else if (typeof v === 'object') {
        vals.push(translateMessage(JSON.stringify(v)));
      } else {
        vals.push(translateMessage(String(v)));
      }
    }
    return vals.length > 0 ? vals : [translateMessage(JSON.stringify(resp))];
  } catch {
    return [translateMessage(JSON.stringify(resp))];
  }
}

// Simple translator for common DRF/axios English phrases -> Spanish. Add more as needed.
function translateMessage(msg) {
  if (!msg) return "Error desconocido";
  const mappings = [
    ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD.", "La fecha tiene un formato inválido. Use YYYY-MM-DD."],
    ["This field may not be null.", "Este campo no puede ser nulo."],
    ["This field is required.", "Este campo es requerido."],
    ["This field may not be blank.", "Este campo no puede estar vacío."],
    ["Invalid input.", "Entrada inválida."],
  ];

  let out = msg;
  for (const [en, es] of mappings) {
    if (out.includes(en)) out = out.replace(en, es);
  }

  return out;
}
