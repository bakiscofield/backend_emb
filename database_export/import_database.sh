#!/bin/bash

# Script d'importation de la base de données depuis JSON
# Usage: ./import_database.sh [chemin_vers_db] [chemin_vers_backup_json]

DB_PATH="${1:-../database/emb.db}"
BACKUP_FILE="${2:-full_backup.json}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erreur: Fichier de backup '$BACKUP_FILE' non trouvé"
    exit 1
fi

echo "Importation de $BACKUP_FILE vers $DB_PATH"

# Installer jq si nécessaire (pour parser JSON)
if ! command -v jq &> /dev/null; then
    echo "Installation de jq..."
    sudo apt-get install -y jq
fi

# Créer une sauvegarde avant import
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "${DB_PATH}.backup_$(date +%Y%m%d_%H%M%S)"
    echo "Backup créé: ${DB_PATH}.backup_$(date +%Y%m%d_%H%M%S)"
fi

# Importer chaque table
for table in $(jq -r 'keys[]' "$BACKUP_FILE"); do
    echo "Importation de la table: $table"

    # Vider la table existante
    sqlite3 "$DB_PATH" "DELETE FROM $table;" 2>/dev/null

    # Obtenir les données de la table
    jq -r ".$table | .[]? | @json" "$BACKUP_FILE" | while read -r row; do
        # Obtenir les colonnes et valeurs
        cols=$(echo "$row" | jq -r 'keys | join(",")')
        vals=$(echo "$row" | jq -r '[.[] | if type == "string" then "\"" + (. | gsub("\""; "\"\"")) + "\"" elif . == null then "NULL" else . end] | join(",")')

        if [ -n "$cols" ] && [ "$cols" != "" ]; then
            sqlite3 "$DB_PATH" "INSERT INTO $table ($cols) VALUES ($vals);" 2>/dev/null
        fi
    done
done

echo "Importation terminée!"
