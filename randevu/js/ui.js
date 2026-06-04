import { sanitizeHTML } from './api.js';

export function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  toast.innerHTML = `${icons[type] || icons.info} <span>${sanitizeHTML(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function setupModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  const close = overlay.querySelector('.modal-close');
  const cancel = overlay.querySelector('[data-dismiss]');
  if (close) close.addEventListener('click', () => closeModal(modalId));
  if (cancel) cancel.addEventListener('click', () => closeModal(modalId));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(modalId); });
}

export function confirmDialog(message, title = 'Onay') {
  return new Promise((resolve) => {
    const existing = document.querySelector('.confirm-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h3 class="modal-title">${sanitizeHTML(title)}</h3>
        </div>
        <div class="modal-body" style="font-size:14px;color:var(--text-secondary)">${sanitizeHTML(message)}</div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-cancel>Iptal</button>
          <button class="btn btn-danger" data-confirm>Evet, Eminim</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-cancel]').addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.querySelector('[data-confirm]').addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

export function showSkeleton(container, count = 3, type = 'card') {
  const skeletons = {
    card: '<div class="skeleton skeleton-card"></div>',
    text: '<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:60%"></div>',
    row: '<div style="display:flex;align-items:center;gap:12px;padding:12px 0"><div class="skeleton skeleton-avatar"></div><div style="flex:1"><div class="skeleton skeleton-text" style="width:70%"></div><div class="skeleton skeleton-text" style="width:40%"></div></div></div>'
  };
  container.innerHTML = Array(count).fill(skeletons[type] || skeletons.card).join('');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(timeStr) {
  if (!timeStr) return '-';
  return timeStr.slice(0, 5);
}

export function statusLabel(status) {
  const labels = { pending: 'Beklemede', confirmed: 'Onaylandi', cancelled: 'Iptal Edildi', completed: 'Tamamlandi' };
  return labels[status] || status;
}

export function statusBadge(status) {
  const clean = sanitizeHTML(String(status || ''));
  const label = sanitizeHTML(statusLabel(status));
  return `<span class="badge badge-${clean}">${label}</span>`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
