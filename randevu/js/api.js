import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://remiwuslxbqlzuevecic.supabase.co';
const supabaseAnonKey = 'sb_publishable_bWlpyQycwdlquuzoNBxNkg_1WiFqaOo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signup(data) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.full_name, phone: data.phone, role: data.role || 'user' } }
  });
  if (error) throw new Error(error.message);
  return authData;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getProfile() {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw new Error(error.message);
  return { data: { user: session.user, profile: data } };
}

export async function updateProfile(updates) {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı');
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', session.user.id).select().single();
  if (error) throw new Error(error.message);
  return { data };
}

export async function getAppointments() {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı');
  const { data, error } = await supabase.from('appointments').select('*, doctor:doctors(*, profile:profiles(*))').eq('user_id', session.user.id).order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return { data };
}

export async function createAppointment(data) {
  const session = await getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const { data: slot, error: slotError } = await supabase.from('availability').select('*').eq('id', data.slot_id).single();
  if (slotError || !slot) throw new Error('Slot bulunamadı');
  if (slot.is_booked) throw new Error('Bu slot zaten dolu');

  const { error: bookError } = await supabase.from('availability').update({ is_booked: true }).eq('id', data.slot_id);
  if (bookError) throw new Error('Slot rezerve edilemedi');

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
  if (!session) throw new Error('Oturum bulunamadı');

  const { data: appt, error: getError } = await supabase.from('appointments').select('slot_id').eq('id', id).single();
  if (getError) throw new Error('Randevu bulunamadı');

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
