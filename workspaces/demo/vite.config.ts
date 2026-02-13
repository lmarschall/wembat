import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		host: 'localhost',
		port: 5173,
		https: {
			key: fs.readFileSync(path.resolve(__dirname, '../../certs/localhost+2-key.pem')),
			cert: fs.readFileSync(path.resolve(__dirname, '../../certs/localhost+2.pem')),
		}
	},
});
