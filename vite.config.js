import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig(({ mode }) => {
  // 환경변수 로드 (mode에 따라 .env 또는 .env.production)
  const env = loadEnv(mode, process.cwd(), '')
  const functionEnv = env.VITE_FUNCTION_ENV || 'test'

  console.log(`\n🔧 Build mode: ${mode}, Function env: ${functionEnv} (${functionEnv === 'prod' ? '_prod' : '_test'} suffix)\n`)

  return {
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main.js',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['electron']
              }
            }
          }
        },
        preload: {
          input: 'electron/preload.js',
          vite: {
            build: {
              outDir: 'dist-electron'
            }
          }
        }
      }),
      renderer()
    ],
    define: {
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '0.1.0')
    }
  }
})
