import { useEffect, useState } from "react";
import {
  VehiculoService,
  MantenimientoService,
  RecojoService,
  ClienteService,
  FallaService,
  RutaService,
  ViajeService,
  SedeService,
} from "@/service";

function countBy(array, keyFn) {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topNFromCounts(counts, n = 5) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, val]) => ({ key, val }));
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [vehRes, mantRes, recojoRes, clienteRes, fallaRes, rutaRes, viajeRes, sedeRes] = await Promise.all([
          VehiculoService.getAll(),
          MantenimientoService.getAll(),
          RecojoService.getAll(),
          ClienteService.getAll(),
          FallaService.getAll(),
          RutaService.getAll(),
          ViajeService.getAll(),
          SedeService.getAll(),
        ]);

        const vehiculos = vehRes?.data || [];
        const mantenimientos = mantRes?.data || [];
        const recojos = recojoRes?.data || [];
        const clientes = clienteRes?.data || [];
        const fallas = fallaRes?.data || [];
        const rutas = rutaRes?.data || [];
        const viajes = viajeRes?.data || [];
        const sedes = sedeRes?.data || [];

        // Vehiculos con más mantenimientos
        const mantByVeh = countBy(mantenimientos, (m) => m.vehiculo?.id ?? m.vehiculo ?? 'unknown');
        const topVeh = topNFromCounts(mantByVeh, 5).map(t => ({ vehiculo: vehiculos.find(v => v.id == t.key)?.marca || `ID ${t.key}`, count: t.val }));

        // Total mantenimientos en el mes actual
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const mantThisMonth = mantenimientos.filter(m => {
          const d = new Date(m.fecha_inicio);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;

        // Total recojos
        const totalRecojos = recojos.length;

        // Cliente con más recojos (map recojos -> sede -> cliente)
        const recojosByCliente = {};
        recojos.forEach(r => {
          const sede = sedes.find(s => s.id === r.sede);
          const clienteId = sede?.cliente;
          if (clienteId) recojosByCliente[clienteId] = (recojosByCliente[clienteId] || 0) + 1;
        });
        const topClienteRecojos = topNFromCounts(recojosByCliente, 1).map(t => ({ cliente: clientes.find(c => c.id == t.key)?.razon_social || `ID ${t.key}`, count: t.val }));

        // Estado de vehiculos
        const estadoVeh = countBy(vehiculos, v => v.estado || 'unknown');

        // Cantidad de fallas pendientes
        const fallasPendientes = (fallas || []).filter(f => f.estado === 'pendiente').length;

        // Rutas más frecuentes (por viajes)
        const rutasCount = countBy(viajes, (v) => v.ruta?.id ?? v.ruta ?? 'unknown');
        const topRutas = topNFromCounts(rutasCount, 5).map(t => ({ ruta: rutas.find(r => r.id == t.key)?.nombre || `ID ${t.key}`, count: t.val }));

        setMetrics({
          topVeh,
          mantThisMonth,
          totalRecojos,
          topClienteRecojos,
          estadoVeh,
          fallasPendientes,
          topRutas,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="stat rounded-box bg-base-100 shadow-sm">
          <div className="stat-title">Mantenimientos este mes</div>
          <div className="stat-value text-3xl">{metrics.mantThisMonth}</div>
        </div>
        <div className="stat rounded-box bg-base-100 shadow-sm">
          <div className="stat-title">Total recojos</div>
          <div className="stat-value text-3xl">{metrics.totalRecojos}</div>
        </div>
        <div className="stat rounded-box bg-base-100 shadow-sm">
          <div className="stat-title">Fallas pendientes</div>
          <div className="stat-value text-3xl">{metrics.fallasPendientes}</div>
        </div>
        <div className="card bg-base-100 shadow-sm md:col-span-1">
          <div className="card-body">
            <h2 className="card-title text-base">Vehículos con más mantenimientos</h2>
            <ul className="list">
              {metrics.topVeh.map((v, i) => (
                <li key={i} className="list-row">{v.vehiculo} — {v.count}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Rutas más frecuentes</h2>
            <ul className="list">
              {metrics.topRutas.map((r, i) => (
                <li key={i} className="list-row">{r.ruta} — {r.count}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Cliente(s) con más recojos</h2>
            <ul className="list">
              {metrics.topClienteRecojos.map((c, i) => (
                <li key={i} className="list-row">{c.cliente} — {c.count}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm md:col-span-3">
          <div className="card-body">
            <h2 className="card-title text-base">Estado de vehículos</h2>
            <ul className="list">
              {Object.entries(metrics.estadoVeh || {}).map(([k, v]) => (
                <li key={k} className="list-row">{k} — {v}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
