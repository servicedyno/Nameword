import { useState, useCallback } from 'react';
import axios from '@/lib/axios';

function useForm(initialValues = {}) {
	const [data, setData] = useState(initialValues);
	const [errors, setErrors] = useState({});
	const [isDirty, setIsDirty] = useState(false);
	const [processing, setProcessing] = useState(false);
	const [wasSuccessful, setWasSuccessful] = useState(false);
	const [recentlySuccessful, setRecentlySuccessful] = useState(false);

	const handleChange = useCallback((event) => {
		const { name, value } = event.target;
		setData((prevData) => ({ ...prevData, [name]: value }));
		setIsDirty(true);
	}, []);

	const submit = useCallback(async (url, method = 'POST', options = {}) => {
		setProcessing(true);
		setWasSuccessful(false);
		setRecentlySuccessful(false);
		setErrors({});

		try {
		const response = await axios({
			url,
			method,
			data,
			...options,
		});

		if (response.status >= 200 && response.status < 300) {
			setWasSuccessful(true);
			setRecentlySuccessful(true);
			setData(initialValues); // Reset form on success
		} else {
			// Handle errors if the response status is not in the range of 2xx
			setErrors(response.data.errors || {});
		}
		} catch (error) {
		// Handle network or server errors
		setErrors(error.response?.data.errors || { general: 'Something went wrong' });
		} finally {
		setProcessing(false);
		setTimeout(() => {
			setRecentlySuccessful(false);
		}, 2000);
		}
	}, [data, initialValues]);

	const reset = useCallback(() => {
		setData(initialValues);
		setIsDirty(false);
	}, [initialValues]);

	return {
		data,
		setData,
		errors,
		isDirty,
		processing,
		wasSuccessful,
		recentlySuccessful,
		handleChange,
		submit,
		reset,
	};
}

export default useForm;
