import ErrorBoundary from "../components/comun/ErrorBoundary.jsx";
import Footer from "../components/comun/footer";
import NavbarAdmin from "../components/administrador/NavbarAdmin";
import { Outlet, useLocation } from "react-router-dom";

export default function LayoutAdmin() {
    const { pathname } = useLocation();
    return (
        <div className="app-frame">
            <NavbarAdmin />
            <main id="workspace-content" tabIndex={-1} className="workspace-main">
                <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
            </main>
            <Footer />
        </div>
    );
}