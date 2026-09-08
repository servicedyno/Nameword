import GuestLayout from "@/layouts/GuestLayout";
import InputLabel from "@/components/InputLabel";
import TextInput from "@/components/TextInput";
import InputError from "@/components/InputError";
import PrimaryButton from "@/components/PrimaryButton";
import Checkbox from "@/components/Checkbox";
import { useState, useEffect } from  'react';
import { Link, useSearchParams } from "react-router-dom";
import SectionBorder from "@/components/SectionBorder";
import { useAuth } from '@/hooks/auth';
import { LoginButton } from '@telegram-auth/react';
import {useNavigate} from 'react-router-dom';

export default function Login(){
	let navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const { login, telegramLogin } = useAuth({
		middleware: 'guest',
		redirectIfAuthenticated: '/dashboard'
	});
	const [error, setError] = useState(null);
	const [status, setStatus] = useState(null);
	const [errors, setErrors] = useState([]);
	const [processing, setProcessing] = useState(false);
	const submit = (e) => {
        e.preventDefault();

    };

	useEffect(() => {
        if (searchParams.get('reset')?.length > 0 && errors.length === 0) {
            setStatus(atob(searchParams.get('reset')))
        } else {
            setStatus(null)
        }
    });

	const handleTelegramLogin=(data)=>{
		telegramLogin({
			setError,
			setProcessing,
			data
		});
	}


	return (
		<GuestLayout>
			{status && <div className="mb-4 font-medium text-sm text-green-600">{status}</div>}
			{error && <div className="mb-4 font-medium text-sm text-red-600">{error}</div>}
			<form onSubmit={submit}>
				<div>
					<InputLabel htmlFor="email" value="Email" />

					<TextInput
						id="email"
						type="email"
						name="email"
						value={``}
						className="mt-1 block w-full"
						autoComplete="username"
						isFocused={true}
					
					/>

					<InputError message={errors.email} className="mt-2" />
				</div>

				<div className="mt-4">
					<InputLabel htmlFor="password" value="Password" />

					<TextInput
						id="password"
						type="password"
						name="password"
						value={``}
						className="mt-1 block w-full"
						autoComplete="current-password"
					
					/>

					<InputError message={errors.password} className="mt-2" />
				</div>

				<div className="block mt-4">
					<label className="flex items-center">
						<Checkbox
							name="remember"
							checked={``}
							onChange={console.log}

						/>
						<span className="ms-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
					</label>
				</div>

				<div className="flex items-center justify-end mt-4">
					<Link
						className="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
					>
						Forgot your password?
					</Link>

					<PrimaryButton className="ms-4" disabled>
						Log in
					</PrimaryButton>
				</div>
			</form>
			<div className="relative flex py-5 items-center">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="flex-shrink mx-4 text-gray-400">OR</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>
			<a href="/auth/google"  className="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:ring-4 focus:ring-[#4285F4]/50 font-medium rounded-lg text-sm px-28 py-2.5 text-center inline-flex items-center dark:focus:ring-[#4285F4]/55 mr-2 mb-2 w-full">
				<svg className="mr-2 -ml-1 w-4 h-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
					<path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
				</svg>
				Sign in with Google
			</a>
			<LoginButton
				botUsername={import.meta.env.VITE_BOT_USERNAME}
				cornerRadius={5}
				onAuthCallback={handleTelegramLogin}
				showAvatar={false}
			/>
		</GuestLayout>
	)
}