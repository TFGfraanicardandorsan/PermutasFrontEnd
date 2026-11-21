import ErrorBoundary from "../components/comun/ErrorBoundary.jsx";
import Footer from "../components/comun/footer";
import NavbarAdmin from "../components/administrador/NavbarAdmin";
import NavbarDelegacion from "../components/delegacion/NavbarDelegacion";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ADMIN_ROLE, isAllowedRole } from "../lib/roles";

export default function LayoutDelegacion() {
    const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = isAllowedRole(user?.rol, [ADMIN_ROLE]);

  return (
    <div className="app-frame">
      {isAdmin ? <NavbarAdmin /> : <NavbarDelegacion />}
      <main id="workspace-content" tabIndex={-1} className="workspace-main">
        <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
