import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router';
import Loader from '../components/common/Loader';

const UnprotectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader/>;
  }

  if (isAuthenticated) {
    const path = localStorage.getItem("path");
    return <Navigate to={path || "/dashboard"} replace />;
  }

  return <>{children}</>;
};

export default UnprotectedRoute;