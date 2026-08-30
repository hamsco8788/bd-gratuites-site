const MAX_PDF_SIZE_MB = 200;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const form = document.getElementById('add-form');
const messageBox = document.getElementById('message-box');
const submitBtn = document.getElementById('submit-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');

form.querySelector('input[name=cover]').addEventListener('change', (e) => {
  document.getElementById('cover-label').textContent = e.target.files[0] ? e.target.files[0].name : 'Cliquer pour choisir une image';
});
form.querySelector('input[name=pdf]').addEventListener('change', (e) => {
  document.getElementById('pdf-label').textContent = e.target.files[0] ? e.target.files[0].name : 'Cliquer pour choisir le PDF (max 200 Mo)';
});

function showError(msg) {
  messageBox.innerHTML = `<div class="alert-error">${msg}</div>`;
}

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
  const pdfFile = form.pdf.files[0];

  if (!title) return showError('Le nom de la BD est obligatoire.');
  if (!pdfFile) return showError('Le fichier PDF est obligatoire.');
  if (pdfFile.type !== 'application/pdf') return showError('Le fichier de la BD doit etre un PDF.');
  if (pdfFile.size > MAX_PDF_SIZE_BYTES) return showError(`Le PDF depasse la taille maximale de ${MAX_PDF_SIZE_MB} Mo.`);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Préparation de l\'envoi...';
  progressBar.style.display = 'block';
  progressLabel.style.display = 'block';

  try {
    // 1) Demander les URLs d'upload direct vers le stockage
    const presignRes = await fetch('/.netlify/functions/presign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfContentType: pdfFile.type,
        pdfSize: pdfFile.size,
        coverContentType: coverFile ? coverFile.type : null,
      }),
    });
    if (!presignRes.ok) {
      const err = await presignRes.json();
      throw new Error(err.error || "Impossible de préparer l'upload.");
    }
    const presign = await presignRes.json();

    // 2) Uploader les fichiers directement vers le stockage, avec barre de progression
    const totalBytes = pdfFile.size + (coverFile ? coverFile.size : 0);
    let pdfLoaded = 0;
    let coverLoaded = 0;

    function updateProgress() {
      const loaded = pdfLoaded + coverLoaded;
      const pct = totalBytes ? Math.round((loaded / totalBytes) * 100) : 0;
      progressFill.style.width = pct + '%';
      progressLabel.textContent = `Envoi en cours... ${pct}%`;
    }

    submitBtn.textContent = 'Envoi du fichier en cours...';

    const uploadTasks = [
      uploadWithProgress(presign.pdfUploadUrl, pdfFile, (loaded) => { pdfLoaded = loaded; updateProgress(); }),
    ];
    if (coverFile && presign.coverUploadUrl) {
      uploadTasks.push(
        uploadWithProgress(presign.coverUploadUrl, coverFile, (loaded) => { coverLoaded = loaded; updateProgress(); })
      );
    }
    await Promise.all(uploadTasks);

    // 3) Enregistrer la fiche BD
    submitBtn.textContent = 'Enregistrement...';
    const createRes = await fetch('/.netlify/functions/create-bd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        pdfKey: presign.pdfKey,
        pdfPublicUrl: presign.pdfPublicUrl,
        pdfSizeMB: (pdfFile.size / (1024 * 1024)).toFixed(1),
        coverKey: presign.coverKey,
        coverPublicUrl: presign.coverPublicUrl,
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error || "Impossible d'enregistrer la BD.");
    }

    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    showError(err.message || 'Une erreur est survenue.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publier la BD';
    progressBar.style.display = 'none';
    progressLabel.style.display = 'none';
  }
});
