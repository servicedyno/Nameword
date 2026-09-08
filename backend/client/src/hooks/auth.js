import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect } from 'react'
import {useNavigate, useParams} from 'react-router-dom';

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
	let navigate = useNavigate();
  	let params = useParams();
    const { data: user, error, mutate } = useSWR('/api/v1/auth/me', () =>
        axios
            .get('/api/v1/auth/me')
            .then(res => res.data)
            .catch(error => {
                if (error.response.status !== 409) throw error

               // router.push('/verify-email')
            }),
			{
				revalidateIfStale: false,
				revalidateOnFocus: false
			}
    );

	const telegramLogin = async({setError, setProcessing, data})=>{
		setError(null);
		setProcessing(true);
		axios
		  	.post('/api/v1/auth/telegram', data)
		  	.then(response => {
				mutate();
			})
		  	.catch(error => {
				setProcessing(false);
				setError("Something went wrong");
		  	})
	};

	const logout = async () => {
		if (!error) {
		  await axios.post('/api/v1/auth/logout');
		  mutate()
		}
		window.location.pathname = '/'
	}

	const resetPassword = async ({setErrors, setStatus, setProcessing, ...props}) => {
		setErrors([]);
		setStatus(null);
		setProcessing(true);
		axios
		  	.post('/api/v1/auth/reset-password', {token: params.token, ...props})
		  	.then(response => {
				setProcessing(false);
				return navigate(`/login?reset=${  btoa(response.data.message)}`)
			})
		  	.catch(error => {
				if (error.response.status !== 422) throw error;
			
				setProcessing(false);
				const errorsObject = error.response.data.errors.reduce((acc, { field, message }) => {
					acc[field] = message;
					return acc;
				}, {});
				setErrors(errorsObject);
		  	})
	}

	useEffect(() => {
		if (middleware === 'guest' && redirectIfAuthenticated && user) navigate(redirectIfAuthenticated)
		if (middleware === 'auth' && error) logout()
		// if(middleware === 'auth' && !user?.data.email && !user?.data.mobile){
		// 	return navigate("/confirm-signup")
		// }
	}, [user, error])

    return {
        user: user?.data ,
        // register,
        // login,
        // forgotPassword,
        resetPassword,
		telegramLogin,
        // resendEmailVerification,
        logout,
    }

}