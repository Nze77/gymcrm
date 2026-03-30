import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import type { IncomingMessage } from 'node:http'

export const runtime = 'nodejs'

import fs from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const SUPABASE_HOSTNAME = new URL(SUPABASE_URL).hostname

function getSupabaseIp(): string {
  try {
    const tmpPath = path.join(process.cwd(), '.supabase-ip')
    return fs.readFileSync(tmpPath, 'utf8').trim()
  } catch {
    console.warn('[Proxy] .supabase-ip not found, falling back to hostname')
    return SUPABASE_HOSTNAME
  }
}

const SUPABASE_IP = getSupabaseIp()

function httpsRequest(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: SUPABASE_IP,
        port: 443,
        path,
        method,
        headers: { ...headers, host: SUPABASE_HOSTNAME },
        servername: SUPABASE_HOSTNAME,
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const responseHeaders: Record<string, string> = {}
          const skip = ['transfer-encoding', 'connection', 'content-encoding', 'content-length']
          for (const [k, v] of Object.entries(res.headers)) {
            if (v && !skip.includes(k.toLowerCase())) {
              responseHeaders[k] = Array.isArray(v) ? v.join(', ') : v
            }
          }
          const body = Buffer.concat(chunks)
          responseHeaders['content-length'] = String(body.length)
          resolve({ status: res.statusCode ?? 500, headers: responseHeaders, body })
        })
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    if (body?.length) req.write(body)
    req.end()
  })
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const { search } = request.nextUrl
  const urlPath = `/${path.join('/')}${search}`

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
      headers[key] = value
    }
  })
  headers['accept-encoding'] = 'identity'

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const bodyBuffer = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined
  const upstream = await httpsRequest(urlPath, request.method, headers, bodyBuffer)

  return new NextResponse(upstream.body as unknown as BodyInit, { status: upstream.status, headers: upstream.headers })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS }
