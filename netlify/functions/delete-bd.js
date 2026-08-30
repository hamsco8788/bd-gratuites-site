const { isAuthenticated } = require('./utils/auth');
const { getById, remove } = require('./utils/blobs');
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

  const bd = await getById(body.id);
  if (!bd) return { statusCode: 404, body: JSON.stringify({ error: 'BD introuvable' }) };

  await deleteObject(bd.pdfKey);
  if (bd.coverKey) await deleteObject(bd.coverKey);
  await remove(bd.id);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
