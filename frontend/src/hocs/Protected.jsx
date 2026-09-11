import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';

const ProtectedRoute = ({children}) => {
  const { isAuthenticated, loading } = useAuth();
  const { pathname, search } = useLocation();

  if (loading) {
    return <Loader/>;
  }

  if (!isAuthenticated) {
    localStorage.setItem("path", pathname + search);
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;