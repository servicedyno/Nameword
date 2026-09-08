import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';

const ProtectedRoute = ({children}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader/>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;