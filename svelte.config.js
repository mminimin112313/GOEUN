import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-static setup for SPA (Single Page Application)
		// This allows hosting on GitHub Pages, Vercel, Netlify, etc.
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // Github Pages uses 404.html for SPA routing
			precompress: false,
			strict: false
		}),
		paths: {
			// GitHub Pages repository name
			base: process.argv.includes('dev') ? '' : '/GOEUN'
		}
	}
};

export default config;
