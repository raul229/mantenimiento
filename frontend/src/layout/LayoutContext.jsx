import { createContext, useContext, useEffect, useState } from "react";

const LayoutContext = createContext({
  navOpen: false,
  setNavOpen: () => {},
});

export function LayoutProvider({ children }) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", navOpen);
    return () => document.body.classList.remove("overflow-hidden");
  }, [navOpen]);

  return (
    <LayoutContext.Provider value={{ navOpen, setNavOpen }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
