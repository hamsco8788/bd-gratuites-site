document.getElementById('year').textContent = new Date().getFullYear();

async function loadCatalogue() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  try {
    const res = await fetch('/.netlify/functions/list-bds');
    const bds = await res.json();

    if (!Array.isArray(bds) || bds.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = bds.map((bd) => `
      <a class="card" href="/bd.html?id=${encodeURIComponent(bd.id)}">
        ${bd.coverUrl
          ? `<img class="cover" src="${bd.coverUrl}" alt="Couverture de ${escapeHtml(bd.title)}">`
          : `<div class="cover-placeholder">📖</div>`}
        <div class="card-body">
          <h3>${escapeHtml(bd.title)}</h3>
          <span class="badge-free">Gratuit · PDF</span>
        </div>
      </a>
    `).join('');
  } catch (err) {
    empty.style.display = 'block';
    empty.innerHTML = '<p>Impossible de charger le catalogue pour le moment.</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

loadCatalogue();
