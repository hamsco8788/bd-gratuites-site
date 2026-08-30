// A inclure sur toute page admin protegee.
// Redirige vers le login si la session n'est pas valide.
(async function () {
  try {
    const res = await fetch('/.netlify/functions/whoami');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
    }
  } catch (err) {
    window.location.href = '/admin/login.html';
  }
})();
