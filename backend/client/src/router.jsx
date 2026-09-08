import {createBrowserRouter} from "react-router-dom";
import Home from '@/pages/Home';
import Login from '@/pages/auth/Login';
import Dashboard from "@/pages/Dashboard";
import ResetPassword from "@/pages/auth/ResetPassword";
import NotFoundPage from "@/pages/404";

const router = createBrowserRouter([
	{
	  	path: "/",
	  	element: <Home/>,
	},
	{
		path: "/login",
		element: <Login/>,
  	},
	{
		path: "/dashboard",
		element: <Dashboard/>,
  	},
	{
		path: "/password-reset/:token",
		element: <ResetPassword/>,
  	},
	{
		path: "*",
		element: <NotFoundPage/>,
  	},

]);

export default router;