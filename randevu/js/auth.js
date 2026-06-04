import { supabase, getSession } from './api.js';

export function isAuthenticated() {
  return !!supabase.auth.currentSession;
}

export function getToken() {
  return supabase.auth.currentSession?.access_token || null;
}

export function setToken(token) {
  // Supabase manages tokens, no-op for manual set
}

export async function clearToken() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('supabase') || k.startsWith('sb-') || k === 'kivon_user');
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.setItem('kivon_logout', '1');
  await supabase.auth.signOut();
}

export function setUser(user) {
  if (!user) { localStorage.removeItem('kivon_user'); return; }
  const safe = { full_name: user.full_name || user.name || '', email: user.email || '', role: user.role || '' };
  localStorage.setItem('kivon_user', JSON.stringify(safe));
}

export function getUser() {
  try { const raw = localStorage.getItem('kivon_user'); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function redirectIfNotAuthenticated() {
  getSession().then(session => {
    if (!session) window.location.href = 'giris.html';
  });
}

export async function redirectIfAuthenticated() {
  if (sessionStorage.getItem('kivon_logout') === '1') {
    sessionStorage.removeItem('kivon_logout');
    return;
  }
  const session = await getSession();
  if (!session) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  window.location.href = (profile?.role === 'doctor') ? 'admin.html' : 'panel.html';
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    setUser(session.user.user_metadata);
  }
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('kivon_user');
  }
});
