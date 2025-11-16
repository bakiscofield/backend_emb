# Utiliser une image Node.js officielle
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le reste du code
COPY . .

# Créer le dossier database pour SQLite
RUN mkdir -p /app/database

# Exposer le port (sera défini par les variables d'environnement)
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "start"]
