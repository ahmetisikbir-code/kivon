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

export function clearToken() {
  supabase.auth.signOut();
}

export function setUser(user) {
  localStorage.setItem('kivon_user', JSON.stringify(user));
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
