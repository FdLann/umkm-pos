import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua path request kecuali untuk:
     * - _next/static (file statis)
     * - _next/image (file optimasi gambar)
     * - favicon.ico (ikon favicon)
     * - file dengan ekstensi gambar (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
