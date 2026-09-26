import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "./Sidebar";
import { LayoutProvider, useLayout } from "./LayoutContext";

export function AppLayout() {
  return (
    <LayoutProvider>
      <AppShell />
    </LayoutProvider>
  );
}

function AppShell() {
  const { navOpen, setNavOpen } = useLayout();

  return (
    <div className="flex min-h-dvh bg-base-200">
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setNavOpen(false)}
        />
      )}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
      <Toaster position="top-center" toastOptions={{ className: "max-w-[min(24rem,calc(100vw-1.5rem))]" }} />
    </div>
  );
}
