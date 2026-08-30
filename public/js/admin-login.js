document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = e.target.password.value;
  const errorBox = document.getElementById('error-box');
  errorBox.innerHTML = '';

  try {
    const res = await fetch('/.netlify/functions/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = '/admin/dashboard.html';
    } else {
      const data = await res.json();
      errorBox.innerHTML = `<div class="alert-error">${data.error || 'Mot de passe incorrect.'}</div>`;
    }
  } catch (err) {
    errorBox.innerHTML = '<div class="alert-error">Erreur de connexion. Réessaie.</div>';
  }
});
