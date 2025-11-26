const nodemailer = require('nodemailer');

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

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendPasswordResetCode
};
