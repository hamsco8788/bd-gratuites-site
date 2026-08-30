document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/.netlify/functions/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function loadDashboard() {
  const wrap = document.getElementById('table-wrap');
  try {
    const res = await fetch('/.netlify/functions/list-bds');
    const bds = await res.json();

    if (!Array.isArray(bds) || bds.length === 0) {
      wrap.innerHTML = '<div class="empty-state"><p>Aucune BD pour le moment. Ajoute la première !</p></div>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Taille</th>
            <th>Téléchargements</th>
            <th>Ajouté le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bds.map((bd) => `
            <tr>
              <td><a href="/bd.html?id=${encodeURIComponent(bd.id)}" target="_blank">${escapeHtml(bd.title)}</a></td>
              <td>${bd.pdfSizeMB ? bd.pdfSizeMB + ' Mo' : '—'}</td>
              <td>${bd.downloads || 0}</td>
              <td>${new Date(bd.createdAt).toLocaleDateString('fr-FR')}</td>
              <td class="row-actions">
                <a class="btn small secondary" href="/admin/edit.html?id=${encodeURIComponent(bd.id)}">Modifier</a>
                <button class="btn small danger" data-id="${bd.id}" data-title="${escapeHtml(bd.title)}">Supprimer</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer définitivement "${btn.dataset.title}" ?`)) return;
        btn.disabled = true;
        await fetch('/.netlify/functions/delete-bd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: btn.dataset.id }),
        });
        loadDashboard();
      });
    });
  } catch (err) {
    wrap.innerHTML = '<div class="empty-state"><p>Impossible de charger les BD.</p></div>';
  }
}

loadDashboard();
