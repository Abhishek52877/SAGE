/**
 * Optional runtime fallback if you do not use .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 * For Vercel, prefer Environment Variables with the VITE_ names in Project Settings.
 */
window.SAGE_SUPABASE_URL = window.SAGE_SUPABASE_URL || '';
window.SAGE_SUPABASE_ANON_KEY = window.SAGE_SUPABASE_ANON_KEY || '';
