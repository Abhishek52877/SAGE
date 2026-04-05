import { createClient } from '@supabase/supabase-js';

function supabaseUrl() {
  const v = import.meta.env.VITE_SUPABASE_URL;
  if (v && String(v).trim()) return String(v).trim();
  if (typeof window !== 'undefined' && window.SAGE_SUPABASE_URL)
    return String(window.SAGE_SUPABASE_URL).trim();
  return '';
}

function supabaseAnonKey() {
  const v = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (v && String(v).trim()) return String(v).trim();
  if (typeof window !== 'undefined' && window.SAGE_SUPABASE_ANON_KEY)
    return String(window.SAGE_SUPABASE_ANON_KEY).trim();
  return '';
}

let client = null;

function getClient() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

function rowToBed(row) {
  return {
    id: row.bed_id,
    zone: row.zone,
    number: row.bed_number,
    status: row.status,
    patient: row.patient,
  };
}

export const SageBackend = {
  isConfigured() {
    return !!(supabaseUrl() && supabaseAnonKey());
  },

  async loadPersistedSession() {
    const sb = getClient();
    if (!sb) return null;

    const { data: hospitals, error: hErr } = await sb
      .from('sage_hospitals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (hErr || !hospitals?.length) return null;

    const h = hospitals[0];
    const { data: bedRows, error: bErr } = await sb
      .from('sage_beds')
      .select('*')
      .eq('hospital_id', h.id);

    if (bErr) return null;

    const { data: eventRows, error: eErr } = await sb
      .from('sage_events')
      .select('*')
      .eq('hospital_id', h.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (eErr) return null;

    const beds = {};
    (bedRows || []).forEach((row) => {
      beds[row.bed_id] = rowToBed(row);
    });

    const events = (eventRows || []).map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      severity: r.severity,
      time: r.event_time,
    }));

    const hospital = {
      id: h.id,
      name: h.name,
      floors: h.floors || {},
      passwords: h.passwords || {},
      primaryFloor: h.primary_floor || 'ICU',
    };

    return { hospital, beds, events };
  },

  async upsertBeds(hospitalId, beds) {
    const sb = getClient();
    if (!sb || !hospitalId) return;
    const rows = Object.values(beds).map((b) => ({
      hospital_id: hospitalId,
      bed_id: b.id,
      zone: b.zone,
      bed_number: b.number,
      status: b.status,
      patient: b.patient,
      updated_at: new Date().toISOString(),
    }));
    if (!rows.length) return;
    const { error } = await sb.from('sage_beds').upsert(rows, {
      onConflict: 'hospital_id,bed_id',
    });
    if (error) console.warn('[SAGE] upsertBeds', error.message);
  },

  async insertHospitalEvent(hospitalId, ev) {
    const sb = getClient();
    if (!sb || !hospitalId || !ev?.id) return;
    const { error } = await sb.from('sage_events').insert({
      id: ev.id,
      hospital_id: hospitalId,
      type: ev.type,
      message: ev.message,
      severity: ev.severity,
      event_time: ev.time,
    });
    if (error) console.warn('[SAGE] insertHospitalEvent', error.message);
  },

  async setupHospital(cfg, initialBeds) {
    const sb = getClient();
    if (!sb) {
      return {
        ok: false,
        message: 'Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or public/js/supabase-config.js).',
      };
    }

    const { data, error } = await sb
      .from('sage_hospitals')
      .insert({
        name: cfg.name,
        floors: cfg.floors,
        passwords: cfg.passwords || {},
        primary_floor: cfg.primaryFloor || 'ICU',
      })
      .select('id')
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    const hospital = {
      id: data.id,
      name: cfg.name,
      floors: cfg.floors,
      passwords: cfg.passwords || {},
      primaryFloor: cfg.primaryFloor || 'ICU',
    };

    await this.upsertBeds(data.id, initialBeds);
    return { ok: true, hospital };
  },

  async updateHospital(hospitalId, cfg) {
    const sb = getClient();
    if (!sb || !hospitalId) return { ok: true };
    const { error } = await sb
      .from('sage_hospitals')
      .update({
        name: cfg.name,
        floors: cfg.floors,
        passwords: cfg.passwords || {},
        primary_floor: cfg.primaryFloor || 'ICU',
      })
      .eq('id', hospitalId);

    if (error) return { ok: false, message: error.message };
    return { ok: true };
  },
};
