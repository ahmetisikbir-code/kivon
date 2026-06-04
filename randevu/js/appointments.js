import { getAppointments, createAppointment, cancelAppointment, getDoctors, getAvailability, sanitizeHTML } from './api.js';
import { showToast, confirmDialog, statusBadge } from './ui.js';
import { t } from './i18n.js';

export async function renderAppointments(container) {
  if (!container) return;
  try {
    const res = await getAppointments();
    const appointments = res.data || [];
    container.innerHTML = '';

    if (!appointments.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3>${sanitizeHTML(t('noAppointments'))}</h3>
          <p>WhatsApp ${sanitizeHTML(t('or'))} ${sanitizeHTML(t('bookHere'))}</p>
          <button class="btn btn-primary book-now-btn">${sanitizeHTML(t('newAppointment'))}</button>
        </div>
      `;
      const btn = container.querySelector('.book-now-btn');
      if (btn) btn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-book-modal')));
      return;
    }

    const listWrap = document.createElement('div');
    listWrap.style.display = 'flex';
    listWrap.style.flexDirection = 'column';
    listWrap.style.gap = '12px';

    appointments.forEach(apt => {
      const date = new Date(apt.date || apt.appointment_date);
      const day = date.getDate();
      const month = date.toLocaleString(t('locale'), { month: 'short' });
      const time = apt.time || (apt.appointment_time ? apt.appointment_time.slice(0, 5) : '');
      const status = (apt.status || 'pending').toLowerCase();
      const doctorName = sanitizeHTML(apt.doctor?.profile?.full_name || apt.doctor_name || t('unknownDoctor'));
      const fullDate = date.toLocaleDateString(t('locale'), { day: 'numeric', month: 'long', year: 'numeric' });

      const card = document.createElement('div');
      card.className = 'appt-card animate-fadeIn';
      card.innerHTML = `
        <div class="appt-date">
          <div class="day">${day}</div>
          <div class="month">${month}</div>
        </div>
        <div class="appt-info">
          <h4>${doctorName}</h4>
          <p>${fullDate}</p>
        </div>
        <div class="appt-time">${sanitizeHTML(time)}</div>
        ${statusBadge(status)}
        <div class="appt-actions">
          ${status === 'pending' || status === 'confirmed' ? `<button class="btn btn-sm btn-danger cancel-btn" data-id="${sanitizeHTML(apt.id || apt.appointment_id)}">${sanitizeHTML(t('cancel'))}</button>` : ''}
        </div>
      `;
      listWrap.appendChild(card);

      const cancelBtn = card.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
          if (await cancelBooking(cancelBtn.dataset.id)) {
            renderAppointments(container);
          }
        });
      }
    });

    container.appendChild(listWrap);
  } catch (err) {
    container.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 40px;">${sanitizeHTML(t('error'))}<br><button class="btn btn-outline retry-btn" style="margin-top:16px">${sanitizeHTML(t('retry'))}</button></p>`;
    container.querySelector('.retry-btn')?.addEventListener('click', () => renderAppointments(container));
  }
}

export function showBookModal() {
  const overlay = document.getElementById('bookModal');
  if (!overlay) return;
  overlay.classList.add('open');
  loadDoctorsStep();
}

function hideBookModal() {
  const overlay = document.getElementById('bookModal');
  if (overlay) overlay.classList.remove('open');
}

let bookingState = { step: 1, doctorId: null, date: null, time: null, doctors: [] };

async function loadDoctorsStep() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await getDoctors();
    const list = data.data || data || [];
    bookingState.doctors = list.map(d => ({ ...d, full_name: d.profile?.full_name || d.full_name || t('unknown') }));
    bookingState.step = 1;
    renderStep1();
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger)">${sanitizeHTML(t('error'))}</p>`;
  }
}

function renderStep1() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  updateIndicators(1);

  let html = `<div class="form-group"><label>${sanitizeHTML(t('selectDoctor'))}</label><select class="form-select" id="doctorSelect">`;
  html += `<option value="">${sanitizeHTML(t('selectDoctor'))}...</option>`;
  bookingState.doctors.forEach(doc => {
    const name = sanitizeHTML(doc.full_name);
    const specialty = sanitizeHTML(doc.specialty || t('general'));
    const val = sanitizeHTML(doc.id || doc.user_id);
    html += `<option value="${val}">${name} - ${specialty}</option>`;
  });
  html += '</select></div>';
  html += `<button class="btn btn-primary form-submit" id="step1Next" disabled>${sanitizeHTML(t('next'))}</button>`;
  content.innerHTML = html;

  const select = document.getElementById('doctorSelect');
  const nextBtn = document.getElementById('step1Next');
  select.addEventListener('change', () => {
    bookingState.doctorId = select.value;
    nextBtn.disabled = !select.value;
  });
  nextBtn.addEventListener('click', () => {
    if (bookingState.doctorId) renderStep2();
  });
}

