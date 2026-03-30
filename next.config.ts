import fs from 'node:fs'
import path from 'node:path'
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izzsbidqdupibjnwefqs.supabase.co';
const hostname = new URL(supabaseUrl).hostname;

async function resolveSupabaseIp(host: string): Promise<string> {
  const dns = await import('node:dns');
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  try {
    const [ip] = await dns.promises.resolve4(host);
    console.log(`[Config] Resolved ${host} → ${ip}`);
    return ip;
  } catch (e) {
    console.warn(`[Config] DNS resolve failed, falling back to hostname`, e);
    return host;
  }
}

export default async function getNextConfig(): Promise<NextConfig> {
  const supabaseIp = process.env.NODE_ENV !== 'production'
    ? await resolveSupabaseIp(hostname)
    : hostname;

  if (process.env.NODE_ENV !== 'production' && supabaseIp !== hostname) {
    const tmpPath = path.join(process.cwd(), '.supabase-ip')
    fs.writeFileSync(tmpPath, supabaseIp, 'utf8')
    console.log(`[Config] Wrote Supabase IP to .supabase-ip`)
  }

  return {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_RESOLVED_IP: supabaseIp,
      SUPABASE_HOSTNAME: hostname,
    },
    allowedDevOrigins: ["192.168.1.7", "localhost:3000"],
  };
}
