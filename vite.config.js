import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function absoluteOgUrls(siteUrl) {
  return {
    name: 'absolute-og-urls',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      const base = siteUrl.replace(/\/$/, '');
      return html
        .replaceAll('content="/"', `content="${base}/"`)
        .replaceAll('content="/og.jpg"', `content="${base}/og.jpg"`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), absoluteOgUrls(env.VITE_SITE_URL)],
  };
})
