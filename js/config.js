/**
 * SAGE backend bridge. Stub when Supabase is not configured (Live Server / local).
 * Set SAGE_SUPABASE_URL + SAGE_SUPABASE_ANON_KEY in supabase-config.js to enable persistence.
 */
var SageBackend = {
  isConfigured() {
    var url = typeof window !== 'undefined' && window.SAGE_SUPABASE_URL;
    var key = typeof window !== 'undefined' && window.SAGE_SUPABASE_ANON_KEY;
    return !!(url && key && String(url).trim() && String(key).trim());
  },

  loadPersistedSession() {
    if (!this.isConfigured()) return Promise.resolve(null);
    return Promise.resolve(null);
  },

  upsertBeds() {},

  insertHospitalEvent() {},

  setupHospital: function () {
    return Promise.resolve({
      ok: false,
      message: 'Supabase backend not implemented — use local-only mode.',
    });
  },
};
