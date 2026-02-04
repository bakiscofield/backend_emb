#!/usr/bin/env python3
"""
Script d'importation de la base de données depuis JSON
Usage: python3 import_database.py [chemin_backup.json] [chemin_database.db]
"""

import sqlite3
import json
import sys
import shutil
from datetime import datetime

def import_database(backup_file='full_backup.json', db_path='../database/emb.db'):
    # Charger le backup JSON
    print(f"Chargement de {backup_file}...")
    with open(backup_file, 'r', encoding='utf-8') as f:
        backup = json.load(f)

    # Créer une sauvegarde de la DB existante
    try:
        backup_name = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy(db_path, backup_name)
        print(f"Backup créé: {backup_name}")
    except FileNotFoundError:
        print("Pas de base de données existante, création d'une nouvelle...")

    # Connexion à la DB
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for table, rows in backup.items():
        if not rows:
            print(f"  - {table}: vide, ignoré")
            continue

        # Vider la table
        cursor.execute(f"DELETE FROM {table}")

        # Insérer les données
        columns = list(rows[0].keys())
        placeholders = ','.join(['?' for _ in columns])
        cols_str = ','.join(columns)

        for row in rows:
            values = [row.get(col) for col in columns]
            try:
                cursor.execute(f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})", values)
            except sqlite3.Error as e:
                print(f"    Erreur sur {table}: {e}")

        print(f"  - {table}: {len(rows)} enregistrements importés")

    conn.commit()
    conn.close()
    print("\nImportation terminée!")

if __name__ == '__main__':
    backup_file = sys.argv[1] if len(sys.argv) > 1 else 'full_backup.json'
    db_path = sys.argv[2] if len(sys.argv) > 2 else '../database/emb.db'
    import_database(backup_file, db_path)
