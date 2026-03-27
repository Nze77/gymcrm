import { createBrowserClient } from '@supabase/ssr'

// Temporarily hardcode for debugging to ensure variables are available
const supabaseUrl = 'https://izzsbidqdupibjnwefqs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6enNiaWRxZHVwaWJqbndlZnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTQzNjgsImV4cCI6MjA5MDA5MDM2OH0.4yXbZnOWg6ZPEeuJhYbhG-alAA-9755b5_dLs3in-NI'

if (typeof window !== 'undefined') {
  console.log('--- SUPABASE HARDCODED DEBUG ---')
  console.log('URL:', supabaseUrl)
  // Test if we can reach the URL at all
  fetch(supabaseUrl + '/rest/v1/')
    .then(res => console.log('Connectivity test SUCCESS:', res.status))
    .catch(err => console.error('Connectivity test FAILED:', err))
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
