import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://remiwuslxbqlzuevecic.supabase.co';
const supabaseAnonKey = 'sb_publishable_bWlpyQycwdlquuzoNBxNkg_1WiFqaOo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function validateTurkishPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^05\d{9}$/.test(cleaned);
}

export function validateEmail(email) {
  if (!email) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
}

export function validatePassword(password) {
  if (!password) return { valid: false, message: 'Şifre gereklidir.' };
  if (password.length < 8) return { valid: false, message: 'Şifre en az 8 karakter olmalıdır.' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Şifre en az bir büyük harf içermelidir.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Şifre en az bir rakam içermelidir.' };
  return { valid: true, message: '' };
}

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', class: '' };
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  if (score <= 30) return { score, label: 'Zayıf', class: 'weak' };
  if (score <= 60) return { score, label: 'Orta', class: 'medium' };
  if (score <= 80) return { score, label: 'Güçlü', class: 'strong' };
  return { score, label: 'Çok Güçlü', class: 'very-strong' };
}

const loginAttempts = new Map();

export function checkLoginRateLimit(identifier) {
  const now = Date.now();
  const windowMs = 60000;
  const maxAttempts = 5;
  if (!loginAttempts.has(identifier)) {
    loginAttempts.set(identifier, []);
  }
  const timestamps = loginAttempts.get(identifier).filter(t => now - t < windowMs);
  if (timestamps.length >= maxAttempts) {
    const retryAfter = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    return { blocked: true, retryAfter };
  }
  timestamps.push(now);
  loginAttempts.set(identifier, timestamps);
  return { blocked: false };
}

function toUserError(err) {
  if (!err) return 'Bilinmeyen bir hata oluştu.';
  const msg = err.message || String(err);
  if (msg.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (msg.includes('Email not confirmed')) return 'E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.';
  if (msg.includes('User already registered')) return 'Bu e-posta adresi zaten kayıtlı.';
  if (msg.includes('rate limit')) return 'Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
  return 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.';
}

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function login(email, password) {
  const rateCheck = checkLoginRateLimit(email);
  if (rateCheck.blocked) {
    throw new Error(`Çok fazla giriş denemesi. Lütfen ${rateCheck.retryAfter} saniye bekleyin.`);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(toUserError(error));
  return data;
}

export async function signup(data) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.full_name, phone: data.phone, role: data.role || 'user' } }
  });
  if (error) throw new Error(toUserError(error));
  return authData;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(toUserError(error));
}

export async function getProfile() {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı.');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw new Error(error.message);
  return { data: { user: session.user, profile: data } };
}

export async function updateProfile(updates) {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı.');
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', session.user.id).select().single();
  if (error) throw new Error(error.message);
  return { data };
}

export async function getAppointments() {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı.');
  const { data, error } = await supabase.from('appointments').select('*, doctor:doctors(*, profile:profiles(*))').eq('user_id', session.user.id).order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return { data };
}

export async function createAppointment(data) {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı.');

  const { data: slot, error: slotError } = await supabase.from('availability').select('*').eq('id', data.slot_id).single();
  if (slotError || !slot) throw new Error('Seçilen zaman aralığı bulunamadı.');
  if (slot.is_booked) throw new Error('Bu zaman aralığı artık müsait değil.');

  const { error: bookError } = await supabase.from('availability').update({ is_booked: true }).eq('id', data.slot_id);
  if (bookError) throw new Error('Zaman aralığı rezerve edilemedi.');

  const { data: appt, error } = await supabase.from('appointments').insert({
    doctor_id: data.doctor_id,
    user_id: session.user.id,
    slot_id: data.slot_id,
    date: slot.date,
    time: slot.start_time,
    status: 'confirmed',
    notes: data.notes || ''
  }).select().single();
  if (error) throw new Error(error.message);
  return { data: appt };
}

export async function cancelAppointment(id) {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı.');

  const { data: appt, error: getError } = await supabase.from('appointments').select('slot_id').eq('id', id).single();
  if (getError) throw new Error('Randevu bulunamadı.');

  if (appt.slot_id) {
    await supabase.from('availability').update({ is_booked: false }).eq('id', appt.slot_id);
  }

  const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id).eq('user_id', session.user.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getDoctors() {
  const { data, error } = await supabase.from('doctors').select('*, profile:profiles(*)');
  if (error) throw new Error(error.message);
  return { data };
}

export async function getAvailability(doctorId, date) {
  const { data, error } = await supabase.from('availability').select('*').eq('doctor_id', doctorId).eq('date', date).eq('is_booked', false).order('start_time');
  if (error) throw new Error(error.message);
  return { data };
}

export async function generateSlots(doctorId, startDate, endDate) {
  const { data, error } = await supabase.rpc('generate_availability', {
    p_doctor_id: doctorId,
    p_start_date: startDate,
    p_end_date: endDate
  });
  if (error) throw new Error(error.message);
  return { data };
}

export { supabase, getSession };
