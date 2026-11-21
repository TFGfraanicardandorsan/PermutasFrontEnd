import { useAuth } from '../../hooks/useAuth';
import { ADMIN_ROLE, isAllowedRole } from '../../lib/roles';
import HomeAdmin from '../administrador/HomeAdmin.jsx';
import HomeEstudiante from '../usuario/HomeEstudiante.jsx';

// Portada según el rol: cada uno ve lo que necesita atender.
export default function Home() {
  const { user } = useAuth();
  return isAllowedRole(user?.rol, [ADMIN_ROLE]) ? <HomeAdmin /> : <HomeEstudiante />;
}
