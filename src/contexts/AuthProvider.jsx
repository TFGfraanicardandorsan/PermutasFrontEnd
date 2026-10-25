import { useEffect, useState } from "react";
import AuthContext from "./AuthContext.jsx";
import PropTypes from "prop-types";
import { obtenerSesion } from "../services/login.js";

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({ loading: true,isAuthenticated: false,user: null });
    
    useEffect(() => {
        const apiObtenerSesion = async () => {
            try {
                const data = await obtenerSesion();
                const authenticated = !data?.err && data?.isAuthenticated === true && Boolean(data?.user);
                setAuth({ loading: false, isAuthenticated: authenticated, user: authenticated ? data.user : null });
            } catch {
                setAuth({ loading: false, isAuthenticated: false, user: null });
            }
        };
        apiObtenerSesion();
    }, []);
    
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
AuthProvider.propTypes = { children: PropTypes.node.isRequired };
