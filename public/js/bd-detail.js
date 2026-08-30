document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function loadBd() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('content');

  if (!id) {
    content.innerHTML = '<div class="empty-state"><h1>404</h1><p>BD introuvable.</p><a class="btn" href="/">Retour au catalogue</a></div>';
    return;
  }

  try {
    const res = await fetch(`/.netlify/functions/get-bd?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('not found');
    const bd = await res.json();

    document.getElementById('page-title').textContent = `${bd.title} - BD Gratuites`;

    content.innerHTML = `
      <div class="detail-wrap">
        <div>
          ${bd.coverUrl
            ? `<img class="cover-large" src="${bd.coverUrl}" alt="Couverture de ${escapeHtml(bd.title)}">`
            : `<div class="cover-placeholder" style="border-radius:14px;">📖</div>`}
        </div>
        <div>
          <h1>${escapeHtml(bd.title)}</h1>
          <div class="meta-line">PDF ${bd.pdfSizeMB ? `· ${bd.pdfSizeMB} Mo` : ''} · ${bd.downloads || 0} téléchargement${(bd.downloads||0) > 1 ? 's' : ''}</div>
          <div class="description">${escapeHtml(bd.description) || 'Pas de description disponible.'}</div>
          <button class="btn" id="download-btn">⬇️ Télécharger le PDF gratuitement</button>
        </div>
      </div>
    `;

    document.getElementById('download-btn').addEventListener('click', () => {
      fetch('/.netlify/functions/track-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bd.id }),
      }).catch(() => {});
      window.location.href = bd.pdfUrl;
    });
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><h1>404</h1><p>Cette BD n\'existe pas (ou plus).</p><a class="btn" href="/">Retour au catalogue</a></div>';
  }
}

loadBd();
