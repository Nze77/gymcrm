'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Dumbbell, Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    console.log('--- LOGIN ATTEMPT ---')
    console.log('Email:', email)
    
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Auth error:', error)
        setError(error.message)
      } else {
        console.log('Login success:', data)
        router.push('/checkin')
      }
    } catch (err: any) {
      console.error('Catch error:', err)
      const isFetchError = err instanceof TypeError && (
        err.message.includes('fetch') || 
        err.message.includes('NetworkError') ||
        err.message.includes('Aborted')
      );

      if (isFetchError) {
        setError('Network error: Could not reach Supabase. Please check your internet connection and verify that your phone can access the Supabase URL.')
      } else {
        setError(err.message || 'An unexpected error occurred during login.')
      }
    } finally {
      setLoading(false)
    }
  }

  const testConnectivity = async () => {
    setError('Testing connectivity via proxy...')
    try {
      // Test via our new proxy to bypass network blocks
      const proxyUrl = typeof window !== 'undefined' ? `${window.location.origin}/supabase-proxy/rest/v1/` : '/supabase-proxy/rest/v1/'
      const res = await fetch(proxyUrl, { method: 'GET' })
      if (res.ok || res.status === 401) {
        setError('Connectivity Test SUCCESS: The proxy is working and reachable!')
      } else {
        setError(`Connectivity Test: Received status ${res.status} from proxy.`)
      }
    } catch (err: any) {
      console.error('Connectivity Test FAILED:', err)
      setError(`Connectivity Test FAILED: ${err.message}. The proxy itself might be blocked or misconfigured.`)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-transparent relative">
      <div className="glass-card w-full max-w-[400px] p-8 md:p-10 animate-scaleIn">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Dumbbell className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-[var(--text-secondary)]">Sign in to manage your gym</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="email"
                placeholder="admin@gym.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="!pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!pl-10"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-100/10 border border-red-500/20 text-red-500 text-sm font-medium animate-fadeUp">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full h-14 relative overflow-hidden group shadow-xl shadow-black/5"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span className="flex items-center gap-2">
                Continue to Dashboard
              </span>
            )}
          </button>

          <div className="pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={testConnectivity}
              className="text-xs text-[var(--text-muted)] hover:text-accent underline w-full text-center"
            >
              Having issues? Test Network Connectivity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
