const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration du transporteur Gmail
const createTransporter = () => {
  // Vérifier si les variables d'environnement sont configurées
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Variables EMAIL_USER et EMAIL_PASSWORD non configurées. Les emails seront affichés dans la console.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Générer un code à 3 chiffres
const generateVerificationCode = () => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Envoyer un email de vérification
const sendVerificationCode = async (email, code) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL DE VÉRIFICATION (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Code de vérification EMB Transfer`);
    console.log(`\nBonjour,\n`);
    console.log(`Votre code de vérification est: ${code}`);
    console.log(`\nCe code expire dans 10 minutes.`);
    console.log(`\nSi vous n'avez pas demandé ce code, ignorez cet email.`);
    console.log(`\nCordialement,`);
    console.log(`L'équipe EMB Transfer`);
    console.log('====================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Code de vérification - EMB Transfer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #FF3B38;
              border-radius: 16px;
              padding: 40px;
              text-align: center;
            }
            .code-box {
              background-color: #FF3B38;
              color: #ffffff;
              font-size: 48px;
              font-weight: bold;
              padding: 20px;
              border-radius: 12px;
              margin: 30px 0;
              letter-spacing: 10px;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: rgba(255, 59, 56, 0.1);
              border-left: 4px solid #FF3B38;
              padding: 15px;
              margin-top: 30px;
              text-align: left;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMILE TRANSFER+</div>
            </div>

            <div class="content">
              <h1 style="color: #FF3B38; margin-top: 0;">Code de Vérification</h1>

              <p class="message">
                Bonjour,<br><br>
                Voici votre code de vérification pour créer votre compte EMB Transfer :
              </p>

              <div class="code-box">${code}</div>

              <p class="message">
                Ce code est valide pendant <strong>10 minutes</strong>.
              </p>

              <div class="warning">
                <strong>⚠️ Important :</strong><br>
                Si vous n'avez pas demandé ce code, veuillez ignorer cet email.
                Ne partagez jamais ce code avec qui que ce soit.
              </div>
            </div>

            <div class="footer">
              <p>
                Cet email a été envoyé automatiquement par EMB Transfer.<br>
                Merci de ne pas répondre à cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        EMILE TRANSFER+

        Code de Vérification

        Bonjour,

        Votre code de vérification est: ${code}

        Ce code expire dans 10 minutes.

        Si vous n'avez pas demandé ce code, ignorez cet email.

        Cordialement,
        L'équipe EMB Transfer
      `
    });

    console.log('✅ Email de vérification envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email de réinitialisation de mot de passe
const sendPasswordResetCode = async (email, code) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL RÉINITIALISATION (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Réinitialisation de mot de passe - EMB Transfer`);
    console.log(`\nBonjour,\n`);
    console.log(`Votre code de réinitialisation est: ${code}`);
    console.log(`\nCe code expire dans 10 minutes.`);
    console.log(`\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.`);
    console.log(`\nCordialement,`);
    console.log(`L'équipe EMB Transfer`);
    console.log('=================================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe - EMB Transfer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #FF3B38;
              border-radius: 16px;
              padding: 40px;
              text-align: center;
            }
            .code-box {
              background-color: #FF3B38;
              color: #ffffff;
              font-size: 48px;
              font-weight: bold;
              padding: 20px;
              border-radius: 12px;
              margin: 30px 0;
              letter-spacing: 10px;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .warning {
              background-color: rgba(255, 59, 56, 0.1);
              border-left: 4px solid #FF3B38;
              padding: 15px;
              margin-top: 30px;
              text-align: left;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMILE TRANSFER+</div>
            </div>

            <div class="content">
              <h1 style="color: #FF3B38; margin-top: 0;">Réinitialisation de Mot de Passe</h1>

              <p class="message">
                Bonjour,<br><br>
                Vous avez demandé la réinitialisation de votre mot de passe.<br>
                Voici votre code de vérification :
              </p>

              <div class="code-box">${code}</div>

              <p class="message">
                Ce code est valide pendant <strong>10 minutes</strong>.
              </p>

              <div class="warning">
                <strong>⚠️ Important :</strong><br>
                Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
                et votre mot de passe restera inchangé.<br>
                Ne partagez jamais ce code avec qui que ce soit.
              </div>
            </div>

            <div class="footer">
              <p>
                Cet email a été envoyé automatiquement par EMB Transfer.<br>
                Merci de ne pas répondre à cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        EMILE TRANSFER+

        Réinitialisation de Mot de Passe

        Bonjour,

        Votre code de réinitialisation est: ${code}

        Ce code expire dans 10 minutes.

        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

        Cordialement,
        L'équipe EMB Transfer
      `
    });

    console.log('✅ Email de réinitialisation envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email de confirmation de transaction créée
const sendTransactionCreated = async (email, transactionData) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL TRANSACTION CRÉÉE (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Demande d'échange créée - ${transactionData.transaction_id}`);
    console.log(`\nBonjour ${transactionData.userName},\n`);
    console.log(`Votre demande d'échange a été créée avec succès.`);
    console.log(`\nDétails de la transaction:`);
    console.log(`- ID: ${transactionData.transaction_id}`);
    console.log(`- Montant: ${transactionData.amount} FCFA`);
    console.log(`- Commission: ${transactionData.commission} FCFA`);
    console.log(`- Montant total: ${transactionData.total_amount} FCFA`);
    console.log(`- De: ${transactionData.from_number}`);
    console.log(`- Vers: ${transactionData.to_number}`);
    console.log(`- Statut: En attente de validation`);
    console.log(`\nNous traiterons votre demande dans les plus brefs délais.`);
    console.log('====================================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Demande d'échange créée - ${transactionData.transaction_id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #FF3B38;
              border-radius: 16px;
              padding: 40px;
            }
            .transaction-id {
              background-color: #FF3B38;
              color: #ffffff;
              font-size: 24px;
              font-weight: bold;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .details-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .details-table td {
              padding: 12px;
              border-bottom: 1px solid #333;
            }
            .details-table td:first-child {
              color: #999;
              width: 40%;
            }
            .details-table td:last-child {
              color: #fff;
              font-weight: bold;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              background-color: #FFA500;
              color: #fff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMILE TRANSFER+</div>
            </div>

            <div class="content">
              <h1 style="color: #FF3B38; margin-top: 0; text-align: center;">Demande d'échange créée</h1>

              <p class="message">
                Bonjour <strong>${transactionData.userName}</strong>,<br><br>
                Votre demande d'échange a été créée avec succès et est maintenant en attente de validation par notre équipe.
              </p>

              <div class="transaction-id">${transactionData.transaction_id}</div>

              <table class="details-table">
                <tr>
                  <td>Montant à échanger</td>
                  <td>${transactionData.amount} FCFA</td>
                </tr>
                <tr>
                  <td>Commission</td>
                  <td>${transactionData.commission} FCFA</td>
                </tr>
                ${transactionData.tax_amount > 0 ? `
                <tr>
                  <td>Taxe</td>
                  <td>${transactionData.tax_amount} FCFA</td>
                </tr>
                ` : ''}
                <tr>
                  <td>Montant total</td>
                  <td style="color: #FF3B38;">${transactionData.total_amount} FCFA</td>
                </tr>
                <tr>
                  <td>Numéro source</td>
                  <td>${transactionData.from_number}</td>
                </tr>
                <tr>
                  <td>Numéro destination</td>
                  <td>${transactionData.to_number}</td>
                </tr>
                <tr>
                  <td>Statut</td>
                  <td><span class="status-badge">En attente</span></td>
                </tr>
              </table>

              <p class="message">
                Nous traiterons votre demande dans les plus brefs délais. Vous recevrez une notification par email dès que votre transaction sera traitée.
              </p>
            </div>

            <div class="footer">
              <p>
                Cet email a été envoyé automatiquement par EMB Transfer.<br>
                Merci de ne pas répondre à cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        EMILE TRANSFER+

        Demande d'échange créée

        Bonjour ${transactionData.userName},

        Votre demande d'échange a été créée avec succès.

        ID Transaction: ${transactionData.transaction_id}
        Montant: ${transactionData.amount} FCFA
        Commission: ${transactionData.commission} FCFA
        Montant total: ${transactionData.total_amount} FCFA
        De: ${transactionData.from_number}
        Vers: ${transactionData.to_number}
        Statut: En attente de validation

        Nous traiterons votre demande dans les plus brefs délais.

        Cordialement,
        L'équipe EMB Transfer
      `
    });

    console.log('✅ Email de transaction créée envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email de transaction validée
const sendTransactionValidated = async (email, transactionData) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL TRANSACTION VALIDÉE (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Échange validé - ${transactionData.transaction_id}`);
    console.log(`\nBonjour ${transactionData.userName},\n`);
    console.log(`Bonne nouvelle! Votre demande d'échange a été validée avec succès.`);
    console.log(`\nDétails:`);
    console.log(`- ID: ${transactionData.transaction_id}`);
    console.log(`- Montant: ${transactionData.amount} FCFA`);
    console.log(`- Vers: ${transactionData.to_number}`);
    console.log(`\nVotre transaction a été complétée avec succès.`);
    console.log('========================================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Échange validé - ${transactionData.transaction_id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #4CAF50;
              border-radius: 16px;
              padding: 40px;
            }
            .success-icon {
              text-align: center;
              font-size: 64px;
              margin: 20px 0;
            }
            .transaction-id {
              background-color: #4CAF50;
              color: #ffffff;
              font-size: 24px;
              font-weight: bold;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .details-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .details-table td {
              padding: 12px;
              border-bottom: 1px solid #333;
            }
            .details-table td:first-child {
              color: #999;
              width: 40%;
            }
            .details-table td:last-child {
              color: #fff;
              font-weight: bold;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              background-color: #4CAF50;
              color: #fff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMILE TRANSFER+</div>
            </div>

            <div class="content">
              <div class="success-icon">✅</div>
              <h1 style="color: #4CAF50; margin-top: 0; text-align: center;">Échange validé avec succès!</h1>

              <p class="message">
                Bonjour <strong>${transactionData.userName}</strong>,<br><br>
                Bonne nouvelle! Votre demande d'échange a été validée avec succès par notre équipe.
              </p>

              ${transactionData.isSubscription && transactionData.admin_message ? `
                <div style="background-color: rgba(33, 150, 243, 0.1); border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3 style="color: #2196F3; margin-top: 0;">📋 Message de l'équipe</h3>
                  <p style="color: #ffffff; white-space: pre-wrap; line-height: 1.6; margin: 10px 0 0 0;">
                    ${transactionData.admin_message}
                  </p>
                </div>
              ` : ''}

              <div class="transaction-id">${transactionData.transaction_id}</div>

              <table class="details-table">
                <tr>
                  <td>Montant échangé</td>
                  <td style="color: #4CAF50;">${transactionData.amount} FCFA</td>
                </tr>
                <tr>
                  <td>Commission</td>
                  <td>${transactionData.commission} FCFA</td>
                </tr>
                <tr>
                  <td>Numéro source</td>
                  <td>${transactionData.from_number}</td>
                </tr>
                <tr>
                  <td>Numéro destination</td>
                  <td>${transactionData.to_number}</td>
                </tr>
                <tr>
                  <td>Statut</td>
                  <td><span class="status-badge">Validé</span></td>
                </tr>
              </table>

              <p class="message">
                Votre transaction a été complétée avec succès. Les fonds ont été transférés vers le numéro de destination.
              </p>

              <p class="message" style="background-color: rgba(76, 175, 80, 0.1); border-left: 4px solid #4CAF50; padding: 15px;">
                <strong>Merci d'avoir utilisé EMB Transfer!</strong><br>
                N'hésitez pas à nous contacter si vous avez des questions.
              </p>
            </div>

            <div class="footer">
              <p>
                Cet email a été envoyé automatiquement par EMB Transfer.<br>
                Merci de ne pas répondre à cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        EMILE TRANSFER+

        ✅ Échange validé avec succès!

        Bonjour ${transactionData.userName},

        Bonne nouvelle! Votre demande d'échange a été validée.

        ID Transaction: ${transactionData.transaction_id}
        Montant: ${transactionData.amount} FCFA
        Commission: ${transactionData.commission} FCFA
        De: ${transactionData.from_number}
        Vers: ${transactionData.to_number}
        Statut: Validé

        Votre transaction a été complétée avec succès.

        Merci d'avoir utilisé EMB Transfer!

        Cordialement,
        L'équipe EMB Transfer
      `
    });

    console.log('✅ Email de transaction validée envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email de transaction rejetée
const sendTransactionRejected = async (email, transactionData) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL TRANSACTION REJETÉE (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Échange rejeté - ${transactionData.transaction_id}`);
    console.log(`\nBonjour ${transactionData.userName},\n`);
    console.log(`Votre demande d'échange a été rejetée.`);
    console.log(`\nDétails:`);
    console.log(`- ID: ${transactionData.transaction_id}`);
    console.log(`- Montant: ${transactionData.amount} FCFA`);
    if (transactionData.comment) {
      console.log(`- Raison: ${transactionData.comment}`);
    }
    console.log(`\nVeuillez nous contacter pour plus d'informations.`);
    console.log('=========================================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Échange rejeté - ${transactionData.transaction_id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #FF3B38;
              border-radius: 16px;
              padding: 40px;
            }
            .error-icon {
              text-align: center;
              font-size: 64px;
              margin: 20px 0;
            }
            .transaction-id {
              background-color: #FF3B38;
              color: #ffffff;
              font-size: 24px;
              font-weight: bold;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .details-table {
              width: 100%;
              margin: 20px 0;
              border-collapse: collapse;
            }
            .details-table td {
              padding: 12px;
              border-bottom: 1px solid #333;
            }
            .details-table td:first-child {
              color: #999;
              width: 40%;
            }
            .details-table td:last-child {
              color: #fff;
              font-weight: bold;
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              background-color: #FF3B38;
              color: #fff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .reason-box {
              background-color: rgba(255, 59, 56, 0.1);
              border-left: 4px solid #FF3B38;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMILE TRANSFER+</div>
            </div>

            <div class="content">
              <div class="error-icon">❌</div>
              <h1 style="color: #FF3B38; margin-top: 0; text-align: center;">Échange rejeté</h1>

              <p class="message">
                Bonjour <strong>${transactionData.userName}</strong>,<br><br>
                Nous sommes désolés de vous informer que votre demande d'échange a été rejetée.
              </p>

              <div class="transaction-id">${transactionData.transaction_id}</div>

              <table class="details-table">
                <tr>
                  <td>Montant</td>
                  <td>${transactionData.amount} FCFA</td>
                </tr>
                <tr>
                  <td>Numéro source</td>
                  <td>${transactionData.from_number}</td>
                </tr>
                <tr>
                  <td>Numéro destination</td>
                  <td>${transactionData.to_number}</td>
                </tr>
                <tr>
                  <td>Statut</td>
                  <td><span class="status-badge">Rejeté</span></td>
                </tr>
              </table>

              ${transactionData.comment ? `
                <div class="reason-box">
                  <strong>Raison du rejet:</strong><br>
                  ${transactionData.comment}
                </div>
              ` : ''}

              <p class="message">
                Si vous pensez qu'il s'agit d'une erreur ou si vous avez des questions, n'hésitez pas à nous contacter.
              </p>
            </div>

            <div class="footer">
              <p>
                Cet email a été envoyé automatiquement par EMB Transfer.<br>
                Merci de ne pas répondre à cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        EMILE TRANSFER+

        Échange rejeté

        Bonjour ${transactionData.userName},

        Votre demande d'échange a été rejetée.

        ID Transaction: ${transactionData.transaction_id}
        Montant: ${transactionData.amount} FCFA
        De: ${transactionData.from_number}
        Vers: ${transactionData.to_number}
        Statut: Rejeté

        ${transactionData.comment ? `Raison: ${transactionData.comment}` : ''}

        Si vous avez des questions, contactez-nous.

        Cordialement,
        L'équipe EMB Transfer
      `
    });

    console.log('✅ Email de transaction rejetée envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Envoyer un email générique (avec HTML personnalisé)
const sendEmail = async (to, subject, htmlContent, textContent = null) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== EMAIL GÉNÉRIQUE (MODE CONSOLE) =====');
    console.log(`À: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log(`\nContenu:\n${textContent || htmlContent.substring(0, 200)}...`);
    console.log('============================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent
    };

    if (textContent) {
      mailOptions.text = textContent;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Remplacer les variables dans un template
const replaceVariables = (template, data) => {
  let result = template;

  // Remplacer les variables simples {{variable}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key] || '');
  });

  // Gérer les conditions {{#if variable}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
    return data[varName] ? content : '';
  });

  return result;
};

// Envoyer un email à partir d'un template de la base de données
const sendEmailFromTemplate = async (templateType, recipientEmail, data) => {
  try {
    // Récupérer le template depuis la base de données
    const template = await prisma.email_templates.findUnique({
      where: { type: templateType }
    });

    if (!template) {
      console.error(`❌ Template "${templateType}" introuvable`);
      throw new Error(`Template "${templateType}" introuvable`);
    }

    if (!template.is_active) {
      console.warn(`⚠️  Template "${templateType}" est inactif`);
      return false;
    }

    // Remplacer les variables dans le template
    const htmlContent = replaceVariables(template.html_body, data);
    const textContent = template.text_body ? replaceVariables(template.text_body, data) : null;

    // Envoyer l'email
    await sendEmail(recipientEmail, template.subject, htmlContent, textContent);

    console.log(`✅ Email envoyé depuis le template "${templateType}" à ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email depuis le template:', error);
    throw error;
  }
};

/**
 * Envoyer une newsletter à un utilisateur
 */
const sendNewsletter = async (userEmail, userName, newsletter) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== NEWSLETTER (MODE CONSOLE) =====');
    console.log(`À: ${userEmail} (${userName})`);
    console.log(`Sujet: ${newsletter.subject}`);
    console.log(`\n${newsletter.content}`);
    console.log('=====================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: newsletter.subject,
      text: newsletter.content,
      html: newsletter.content_html || `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #e94560;">${newsletter.title}</h2>
        <div style="white-space: pre-wrap;">${newsletter.content}</div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          Vous recevez cet email car vous êtes inscrit à notre newsletter.<br>
          Pour vous désabonner, connectez-vous à votre compte et modifiez vos préférences.
        </p>
      </div>`
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter envoyée à ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur envoi newsletter à ${userEmail}:`, error.message);
    throw error;
  }
};

/**
 * Envoyer les identifiants de connexion à un nouvel administrateur
 */
const sendAdminCredentials = async (email, username, password) => {
  const transporter = createTransporter();

  // Mode console si Gmail n'est pas configuré
  if (!transporter) {
    console.log('\n📧 ===== IDENTIFIANTS ADMIN (MODE CONSOLE) =====');
    console.log(`À: ${email}`);
    console.log(`Sujet: Vos identifiants d'administrateur EMB Transfer`);
    console.log(`\nBonjour,\n`);
    console.log(`Votre compte administrateur a été créé avec succès.\n`);
    console.log(`Voici vos identifiants de connexion :\n`);
    console.log(`Nom d'utilisateur: ${username}`);
    console.log(`Mot de passe: ${password}\n`);
    console.log(`⚠️  IMPORTANT: Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.\n`);
    console.log(`Vous pouvez vous connecter à l'adresse: ${process.env.ADMIN_URL || 'https://votre-site.com/admin'}\n`);
    console.log(`Cordialement,`);
    console.log(`L'équipe EMB Transfer`);
    console.log('=============================================\n');
    return true;
  }

  // Envoi réel par Gmail
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'EMB Transfer'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Vos identifiants d\'administrateur - EMB Transfer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #0a0a0a;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #FF3B38;
              margin-bottom: 10px;
            }
            .content {
              background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
              border: 2px solid #FF3B38;
              border-radius: 16px;
              padding: 40px;
            }
            .credentials-box {
              background-color: #2a2a2a;
              border: 1px solid #FF3B38;
              border-radius: 12px;
              padding: 25px;
              margin: 30px 0;
            }
            .credential-item {
              margin: 15px 0;
              padding: 15px;
              background-color: #1a1a1a;
              border-radius: 8px;
            }
            .credential-label {
              color: #999999;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .credential-value {
              color: #ffffff;
              font-size: 18px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
            }
            .warning {
              background-color: #FF3B38;
              color: #ffffff;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
              text-align: center;
            }
            .message {
              color: #cccccc;
              line-height: 1.6;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666666;
              font-size: 12px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #FF3B38 0%, #E91E63 100%);
              color: #ffffff;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">EMB TRANSFER</div>
              <p style="color: #999999; margin: 0;">Plateforme d'Administration</p>
            </div>

            <div class="content">
              <h2 style="color: #FF3B38; margin-top: 0;">Bienvenue dans l'équipe !</h2>

              <p class="message">
                Votre compte administrateur a été créé avec succès. Voici vos identifiants de connexion :
              </p>

              <div class="credentials-box">
                <div class="credential-item">
                  <div class="credential-label">Nom d'utilisateur</div>
                  <div class="credential-value">${username}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Mot de passe temporaire</div>
                  <div class="credential-value">${password}</div>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ IMPORTANT</strong><br>
                Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.
              </div>

              <div style="text-align: center;">
                <a href="${process.env.ADMIN_URL || 'https://votre-site.com/admin'}" class="button">
                  Se connecter au panel admin
                </a>
              </div>

              <p class="message">
                Si vous n'avez pas demandé la création de ce compte, veuillez contacter immédiatement l'équipe technique.
              </p>
            </div>

            <div class="footer">
              <p>
                Cet email contient des informations confidentielles.<br>
                Ne le transférez à personne.
              </p>
              <p style="margin-top: 20px;">
                © 2024 EMB Transfer - Tous droits réservés
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Bienvenue dans l'équipe !

Votre compte administrateur a été créé avec succès.

Vos identifiants de connexion :
- Nom d'utilisateur: ${username}
- Mot de passe temporaire: ${password}

⚠️ IMPORTANT: Pour des raisons de sécurité, veuillez changer votre mot de passe lors de votre première connexion.

URL de connexion: ${process.env.ADMIN_URL || 'https://votre-site.com/admin'}

Si vous n'avez pas demandé la création de ce compte, veuillez contacter immédiatement l'équipe technique.

Cordialement,
L'équipe EMB Transfer
      `
    });

    console.log(`✅ Identifiants admin envoyés à ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur envoi identifiants admin à ${email}:`, error.message);
    throw error;
  }
};

/**
 * Générer un mot de passe aléatoire sécurisé
 */
const generateRandomPassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  const allChars = lowercase + uppercase + numbers + symbols;

  // Assurer qu'on a au moins un de chaque type
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Remplir le reste aléatoirement
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger les caractères
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendPasswordResetCode,
  sendTransactionCreated,
  sendTransactionValidated,
  sendTransactionRejected,
  sendEmail,
  sendEmailFromTemplate,
  replaceVariables,
  sendNewsletter,
  sendAdminCredentials,
  generateRandomPassword
};
