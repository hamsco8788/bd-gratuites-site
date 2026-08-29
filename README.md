# 📚 BD Gratuites — Netlify + Cloudflare R2

Site pour héberger et partager gratuitement des BD en PDF (jusqu'à 200 Mo par fichier), avec catalogue public,
fiche par BD, et espace admin pour ajouter/modifier/supprimer des BD.

## ⚠️ Pourquoi Cloudflare R2 en plus de Netlify ?

Netlify est excellent pour héberger le site, mais ses fonctions serverless sont limitées à **6 Mo par requête**.
Il est donc **impossible** de faire transiter un PDF de 200 Mo à travers une fonction Netlify.

La solution : le PDF est envoyé **directement depuis le navigateur vers Cloudflare R2** (stockage de fichiers,
10 Go gratuits, aucun frais de bande passante). Netlify ne gère que le site, l'authentification admin et les
informations de chaque BD (titre, description...). C'est l'architecture standard pour ce type de site sur Netlify.

Tu as donc besoin de **deux comptes gratuits** : Netlify (hébergement) + Cloudflare (stockage des PDF).

---

## 🧱 Étape 1 — Configurer Cloudflare R2

1. Crée un compte sur [dash.cloudflare.com](https://dash.cloudflare.com) (gratuit).
2. Dans le menu de gauche, va dans **R2 Object Storage** → **Create bucket**.
   - Nom du bucket : `bd-gratuites` (ou ce que tu veux, à reporter dans `.env`)
3. Une fois le bucket créé, va dans son onglet **Settings** :
   - Active **Public access** (pour que les liens de téléchargement fonctionnent directement).
   - Note l'URL publique fournie (du type `https://pub-xxxxxxxx.r2.dev`) → c'est ta variable `R2_PUBLIC_URL`.
4. Toujours dans les settings du bucket, configure les **règles CORS** (nécessaire pour que le navigateur
   puisse uploader directement) :
   ```json
   [
     {
       "AllowedOrigins": ["https://TON-SOUS-DOMAINE.netlify.app"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
   (Tu pourras ajouter ton domaine personnalisé plus tard dans cette liste.)
5. Va dans **R2 → Manage API tokens** → **Create API token** :
   - Permissions : **Object Read & Write** sur ton bucket.
   - Note les 3 informations données : **Account ID**, **Access Key ID**, **Secret Access Key**.

Tu as maintenant tout ce qu'il faut pour remplir les variables `R2_...` du fichier `.env`.

---

## 🧱 Étape 2 — Configurer le projet en local (optionnel mais recommandé pour tester)

```bash
npm install -g netlify-cli
npm install
cp .env.example .env
```

Remplis `.env` avec :
- `ADMIN_PASSWORD=Azerty2014@` (déjà pré-rempli)
- `AUTH_SECRET` : une longue chaîne aléatoire (change la valeur d'exemple)
- Les 4 informations `R2_...` récupérées à l'étape 1

Lance le site en local :
```bash
netlify dev
```
Ouvre `http://localhost:8888`.

---

## 🚀 Étape 3 — Déployer sur Netlify avec un sous-domaine

1. Pousse ce dossier sur un dépôt GitHub (ou utilise le glisser-déposer Netlify si tu ne veux pas utiliser Git).
2. Va sur [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
3. Connecte ton dépôt GitHub. Netlify détecte automatiquement `netlify.toml` (dossier de publication `public`,
   fonctions dans `netlify/functions`).
4. Avant le premier déploiement (ou juste après), va dans **Site configuration → Environment variables** et
   ajoute exactement les mêmes variables que dans ton `.env` :
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
5. Déploie. Netlify t'attribue automatiquement un sous-domaine gratuit du type
   `https://ton-nom-au-choix.netlify.app` — modifiable dans **Site configuration → Domain management → Options → Edit site name**.
6. Retourne dans les règles CORS de ton bucket R2 (étape 1) et remplace l'URL d'exemple par ton vrai sous-domaine Netlify.

Ton site est en ligne. Tu pourras plus tard y attacher un vrai nom de domaine (ex: `bdgratuites.com`) depuis
le même menu **Domain management**, sans rien changer au code.

---

## 🔐 Accès admin

- Connexion : `https://ton-site.netlify.app/admin/login.html`
- Mot de passe : celui défini dans `ADMIN_PASSWORD`

## 📤 Ajouter une BD

Le formulaire (`/admin/add.html`) ne demande que :
- **Nom de la BD** (obligatoire)
- **Description**
- **Affiche de la BD** (image de couverture, optionnelle)
- **Fichier PDF** (obligatoire, 200 Mo max)

Le PDF et l'affiche sont envoyés directement vers Cloudflare R2 depuis le navigateur (avec barre de progression),
sans jamais passer par une fonction Netlify — c'est ce qui permet de dépasser les petites limites de taille.

## 📣 Publicités (à activer plus tard)

Le catalogue et chaque fiche BD contiennent déjà un emplacement réservé (`<div class="ad-slot">`) prêt à recevoir
un bloc Google AdSense ou toute autre régie publicitaire, une fois le site en ligne et validé par les régies.

## 📁 Structure du projet

```
bd-netlify-app/
├── netlify.toml
├── package.json
├── public/                      # tout ce qui est servi tel quel par Netlify
│   ├── index.html                 # catalogue
│   ├── bd.html                    # fiche produit (?id=xxx)
│   ├── admin/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── add.html
│   │   └── edit.html
│   ├── css/style.css
│   ├── img/logo.png
│   └── js/                        # scripts front (fetch vers les fonctions)
└── netlify/functions/            # backend serverless
    ├── login.js / logout.js / whoami.js     # authentification admin (cookie signé)
    ├── list-bds.js / get-bd.js              # lecture publique du catalogue
    ├── track-download.js                    # compteur de téléchargements
    ├── presign-upload.js                    # génère les URLs d'upload direct vers R2
    ├── create-bd.js / update-bd.js / delete-bd.js
    └── utils/
        ├── auth.js     # signature/vérification du cookie de session
        ├── r2.js       # client Cloudflare R2 (S3-compatible)
        └── blobs.js    # stockage des fiches BD (Netlify Blobs, inclus gratuitement)
```

## 🛠️ Notes techniques

- Les métadonnées des BD (titre, description, liens) sont stockées avec **Netlify Blobs**, un stockage clé-valeur
  inclus gratuitement avec Netlify — aucune base de données externe à gérer.
- L'authentification admin repose sur un cookie signé (HMAC), sans base de données de session.
- Change `ADMIN_PASSWORD` et `AUTH_SECRET` si tu comptes un jour rendre ce dépôt public.
