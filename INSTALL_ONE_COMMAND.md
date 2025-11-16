# 🚀 Installation en UNE seule commande !

## Sur votre VPS

Connectez-vous à votre VPS et exécutez :

```bash
curl -fsSL https://raw.githubusercontent.com/bakiscofield/backend_emb/main/install-vps.sh | bash
```

**C'est tout ! 🎉**

Le script va automatiquement :
- ✅ Installer Docker
- ✅ Installer Nginx
- ✅ Installer Certbot (SSL)
- ✅ Cloner le repository
- ✅ Déployer l'application
- ✅ Configurer le reverse proxy
- ✅ Configurer le pare-feu

---

## Ou installation manuelle (si vous préférez)

```bash
# 1. Connectez-vous à votre VPS
ssh root@votre-ip

# 2. Téléchargez et exécutez le script
wget https://raw.githubusercontent.com/bakiscofield/backend_emb/main/install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

---

## Après l'installation

Testez votre API :
```bash
curl https://emb_back.alicebot.me
```

Devrait retourner :
```json
{
  "success": true,
  "message": "API EMB - Échange Tmoney vers Flooz",
  "version": "1.0.0"
}
```

---

## Configuration

Tout est déjà configuré !

- **JWT_SECRET** : Généré automatiquement et sécurisé ✅
- **Base de données** : SQLite créée automatiquement ✅
- **SSL** : Let's Encrypt configuré ✅

Il vous reste juste à mettre à jour `FRONTEND_URL` dans le fichier `.env` après avoir déployé le frontend :

```bash
cd /var/www/emb/backend
nano .env
# Modifiez FRONTEND_URL=https://votre-frontend-url.vercel.app
docker-compose restart
```

---

## Prérequis

- VPS Ubuntu 20.04+ ou Debian 11+
- Domaine `emb_back.alicebot.me` pointant vers l'IP du VPS
- Accès SSH root ou sudo

---

**Temps d'installation : ~5 minutes**

**Difficulté : 😊 Très facile (tout est automatisé !)**
