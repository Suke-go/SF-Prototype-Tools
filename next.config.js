/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // WebAssembly対応（将来のRust+WASM用）
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    // Web Worker用（umap.worker.ts）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },

  // 画像最適化（リモート画像は使用しないため remotePatterns は空）
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [],
  },

  // ヘッダー（セキュリティ + キャッシュ制御）
  async headers() {
    /** @type {import('next/dist/lib/load-custom-routes').Header['headers']} */
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ...(isProd
        ? [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              "connect-src 'self'",
            ].join('; '),
          },
        ]
        : []),
    ]

    return [
      {
        // 全ページ共通セキュリティヘッダー
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // 静的アセットのキャッシュ
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isProd
              ? 'public, max-age=31536000, immutable'
              : 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        // APIのキャッシュ無効化（リアルタイムデータ）
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        // テーマ一覧は短期キャッシュ可能
        source: '/api/themes',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
