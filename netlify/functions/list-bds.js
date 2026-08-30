const { listAll } = require('./utils/blobs');

exports.handler = async () => {
  try {
    const bds = await listAll();
    // On ne renvoie que ce dont le catalogue public a besoin
    const publicList = bds.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      coverUrl: b.coverUrl,
      pdfSizeMB: b.pdfSizeMB,
      downloads: b.downloads || 0,
      createdAt: b.createdAt,
    }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publicList),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
