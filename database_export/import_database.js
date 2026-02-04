#!/usr/bin/env node
/**
 * Script d'importation de la base de données depuis JSON
 * Usage: node import_database.js [chemin_backup.json] [chemin_database.db]
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2] || path.join(__dirname, 'full_backup.json');
const dbPath = process.argv[3] || path.join(__dirname, '../database/emb.db');

console.log(`Chargement de ${backupFile}...`);

// Charger le backup JSON
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

// Créer une sauvegarde de la DB existante
if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `${dbPath}.backup_${timestamp}`;
    fs.copyFileSync(dbPath, backupName);
    console.log(`Backup créé: ${backupName}`);
}

// Connexion à la DB
const db = new sqlite3.Database(dbPath);

// Fonction pour obtenir les colonnes existantes d'une table
function getTableColumns(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.name));
        });
    });
}

// Fonction pour importer une table
async function importTable(table, rows) {
    if (!rows || rows.length === 0) {
        console.log(`  - ${table}: vide, ignoré`);
        return;
    }

    try {
        // Obtenir les colonnes existantes dans la DB
        const existingColumns = await getTableColumns(table);

        // Filtrer les colonnes du backup pour ne garder que celles qui existent
        const backupColumns = Object.keys(rows[0]);
        const validColumns = backupColumns.filter(col => existingColumns.includes(col));
        const skippedColumns = backupColumns.filter(col => !existingColumns.includes(col));

        if (skippedColumns.length > 0) {
            console.log(`  - ${table}: colonnes ignorées (n'existent pas): ${skippedColumns.join(', ')}`);
        }

        if (validColumns.length === 0) {
            console.log(`  - ${table}: aucune colonne valide, ignoré`);
            return;
        }

        // Vider la table
        await new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${table}`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const placeholders = validColumns.map(() => '?').join(',');
        const colsStr = validColumns.join(',');
        const sql = `INSERT INTO ${table} (${colsStr}) VALUES (${placeholders})`;

        let inserted = 0;
        let errors = 0;

        for (const row of rows) {
            const values = validColumns.map(col => row[col] ?? null);
            await new Promise((resolve) => {
                db.run(sql, values, (err) => {
                    if (err) {
                        errors++;
                    } else {
                        inserted++;
                    }
                    resolve();
                });
            });
        }

        if (errors > 0) {
            console.log(`  - ${table}: ${inserted} importés, ${errors} erreurs`);
        } else {
            console.log(`  - ${table}: ${inserted} enregistrements importés`);
        }
    } catch (err) {
        console.log(`  - ${table}: ERREUR - ${err.message}`);
    }
}

// Fonction principale
async function main() {
    console.log('\nImportation des tables...');

    for (const [table, rows] of Object.entries(backup)) {
        await importTable(table, rows);
    }

    db.close(() => {
        console.log('\nImportation terminée!');
    });
}

main().catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
});
