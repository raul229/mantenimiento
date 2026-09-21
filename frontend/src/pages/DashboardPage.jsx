import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Scale, Truck, Users, Wallet } from "lucide-react";
import { DashboardService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ESTADO_VIAJE, ESTADO_FLOTA, formatKg, formatMoney, monthISO } from "@/utils/format";
import { inputClass, selectClass } from "@/components/Modal";

export function DashboardPage() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(monthISO());
  const [ciudad, setCiudad] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    DashboardService.get({ mes, ciudad: ciudad || undefined })
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [mes, ciudad]);

  const residueTotal = useMemo(
    () => (data?.residuos || []).reduce((s, r) => s + Number(r.peso || 0), 0),
    [data],
  );

  if (loading && !data) {
    return (
      <>
        <Topbar title="Panel operativo" />
        <div className="p-6 text-muted">Cargando dashboard…</div>
      </>
    );
  }

  const d = data || {};

  return (
    <>
      <Topbar title="Panel operativo">
        <select className={`${selectClass} w-44`} value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
          <option value="">Todas las ciudades</option>
          {(d.ciudades || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <input type="month" className={`${inputClass} w-40`} value={mes} onChange={(e) => setMes(e.target.value)} />
      </Topbar>
      <div className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Recojo del mes"
            value={formatKg(d.kg_mes)}
            hint={d.kg_mes_delta_pct == null ? "Sin período previo" : `${d.kg_mes_delta_pct > 0 ? "+" : ""}${d.kg_mes_delta_pct}% vs mes anterior`}
            icon={<Scale size={18} />}
          />
          <KpiCard
            title="Viajes hoy"
            value={d.viajes_hoy ?? 0}
            hint={`${d.viajes_en_curso ?? 0} en curso`}
            icon={<Truck size={18} />}
          />
          <KpiCard
            title="Clientes activos"
            value={d.clientes_activos ?? 0}
            hint={`${d.clientes_publicos ?? 0} públicos / ${d.clientes_privados ?? 0} privados`}
            icon={<Users size={18} />}
          />
          <KpiCard
            title="Caja chica"
            value={formatMoney(d.caja_chica)}
            hint="Gastos de viaje del mes"
            icon={<Wallet size={18} />}
            accent="bg-rose-50 text-rose-600"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title mb-2 text-base">Residuos por tipo (kg)</h2>
              <div className="flex items-center gap-6">
                <div className="h-52 w-52">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={d.residuos || []} dataKey="peso" nameKey="nombre" innerRadius={55} outerRadius={80}>
                        {(d.residuos || []).map((r) => (
                          <Cell key={r.codigo} fill={r.color || "#0f9d8e"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {(d.residuos || []).map((r) => (
                    <li key={r.codigo} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        {r.nombre}
                      </span>
                      <span className="font-medium">{formatKg(r.peso)}</span>
                    </li>
                  ))}
                  {!(d.residuos || []).length && <li className="text-muted">Sin datos de residuos</li>}
                  {residueTotal > 0 && (
                    <li className="border-t border-base-300 pt-2 font-semibold">{formatKg(residueTotal)}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title mb-2 text-base">Recojo por ciudad</h2>
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={d.recojo_por_ciudad || []} layout="vertical" margin={{ left: 24, right: 12 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="ciudad" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatKg(v)} />
                    <Bar dataKey="peso" fill="#0f766e" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="card-title text-base">Viajes de hoy</h2>
                <button type="button" className="btn btn-link btn-sm text-primary no-underline" onClick={() => navigate("/viajes")}>
                  Ver todos →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Ruta</th>
                      <th>Ciudad</th>
                      <th>Vehículo</th>
                      <th>Kg</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.viajes_hoy_list || []).map((v) => (
                      <tr key={v.id}>
                        <td className="font-medium">{v.ruta}</td>
                        <td>{v.ciudad || "—"}</td>
                        <td>{v.vehiculo || "—"}</td>
                        <td>{formatKg(v.kg)}</td>
                        <td><StatusBadge map={ESTADO_VIAJE} value={v.estado} /></td>
                      </tr>
                    ))}
                    {!(d.viajes_hoy_list || []).length && (
                      <tr><td className="py-6 text-muted" colSpan={5}>No hay viajes hoy</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="card-title text-base">Flota</h2>
                <button type="button" className="btn btn-link btn-sm text-primary no-underline" onClick={() => navigate("/flota")}>
                  Ver todos →
                </button>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-semibold">{d.flota?.total ?? 0}</p>
                  <p className="text-xs text-muted">vehículos</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-success">{d.flota?.operativos ?? 0}</p>
                  <p className="text-xs text-muted">operativos</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-error">{d.flota?.detenido ?? 0}</p>
                  <p className="text-xs text-muted">detenidos</p>
                </div>
              </div>
              <ul className="space-y-3">
                {(d.flota?.unidades || []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between rounded-box bg-base-200 px-3 py-2">
                    <div>
                      <p className="font-medium">{u.placa}</p>
                      <p className="text-xs text-muted">{u.marca} {u.modelo}</p>
                    </div>
                    <StatusBadge map={ESTADO_FLOTA} value={u.estado_operativo} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
