import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/service/api";
import { puede, puedeEscribir, puedeEliminar } from "@/utils/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("sermin_access");
    if (!token) {
      setReady(true);
      return;
    }
    AuthService.me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("sermin_access");
        localStorage.removeItem("sermin_refresh");
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = async (username, password) => {
    const { data } = await AuthService.login(username, password);
    localStorage.setItem("sermin_access", data.access);
    localStorage.setItem("sermin_refresh", data.refresh);
    const me = await AuthService.me();
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem("sermin_access");
    localStorage.removeItem("sermin_refresh");
    setUser(null);
    queryClient.clear();
  };

  const reload = async () => {
    const me = await AuthService.me();
    setUser(me.data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        login,
        logout,
        reload,
        rol: user?.rol,
        can: (modulo) => puede(user, modulo),
        canWrite: (modulo) => puedeEscribir(user, modulo),
        canDelete: (modulo) => puedeEliminar(user, modulo),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
