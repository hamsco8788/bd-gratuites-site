const { getById, save } = require('./utils/blobs');

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Requete invalide.' }) };
  }

  const bd = await getById(body.id);
  if (!bd) return { statusCode: 404, body: JSON.stringify({ error: 'BD introuvable' }) };

  bd.downloads = (bd.downloads || 0) + 1;
  await save(bd);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
