import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Ambil user untuk memvalidasi token secara aman di server
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Proteksi Route
  if (user) {
    // Redirect user yang sudah login ke dashboard jika mencoba mengakses login/register
    if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } else {
    // Redirect user belum login ke /login jika mengakses halaman terproteksi
    const isProtectedRoute =
      pathname === '/' ||
      pathname.startsWith('/kasir') ||
      pathname.startsWith('/produk') ||
      pathname.startsWith('/kategori') ||
      pathname.startsWith('/transaksi') ||
      pathname.startsWith('/pengaturan') ||
      pathname.startsWith('/store')

    if (isProtectedRoute && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
