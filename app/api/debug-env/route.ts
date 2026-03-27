import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING'
  
  return NextResponse.json({
    hasUrl: supabaseUrl !== 'MISSING',
    urlStart: supabaseUrl.substring(0, 8),
    hasKey: supabaseKey !== 'MISSING',
    keyLength: supabaseKey.length,
    nodeEnv: process.env.NODE_ENV
  })
}