async function renderStep2() {
  const content = document.getElementById('modalContent');
  if (!content) return;
  updateIndicators(2);
  content.innerHTML = '<div class="spinner"></div>';

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  let currentMonth = month;
  let currentYear = year;

  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    let html = `
      <div class="calendar-header">
        <button id="prevMonth">&larr;</button>
        <span style="font-weight:600">${new Date(currentYear, currentMonth).toLocaleString(t('locale'), { month: 'long', year: 'numeric' })}</span>
        <button id="nextMonth">&rarr;</button>
      </div>
      <div class="calendar-grid">
    `;
    const dayNames = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
    dayNames.forEach(d => { html += `<div class="calendar-day-header">${d}</div>`; });

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="calendar-day other-month"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const isToday = dateObj.getTime() === todayDate.getTime();
      const isPast = dateObj < todayDate;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const classes = ['calendar-day'];
      if (isToday) classes.push('today');
      if (isPast) classes.push('unavailable');
      if (bookingState.date === dateStr) classes.push('selected');
      html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
    }

    html += '</div><button class="btn btn-primary form-submit" id="step2Next" style="margin-top:16px" disabled>Tarih Secin</button>';
    content.innerHTML = html;

    document.getElementById('prevMonth').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });

    content.querySelectorAll('.calendar-day:not(.other-month):not(.unavailable)').forEach(el => {
      el.addEventListener('click', () => {
        content.querySelectorAll('.calendar-day.selected').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        bookingState.date = el.dataset.date;
        document.getElementById('step2Next').disabled = false;
      });
    });

    const nextBtn = document.getElementById('step2Next');
    if (bookingState.date) {
      const matching = content.querySelector(`[data-date="${bookingState.date}"]`);
      if (matching) { matching.classList.add('selected'); nextBtn.disabled = false; }
    }
    nextBtn.addEventListener('click', () => {
      if (bookingState.date) renderStep3();
    });
  }

  renderCalendar();
}

async function renderStep3() {
  const content = document.getElementById('modalContent');
  if (!content || !bookingState.doctorId || !bookingState.date) return;
  updateIndicators(3);
  content.innerHTML = '<div class="spinner"></div>';

  try {
    const res = await getAvailability(bookingState.doctorId, bookingState.date);
    const slots = res.data || [];

    if (!slots.length) {
      content.innerHTML = `
        <p style="text-align:center;color:var(--text-muted);padding:40px">${sanitizeHTML(t('noSlots'))}</p>
        <button class="btn btn-outline form-submit back-to-doctors-btn">${sanitizeHTML(t('back'))}</button>
      `;
      content.querySelector('.back-to-doctors-btn')?.addEventListener('click', loadDoctorsStep);
      return;
    }

    let html = `<p style="margin-bottom:16px;color:var(--text-muted)">${sanitizeHTML(t('selectTime'))}:</p><div class="time-slots">`;
    slots.forEach(slot => {
      const time = slot.start_time || slot.time || slot;
      const isBooked = slot.is_booked || false;
      html += `<div class="time-slot ${isBooked ? 'disabled' : ''}" data-time="${sanitizeHTML(String(time))}" data-slot-id="${sanitizeHTML(slot.id)}">${sanitizeHTML(String(time).slice(0, 5))}</div>`;
    });
    html += `</div><button class="btn btn-primary form-submit" id="step3Confirm" style="margin-top:20px" disabled>${sanitizeHTML(t('confirm'))}</button>`;

    content.innerHTML = html;

    content.querySelectorAll('.time-slot:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        content.querySelectorAll('.time-slot.selected').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        bookingState.time = el.dataset.time;
        document.getElementById('step3Confirm').disabled = false;
      });
    });

    document.getElementById('step3Confirm').addEventListener('click', async () => {
      if (bookingState.time) {
        const selected = document.querySelector('.time-slot.selected');
        const slotId = selected?.dataset?.slotId;
        await confirmBooking(bookingState.doctorId, bookingState.date, bookingState.time, slotId);
      }
    });
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px">${sanitizeHTML(t('error'))}</p><button class="btn btn-outline form-submit back-to-doctors-btn">${sanitizeHTML(t('retry'))}</button>`;
    content.querySelector('.back-to-doctors-btn')?.addEventListener('click', loadDoctorsStep);
  }
}

async function confirmBooking(doctorId, date, time, slotId) {
  const content = document.getElementById('modalContent');
  if (!content) return;
  content.innerHTML = '<div class="spinner"></div>';
  try {
    await createAppointment({ doctor_id: doctorId, date, time, slot_id: slotId });
    content.innerHTML = `
      <div style="text-align:center;padding:40px">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="margin-bottom:16px">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h3 style="margin-bottom:8px">${sanitizeHTML(t('created'))}</h3>
        <p style="color:var(--text-muted);margin-bottom:24px">${sanitizeHTML(t('bookingSuccess'))}</p>
        <button class="btn btn-primary close-booking-btn">${sanitizeHTML(t('done'))}</button>
      </div>
    `;
    content.querySelector('.close-booking-btn')?.addEventListener('click', () => { hideBookModal(); location.reload(); });
    bookingState = { step: 1, doctorId: null, date: null, time: null, doctors: bookingState.doctors };
    setTimeout(() => hideBookModal(), 3000);
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px">${sanitizeHTML(t('error'))}</p><button class="btn btn-outline form-submit back-to-doctors-btn">${sanitizeHTML(t('retry'))}</button>`;
    content.querySelector('.back-to-doctors-btn')?.addEventListener('click', loadDoctorsStep);
  }
}

export async function cancelBooking(id) {
  const confirmed = await confirmDialog(t('cancelConfirm'), t('cancel'));
  if (!confirmed) return false;
  try {
    await cancelAppointment(id);
    showToast(t('cancelled'), 'success');
    return true;
  } catch (err) {
    showToast(t('error'), 'error');
    return false;
  }
}

function updateIndicators(activeStep) {
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 === activeStep) el.classList.add('active');
    else if (i + 1 < activeStep) el.classList.add('completed');
  });
}

export function setupBookModal() {
  const overlay = document.getElementById('bookModal');
  if (!overlay) return;

  const closeBtn = overlay.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideBookModal);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideBookModal();
  });

  window.addEventListener('open-book-modal', () => showBookModal());
}
