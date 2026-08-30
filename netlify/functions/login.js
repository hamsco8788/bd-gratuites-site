const { checkPassword, createSessionCookie } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Methode non autorisee' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Requete invalide.' }) };
  }

  if (!checkPassword(body.password)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Mot de passe incorrect.' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': createSessionCookie(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
