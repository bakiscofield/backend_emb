const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

const templates = [
  {
    type: 'transaction_validated',
    subject: '✅ Transaction validée - EMB Transfer+',
    description: 'Email envoyé lorsqu\'une transaction est validée par l\'administrateur',
    variables: '{{user_name}}, {{transaction_id}}, {{amount}}, {{from_method}}, {{to_method}}, {{admin_message}}',
    text_body: `Bonjour {{user_name}},

Nous avons le plaisir de vous informer que votre transaction a été validée avec succès.

Détails de la transaction :
- Numéro de transaction : {{transaction_id}}
- Montant : {{amount}} FCFA
- De : {{from_method}}
- Vers : {{to_method}}

{{admin_message}}

Votre opération sera traitée dans les meilleurs délais.

Merci de votre confiance,
L'équipe EMB Transfer+`,
    html_body: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Validée</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ Transaction Validée</h1>
              <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 14px;">EMB Transfer+ - Votre partenaire de confiance</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong style="color: #059669;">{{user_name}}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Nous avons le plaisir de vous informer que votre transaction a été <strong style="color: #10b981;">validée avec succès</strong>.
              </p>

              <!-- Transaction Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">📋 Détails de la transaction</h3>

                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 45%;">Numéro de transaction :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">{{transaction_id}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Montant :</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right;">{{amount}} FCFA</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">De :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{{from_method}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vers :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{{to_method}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Admin Message (if exists) -->
              {{#if admin_message}}
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;"><strong>Message de l'équipe :</strong></p>
                    <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 14px; line-height: 1.6;">{{admin_message}}</p>
                  </td>
                </tr>
              </table>
              {{/if}}

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Votre opération sera traitée dans les meilleurs délais.
              </p>

              <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                Merci de votre confiance,
              </p>
              <p style="margin: 0; color: #059669; font-size: 15px; font-weight: 600;">
                L'équipe EMB Transfer+
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                © 2024 EMB Transfer+ - Tous droits réservés
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Service client disponible 24/7 pour vous accompagner
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    type: 'transaction_rejected',
    subject: '❌ Transaction rejetée - EMB Transfer+',
    description: 'Email envoyé lorsqu\'une transaction est rejetée par l\'administrateur',
    variables: '{{user_name}}, {{transaction_id}}, {{amount}}, {{from_method}}, {{to_method}}, {{rejection_reason}}',
    text_body: `Bonjour {{user_name}},

Nous sommes au regret de vous informer que votre transaction a été rejetée.

Détails de la transaction :
- Numéro de transaction : {{transaction_id}}
- Montant : {{amount}} FCFA
- De : {{from_method}}
- Vers : {{to_method}}

Raison du rejet :
{{rejection_reason}}

Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter via le support client.

Cordialement,
L'équipe EMB Transfer+`,
    html_body: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Rejetée</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">❌ Transaction Rejetée</h1>
              <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 14px;">EMB Transfer+ - Votre partenaire de confiance</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong style="color: #dc2626;">{{user_name}}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Nous sommes au regret de vous informer que votre transaction a été <strong style="color: #ef4444;">rejetée</strong>.
              </p>

              <!-- Transaction Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">📋 Détails de la transaction</h3>

                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 45%;">Numéro de transaction :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">{{transaction_id}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Montant :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 16px; font-weight: 700; text-align: right;">{{amount}} FCFA</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">De :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{{from_method}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vers :</td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; text-align: right;">{{to_method}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Rejection Reason -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600; line-height: 1.6;">⚠️ Raison du rejet :</p>
                    <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 14px; line-height: 1.6;">{{rejection_reason}}</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à nous contacter via le support client.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      Contacter le Support
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                Cordialement,<br>
                <span style="color: #dc2626; font-weight: 600;">L'équipe EMB Transfer+</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                © 2024 EMB Transfer+ - Tous droits réservés
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Service client disponible 24/7 pour vous accompagner
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    type: 'kyc_validated',
    subject: '✅ Vérification KYC réussie - EMB Transfer+',
    description: 'Email envoyé lorsque le KYC d\'un utilisateur est validé',
    variables: '{{user_name}}, {{verified_date}}',
    text_body: `Bonjour {{user_name}},

Excellente nouvelle ! Votre vérification d'identité (KYC) a été validée avec succès.

Date de validation : {{verified_date}}

Votre compte est maintenant entièrement vérifié. Vous pouvez profiter de tous les avantages :
- Limites de transaction augmentées
- Traitement prioritaire de vos opérations
- Accès à l'ensemble de nos services

Merci de votre confiance,
L'équipe EMB Transfer+`,
    html_body: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KYC Validé</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">✅</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">KYC Validé !</h1>
              <p style="margin: 10px 0 0 0; color: #e9d5ff; font-size: 14px;">Votre compte est maintenant vérifié</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong style="color: #7c3aed;">{{user_name}}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                🎉 <strong style="color: #8b5cf6;">Excellente nouvelle !</strong> Votre vérification d'identité (KYC) a été validée avec succès.
              </p>

              <!-- Validation Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #faf5ff; border-radius: 8px; border: 1px solid #e9d5ff; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Date de validation</p>
                    <p style="margin: 0; color: #7c3aed; font-size: 18px; font-weight: 700;">{{verified_date}}</p>
                  </td>
                </tr>
              </table>

              <!-- Benefits Section -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 16px 0; color: #166534; font-size: 16px; font-weight: 600;">🎁 Avantages débloqués</h3>

                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #16a34a; font-size: 18px; margin-right: 8px;">✓</span>
                          <span style="color: #1f2937; font-size: 14px;">Limites de transaction augmentées</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #16a34a; font-size: 18px; margin-right: 8px;">✓</span>
                          <span style="color: #1f2937; font-size: 14px;">Traitement prioritaire de vos opérations</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #16a34a; font-size: 18px; margin-right: 8px;">✓</span>
                          <span style="color: #1f2937; font-size: 14px;">Accès à l'ensemble de nos services</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      Découvrir Mon Compte
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                Merci de votre confiance,
              </p>
              <p style="margin: 0; color: #7c3aed; font-size: 15px; font-weight: 600;">
                L'équipe EMB Transfer+
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                © 2024 EMB Transfer+ - Tous droits réservés
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Service client disponible 24/7 pour vous accompagner
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    type: 'kyc_rejected',
    subject: '❌ Documents KYC refusés - EMB Transfer+',
    description: 'Email envoyé lorsque le KYC d\'un utilisateur est rejeté',
    variables: '{{user_name}}, {{rejection_reason}}',
    text_body: `Bonjour {{user_name}},

Nous avons examiné vos documents de vérification d'identité (KYC), mais nous ne pouvons pas les valider pour la raison suivante :

{{rejection_reason}}

Pour finaliser votre vérification, nous vous invitons à :
1. Vérifier que vos documents sont lisibles et non expirés
2. Soumettre à nouveau vos documents conformes

Notre équipe de support est à votre disposition pour vous accompagner dans cette démarche.

Cordialement,
L'équipe EMB Transfer+`,
    html_body: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documents KYC Refusés</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Documents à Revoir</h1>
              <p style="margin: 10px 0 0 0; color: #fef3c7; font-size: 14px;">Vérification KYC - EMB Transfer+</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                Bonjour <strong style="color: #d97706;">{{user_name}}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Nous avons examiné vos documents de vérification d'identité (KYC), mais nous ne pouvons pas les valider pour le moment.
              </p>

              <!-- Rejection Reason -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600; line-height: 1.6;">⚠️ Raison du refus :</p>
                    <p style="margin: 8px 0 0 0; color: #1f2937; font-size: 14px; line-height: 1.6;">{{rejection_reason}}</p>
                  </td>
                </tr>
              </table>

              <!-- Steps Section -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">📝 Prochaines étapes</h3>

                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #3b82f6; color: #ffffff; text-align: center; line-height: 24px; border-radius: 50%; font-size: 12px; font-weight: 600; margin-right: 12px;">1</span>
                          <span style="color: #1f2937; font-size: 14px; line-height: 1.6;">Vérifier que vos documents sont lisibles et non expirés</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #3b82f6; color: #ffffff; text-align: center; line-height: 24px; border-radius: 50%; font-size: 12px; font-weight: 600; margin-right: 12px;">2</span>
                          <span style="color: #1f2937; font-size: 14px; line-height: 1.6;">Soumettre à nouveau vos documents conformes</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Notre équipe de support est à votre disposition pour vous accompagner dans cette démarche.
              </p>

              <!-- CTA Buttons -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3); margin: 0 8px 8px 0;">
                      Soumettre à Nouveau
                    </a>
                    <a href="#" style="display: inline-block; padding: 14px 32px; background-color: #f3f4f6; color: #1f2937; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; border: 1px solid #e5e7eb; margin: 0 0 8px 8px;">
                      Contacter le Support
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                Cordialement,<br>
                <span style="color: #d97706; font-weight: 600;">L'équipe EMB Transfer+</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                © 2024 EMB Transfer+ - Tous droits réservés
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Service client disponible 24/7 pour vous accompagner
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
];

console.log('🔄 Début de la migration : création de la table email_templates...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à la base de données:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite\n');
});

// Créer la table email_templates
db.run(`
  CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    variables TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('❌ Erreur lors de la création de la table:', err.message);
    db.close();
    process.exit(1);
  }
  console.log('✅ Table "email_templates" créée ou déjà existante\n');

  // Insérer les templates par défaut
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO email_templates (type, subject, html_body, text_body, variables, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  let insertedCount = 0;
  templates.forEach((template, index) => {
    insertStmt.run(
      template.type,
      template.subject,
      template.html_body,
      template.text_body,
      template.variables,
      template.description,
      (err) => {
        if (err) {
          console.error(`❌ Erreur lors de l'insertion du template "${template.type}":`, err.message);
        } else {
          insertedCount++;
          console.log(`✅ Template "${template.type}" inséré avec succès`);
        }

        if (index === templates.length - 1) {
          insertStmt.finalize();
          console.log(`\n✅ Migration terminée : ${insertedCount}/${templates.length} templates insérés\n`);

          // Afficher un résumé
          db.all('SELECT type, subject, is_active FROM email_templates', (err, rows) => {
            if (err) {
              console.error('❌ Erreur lors de la récupération des templates:', err.message);
            } else {
              console.log('📋 Templates disponibles :');
              rows.forEach(row => {
                console.log(`  - ${row.type}: "${row.subject}" (${row.is_active ? 'Actif' : 'Inactif'})`);
              });
            }

            db.close((err) => {
              if (err) {
                console.error('❌ Erreur lors de la fermeture de la base de données:', err.message);
              } else {
                console.log('\n✅ Base de données fermée. Migration terminée avec succès !');
              }
            });
          });
        }
      }
    );
  });
});
