import { createContext, useContext, useEffect, useState } from "react";
import { AuthService } from "@/service/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
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
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
