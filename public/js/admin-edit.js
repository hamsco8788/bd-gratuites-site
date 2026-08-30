const MAX_PDF_SIZE_MB = 200;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const params = new URLSearchParams(window.location.search);
const bdId = params.get('id');

const form = document.getElementById('edit-form');
const messageBox = document.getElementById('message-box');
const submitBtn = document.getElementById('submit-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');

function showError(msg) {
  messageBox.innerHTML = `<div class="alert-error">${msg}</div>`;
}

async function loadBd() {
  if (!bdId) return showError('BD introuvable.');
  const res = await fetch(`/.netlify/functions/get-bd?id=${encodeURIComponent(bdId)}`);
  if (!res.ok) return showError('BD introuvable.');
  const bd = await res.json();

  form.title.value = bd.title || '';
  form.description.value = bd.description || '';
  document.getElementById('current-pdf-info').textContent = `Fichier actuel : ${bd.pdfSizeMB || '?'} Mo`;
  document.getElementById('page-heading').textContent = `Modifier « ${bd.title} »`;
}
loadBd();

form.querySelector('input[name=cover]').addEventListener('change', (e) => {
  document.getElementById('cover-label').textContent = e.target.files[0] ? e.target.files[0].name : 'Cliquer pour choisir une nouvelle image';
});
form.querySelector('input[name=pdf]').addEventListener('change', (e) => {
  document.getElementById('pdf-label').textContent = e.target.files[0] ? e.target.files[0].name : 'Cliquer pour choisir un nouveau PDF (max 200 Mo)';
});

function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Echec de l'upload (code ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Erreur reseau pendant l'upload."));
    xhr.send(file);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageBox.innerHTML = '';

  const title = form.title.value.trim();
  const description = form.description.value.trim();
  const coverFile = form.cover.files[0] || null;
  const pdfFile = form.pdf.files[0] || null;

  if (!title) return showError('Le nom de la BD est obligatoire.');
  if (pdfFile && pdfFile.type !== 'application/pdf') return showError('Le fichier de la BD doit etre un PDF.');
  if (pdfFile && pdfFile.size > MAX_PDF_SIZE_BYTES) return showError(`Le PDF depasse la taille maximale de ${MAX_PDF_SIZE_MB} Mo.`);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement...';

  try {
    let pdfKey = null, pdfPublicUrl = null, pdfSizeMB = null;
    let coverKey = null, coverPublicUrl = null;

    if (pdfFile || coverFile) {
      progressBar.style.display = 'block';
      progressLabel.style.display = 'block';

      const presignRes = await fetch('/.netlify/functions/presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfContentType: pdfFile ? pdfFile.type : 'application/pdf',
          pdfSize: pdfFile ? pdfFile.size : 0,
          coverContentType: coverFile ? coverFile.type : null,
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Impossible de préparer l'upload.");
      }
      const presign = await presignRes.json();

      const totalBytes = (pdfFile ? pdfFile.size : 0) + (coverFile ? coverFile.size : 0);
      let pdfLoaded = 0, coverLoaded = 0;
      function updateProgress() {
        const loaded = pdfLoaded + coverLoaded;
        const pct = totalBytes ? Math.round((loaded / totalBytes) * 100) : 0;
        progressFill.style.width = pct + '%';
        progressLabel.textContent = `Envoi en cours... ${pct}%`;
      }

      const tasks = [];
      if (pdfFile) {
        tasks.push(uploadWithProgress(presign.pdfUploadUrl, pdfFile, (l) => { pdfLoaded = l; updateProgress(); }));
        pdfKey = presign.pdfKey;
        pdfPublicUrl = presign.pdfPublicUrl;
        pdfSizeMB = (pdfFile.size / (1024 * 1024)).toFixed(1);
      }
      if (coverFile && presign.coverUploadUrl) {
        tasks.push(uploadWithProgress(presign.coverUploadUrl, coverFile, (l) => { coverLoaded = l; updateProgress(); }));
        coverKey = presign.coverKey;
        coverPublicUrl = presign.coverPublicUrl;
      }
      await Promise.all(tasks);
    }

    const updateRes = await fetch('/.netlify/functions/update-bd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bdId, title, description, pdfKey, pdfPublicUrl, pdfSizeMB, coverKey, coverPublicUrl }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error || 'Impossible de mettre à jour la BD.');
    }

    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    showError(err.message || 'Une erreur est survenue.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enregistrer les modifications';
    progressBar.style.display = 'none';
    progressLabel.style.display = 'none';
  }
});
