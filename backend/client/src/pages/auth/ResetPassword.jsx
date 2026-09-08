import { useEffect, FormEventHandler, useState } from 'react';
import GuestLayout from '@/layouts/GuestLayout';
import InputError from '@/components/InputError';
import InputLabel from '@/components/InputLabel';
import PrimaryButton from '@/components/PrimaryButton';
import TextInput from '@/components/TextInput';
import {useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/auth';

export default function ResetPassword() {

	const [searchParams] = useSearchParams();

	const { resetPassword } = useAuth({ middleware: 'guest' })
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [passwordConfirmation, setPasswordConfirmation] = useState('');
	const [errors, setErrors] = useState([]);
	const [status, setStatus] = useState(null);
	const [processing, setProcessing] = useState(false);
  

	useEffect(() => {
		setEmail(searchParams.get('email') || '')
	}, [searchParams.get('email')]);

    const submit = (e) => {
        e.preventDefault();
		resetPassword({
			email,
			password,
			passwordConfirmation,
			setErrors,
			setStatus,
			setProcessing
		});

    };

    return (
        <GuestLayout>
            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={email}
                        className="mt-1 block w-full read-only:bg-gray-100"
                        autoComplete="username"
                        onChange={(e) =>setEmail(e.target.value)}
						readOnly
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        isFocused={true}
                        onChange={(e) =>setPassword(e.target.value) }
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password_confirmation" value="Confirm Password" />

                    <TextInput
                        type="password"
                        name="password_confirmation"
                        value={passwordConfirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                    />

                    <InputError message={errors.passwordConfirmation} className="mt-2" />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <PrimaryButton className="ms-4" disabled = {processing}>
                        Reset Password
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
