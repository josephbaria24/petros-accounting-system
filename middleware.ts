// middleware.ts (place in root directory)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function withSecurityHeaders(response: NextResponse) {
  // Anti click-jacking
  response.headers.set('X-Frame-Options', 'DENY')
  // CSP click-jacking defense (modern)
  response.headers.set(
    'Content-Security-Policy',
    [
      "frame-ancestors 'none'",
      // Keep this minimal to avoid breaking existing scripts/styles.
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')
  )

  // Baseline hardening
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Only meaningful over HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  return response
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.includes(request.nextUrl.pathname)

  if (isAuthPath && user) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/', request.url)))
  }

  // Protect all non-auth pages by default (prevents URL manipulation to reach unlisted routes like /reports, /expenses, etc.)
  // Allow API routes to handle their own auth (they already do checks or are public by design).
  const isApi = request.nextUrl.pathname.startsWith('/api/')
  if (!isAuthPath && !isApi && !user) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
  }

  return withSecurityHeaders(response)
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals/static assets.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}