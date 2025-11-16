# 🐳 Déploiement Docker avec Nginx + SSL

Guide complet pour déployer EMB Backend avec Docker, Nginx et SSL automatique.

## 🎯 Architecture

```
Internet
   ↓
Docker Compose
   ├── Nginx (ports 80, 443) → Reverse Proxy + SSL
   ├── Certbot → Renouvellement automatique SSL
   └── Backend Node.js (port 5005) → API EMB
```

---

## 📋 Prérequis

1. **VPS avec Docker installé**
2. **Domaine configuré** : `emb_back.alicebot.me` → IP du VPS
3. **Ports ouverts** : 80, 443

---

## 🚀 Installation en 3 étapes

### Étape 1 : Cloner et configurer

```bash
# Sur votre VPS
cd /home
git clone https://github.com/bakiscofield/backend_emb.git backend
cd backend

# Copier le fichier .env
cp .env.production.ready .env

# Vérifier la configuration
cat .env
```

### Étape 2 : Initialiser SSL (première fois seulement)

```bash
chmod +x init-ssl.sh
./init-ssl.sh
```

Ce script va :
- ✅ Démarrer Nginx sans SSL
- ✅ Obtenir le certificat Let's Encrypt
- ✅ Configurer Nginx avec HTTPS
- ✅ Activer le renouvellement automatique

### Étape 3 : C'est fait ! 🎉

Votre API est maintenant disponible sur :
- **HTTPS :** https://emb_back.alicebot.me ✅
- **HTTP :** Redirigé automatiquement vers HTTPS

---

## 🔄 Mises à jour

Pour mettre à jour le code :

```bash
cd /home/backend
git pull origin main
./deploy-prod.sh
```

Le script `deploy-prod.sh` va :
- Arrêter les conteneurs
- Rebuilder l'image backend
- Redémarrer tous les services
- Vérifier que tout fonctionne

---

## 📊 Commandes utiles

### Voir les logs en temps réel

```bash
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f emb-backend
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f certbot
```

### État des conteneurs

```bash
docker compose -f docker-compose.prod.yml ps
```

### Redémarrer un service

```bash
# Tout redémarrer
docker compose -f docker-compose.prod.yml restart

# Un service spécifique
docker compose -f docker-compose.prod.yml restart emb-backend
docker compose -f docker-compose.prod.yml restart nginx
```

### Arrêter tout

```bash
docker compose -f docker-compose.prod.yml down
```

### Rebuilder une image

```bash
# Rebuilder le backend
docker compose -f docker-compose.prod.yml build emb-backend

# Rebuilder et redémarrer
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Renouvellement SSL

Le certificat SSL se renouvelle **automatiquement** tous les 12h grâce au conteneur Certbot.

Pour forcer un renouvellement manuel :

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 🧪 Tests

### Tester l'API

```bash
curl https://emb_back.alicebot.me
```

Résultat attendu :
```json
{
  "success": true,
  "message": "API EMB - Échange Tmoney vers Flooz",
  "version": "1.0.0"
}
```

### Vérifier le certificat SSL

```bash
curl -vI https://emb_back.alicebot.me 2>&1 | grep -i ssl
```

### Vérifier les certificats

```bash
docker compose -f docker-compose.prod.yml exec certbot certbot certificates
```

---

## 🔧 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs

# Rebuilder complètement
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Erreur SSL "certificate not found"

Le certificat n'a pas été généré. Relancez :

```bash
./init-ssl.sh
```

### Port 80 ou 443 déjà utilisé

```bash
# Trouver le processus
sudo lsof -i :80
sudo lsof -i :443

# Arrêter Nginx système (si installé)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### Renouvellement SSL échoue

```bash
# Vérifier les logs Certbot
docker compose -f docker-compose.prod.yml logs certbot

# Forcer un renouvellement
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

---

## 📁 Structure des fichiers

```
backend/
├── docker-compose.prod.yml    # Configuration Docker complète
├── Dockerfile                  # Image du backend
├── init-ssl.sh                 # Script d'initialisation SSL
├── deploy-prod.sh              # Script de déploiement
├── .env                        # Variables d'environnement
├── nginx/
│   ├── nginx.conf             # Config Nginx principale
│   └── conf.d/
│       └── emb.conf           # Config du reverse proxy + SSL
└── certbot/
    ├── conf/                  # Certificats SSL
    └── www/                   # Challenge ACME
```

---

## 🔐 Sécurité

✅ **HTTPS forcé** - Redirection automatique HTTP → HTTPS
✅ **Certificats Let's Encrypt** - Gratuits et renouvelés automatiquement
✅ **Headers de sécurité** - HSTS, X-Frame-Options, etc.
✅ **Protocoles modernes** - TLS 1.2 et 1.3 seulement
✅ **Isolation Docker** - Chaque service dans son conteneur

---

## 💡 Conseils

- Le renouvellement SSL est automatique, pas besoin d'intervention
- Les logs sont dans `/var/lib/docker/containers/`
- La base de données SQLite est persistée dans `./database`
- Les certificats SSL sont dans `./certbot/conf`

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs : `docker compose -f docker-compose.prod.yml logs`
2. Vérifiez que le DNS pointe bien vers le VPS : `dig emb_back.alicebot.me`
3. Vérifiez que les ports sont ouverts : `sudo ufw status`

---

**Déploiement Docker configuré avec ❤️ pour EMB**
