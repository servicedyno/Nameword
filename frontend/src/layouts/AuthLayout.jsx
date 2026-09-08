import { Outlet } from 'react-router';
import AuthNavbar from '../components/layout/AuthNavbar';
import AuthFooter from '../components/layout/AuthFooter';

const AuthLayout = () => {
  return (
    <div>
      <AuthNavbar />
      <Outlet />
      <AuthFooter />
    </div>
  )

};

export default AuthLayout;
