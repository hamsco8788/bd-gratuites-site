const { getById } = require('./utils/blobs');

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id manquant' }) };

  const bd = await getById(id);
  if (!bd) return { statusCode: 404, body: JSON.stringify({ error: 'BD introuvable' }) };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bd),
  };
};
