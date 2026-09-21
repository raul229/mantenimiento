import { NavbarMantenimiento } from "@/components/NavbasMantenimiento";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

export function Layout() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} toastOptions={{ duration: 3000 }} />
      <NavbarMantenimiento />
      <div className="container mx-auto mt-4 px-4">
        <Outlet />
      </div>
    </>
  );
}
