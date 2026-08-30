const { isAuthenticated } = require('./utils/auth');
const { getById, save } = require('./utils/blobs');
const { deleteObject } = require('./utils/r2');

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

  const { id, title, description, pdfKey, pdfPublicUrl, pdfSizeMB, coverKey, coverPublicUrl } = body;
  const existing = await getById(id);
  if (!existing) return { statusCode: 404, body: JSON.stringify({ error: 'BD introuvable' }) };

  if (title !== undefined) existing.title = title.trim();
  if (description !== undefined) existing.description = description.trim();

  if (pdfKey && pdfKey !== existing.pdfKey) {
    await deleteObject(existing.pdfKey);
    existing.pdfKey = pdfKey;
    existing.pdfUrl = pdfPublicUrl;
    existing.pdfSizeMB = pdfSizeMB || existing.pdfSizeMB;
  }

  if (coverKey && coverKey !== existing.coverKey) {
    if (existing.coverKey) await deleteObject(existing.coverKey);
    existing.coverKey = coverKey;
    existing.coverUrl = coverPublicUrl;
  }

  await save(existing);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existing) };
};
