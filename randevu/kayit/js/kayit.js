import { supabase, signup, login, validateEmail, validatePassword, validateTurkishPhone, getPasswordStrength } from '../../js/api.js';

const sectorIcons = { doktor: '[D]', kuaför: '[H]', guzellik: '[*]' };
const sectorSelect = document.getElementById('sector');
const sectorIcon = document.getElementById('sectorIcon');

sectorSelect.addEventListener('change', () => {
  const val = sectorSelect.value;
  sectorIcon.textContent = sectorIcons[val] || '[?]';
  const bgColors = { doktor: '#dbeafe', kuaför: '#fce7f3', guzellik: '#ede9fe' };
  sectorIcon.style.background = bgColors[val] || '#e0f2fe';
});

const passwordInput = document.getElementById('password');
const strBars = document.querySelectorAll('.pw-strength .bar');
const strLabel = document.getElementById('strLabel');

passwordInput.addEventListener('input', () => {
  const result = getPasswordStrength(passwordInput.value);
  const activeCount = Math.ceil(result.score / 25);
  strBars.forEach((bar, i) => {
    bar.className = 'bar';
    if (i < activeCount) bar.classList.add('active', result.class);
  });
  strLabel.textContent = result.label || '';
  strLabel.className = 'str-label ' + result.class;
});

const sectorMap = { doktor: 'doktor', kuaför: 'kuaför', guzellik: 'guzellik' };

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('errorBox');
  const successEl = document.getElementById('successBox');
  const btn = document.getElementById('submitBtn');
  errEl.classList.remove('visible');
  errEl.textContent = '';
  successEl.classList.remove('visible');

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const fullName = firstName + ' ' + lastName;
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = passwordInput.value;
  const sector = sectorSelect.value;

  if (!firstName || !lastName || !email || !phone || !password || !sector) {
    errEl.textContent = 'Lutfen tum alanlari doldurun.';
    errEl.classList.add('visible');
    return;
  }

  if (!validateEmail(email)) {
    errEl.textContent = 'Gecerli bir e-posta adresi girin.';
    errEl.classList.add('visible');
    return;
  }

  if (!validateTurkishPhone(phone)) {
    errEl.textContent = 'Gecerli bir telefon numarasi girin (05XX XXX XX XX).';
    errEl.classList.add('visible');
    return;
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    errEl.textContent = pwCheck.message;
    errEl.classList.add('visible');
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');

  try {
    await signup({ full_name: fullName, email, phone, password, role: 'doctor', sector: sectorMap[sector] || sector });

    await login(email, password);

    successEl.innerHTML = '<span class="emoji">[OK]</span>Hosgeldin! Admin paneline yonlendiriliyorsun...';
    successEl.classList.add('visible');

    setTimeout(() => {
      window.location.href = '../admin/';
    }, 2000);
  } catch (err) {
    errEl.textContent = err.message || 'Bir hata olustu.';
    errEl.classList.add('visible');
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});
