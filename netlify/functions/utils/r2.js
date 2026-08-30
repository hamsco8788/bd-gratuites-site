const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    // Les versions recentes du SDK ajoutent par defaut une somme de controle (checksum)
    // a la signature. Le navigateur ne l'envoie pas lors d'un simple PUT depuis un <input type=file>,
    // ce qui fait echouer la signature (403) sur Cloudflare R2. On desactive ce comportement
    // pour que les URLs pre-signees fonctionnent avec de simples requetes PUT depuis le navigateur.
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

async function createPresignedPutUrl(key, contentType) {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  // URL valable 10 minutes, largement suffisant pour uploader un fichier de 200 Mo
  const url = await getSignedUrl(client, command, { expiresIn: 600 });
  return url;
}

async function deleteObject(key) {
  if (!key) return;
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

function publicUrlForKey(key) {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  return `${base}/${key}`;
}

module.exports = { createPresignedPutUrl, deleteObject, publicUrlForKey };
