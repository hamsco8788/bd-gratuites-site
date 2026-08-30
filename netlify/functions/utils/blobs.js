const { getStore } = require('@netlify/blobs');

function store() {
  return getStore('bds');
}

async function listAll() {
  const s = store();
  const { blobs } = await s.list();
  const results = await Promise.all(
    blobs.map(async (b) => {
      const data = await s.get(b.key, { type: 'json' });
      return data;
    })
  );
  return results
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getById(id) {
  const s = store();
  return s.get(id, { type: 'json' });
}

async function save(entry) {
  const s = store();
  await s.setJSON(entry.id, entry);
  return entry;
}

async function remove(id) {
  const s = store();
  await s.delete(id);
}

module.exports = { listAll, getById, save, remove };
