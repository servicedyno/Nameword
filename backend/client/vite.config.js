import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default ({ mode }) => {
	process.env = {...process.env, ...loadEnv(mode, process.cwd())};

	return defineConfig({
		plugins: [react()],
		server:{
			proxy: mode === 'development' ? {
				'/auth/google':{
					target: process.env.VITE_PUBLIC_BACKEND_URL,
				},
				'/api':{
					target: process.env.VITE_PUBLIC_BACKEND_URL,
				}

			}: undefined,
		},
		resolve: {
			alias: {
			"@": path.resolve(__dirname, "./src"),
		  },
		},
		build: {
			sourcemap: true, // Enable source maps for debugging
		},
	})
};

