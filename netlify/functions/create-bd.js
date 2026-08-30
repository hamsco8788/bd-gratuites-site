const crypto = require('crypto');
const { isAuthenticated } = require('./utils/auth');
const { save } = require('./utils/blobs');

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

  const { title, description, pdfKey, pdfPublicUrl, pdfSizeMB, coverKey, coverPublicUrl } = body;

  if (!title || !pdfKey || !pdfPublicUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Titre et PDF sont obligatoires.' }) };
  }

  const entry = {
    id: crypto.randomBytes(6).toString('hex'),
    title: title.trim(),
    description: (description || '').trim(),
    pdfKey,
    pdfUrl: pdfPublicUrl,
    pdfSizeMB: pdfSizeMB || null,
    coverKey: coverKey || null,
    coverUrl: coverPublicUrl || null,
    downloads: 0,
    createdAt: new Date().toISOString(),
  };

  await save(entry);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  };
};
