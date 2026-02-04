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

console.log('\nImportation des tables...');

const tables = Object.entries(backup);
let index = 0;

function processNextTable() {
    if (index >= tables.length) {
        db.close(() => {
            console.log('\nImportation terminée!');
        });
        return;
    }

    const [table, rows] = tables[index];
    index++;

    if (!rows || rows.length === 0) {
        console.log(`  - ${table}: vide, ignoré`);
        processNextTable();
        return;
    }

    // Vider la table
    db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
            console.log(`  - ${table}: ERREUR DELETE - ${err.message}`);
            processNextTable();
            return;
        }

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const colsStr = columns.join(',');
        const sql = `INSERT INTO ${table} (${colsStr}) VALUES (${placeholders})`;

        const stmt = db.prepare(sql);
        let inserted = 0;
        let errors = 0;

        db.serialize(() => {
            rows.forEach((row) => {
                const values = columns.map(col => row[col] ?? null);
                stmt.run(values, (err) => {
                    if (err) errors++;
                    else inserted++;
                });
            });

            stmt.finalize(() => {
                if (errors > 0) {
                    console.log(`  - ${table}: ${inserted} importés, ${errors} erreurs`);
                } else {
                    console.log(`  - ${table}: ${inserted} enregistrements importés`);
                }
                processNextTable();
            });
        });
    });
}

db.serialize(() => {
    processNextTable();
});
