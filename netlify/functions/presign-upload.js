const crypto = require('crypto');
const { isAuthenticated } = require('./utils/auth');
const { createPresignedPutUrl, publicUrlForKey } = require('./utils/r2');

const MAX_PDF_SIZE_MB = 200;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

exports.handler = async (event) => {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifie.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Methode non autorisee' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Requete invalide.' }) };
  }

  const { pdfContentType, pdfSize, coverContentType } = body;

  if (!pdfContentType || pdfContentType !== 'application/pdf') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Le fichier de la BD doit etre un PDF.' }) };
  }
  if (pdfSize && pdfSize > MAX_PDF_SIZE_BYTES) {
    return { statusCode: 400, body: JSON.stringify({ error: `Le PDF depasse la taille maximale de ${MAX_PDF_SIZE_MB} Mo.` }) };
  }

  const uid = crypto.randomBytes(8).toString('hex');
  const pdfKey = `pdfs/${uid}.pdf`;
  const pdfUploadUrl = await createPresignedPutUrl(pdfKey, 'application/pdf');

  let coverKey = null;
  let coverUploadUrl = null;
  if (coverContentType) {
    const ext = coverContentType.split('/')[1] || 'jpg';
    coverKey = `covers/${uid}.${ext}`;
    coverUploadUrl = await createPresignedPutUrl(coverKey, coverContentType);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      pdfKey,
      pdfUploadUrl,
      pdfPublicUrl: publicUrlForKey(pdfKey),
      coverKey,
      coverUploadUrl,
      coverPublicUrl: coverKey ? publicUrlForKey(coverKey) : null,
      maxSizeMb: MAX_PDF_SIZE_MB,
    }),
  };
};
