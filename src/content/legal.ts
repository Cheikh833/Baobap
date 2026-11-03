// Documents légaux — MODÈLES À FAIRE VALIDER PAR UN JURISTE avant mise en production.
// Les mentions entre crochets [ … ] doivent être complétées par l'éditeur de BAOBAB.

export type LegalDoc = { title: string; updated: string; sections: [string, string[]][] };
export type LegalKey = "terms" | "privacy" | "notice";

const UPDATED = "2026-11-03";

const fr: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Conditions générales d'utilisation et de vente",
    updated: UPDATED,
    sections: [
      ["1. Objet", ["Les présentes conditions régissent l'accès à la plateforme BAOBAB, service en ligne de pilotage des organisations, portefeuilles, programmes et projets, et la souscription aux abonnements."]],
      ["2. Compte et organisation", ["L'utilisateur fournit des informations exactes et garde son mot de passe confidentiel. Le créateur d'une organisation en est le propriétaire : il administre les membres, les rôles et l'abonnement.", "Chaque organisation reste propriétaire de ses données. BAOBAB les traite uniquement pour fournir le service."]],
      ["3. Essai gratuit", ["Toute nouvelle organisation bénéficie d'un essai gratuit de 30 jours, sans moyen de paiement. À son terme, sans abonnement, l'espace passe en lecture seule : aucune donnée n'est supprimée."]],
      ["4. Abonnements, prix et paiement", ["Les prix sont indiqués en francs CFA sur la page Tarifs, par organisation. Le paiement s'effectue en ligne via CinetPay (Mobile Money, carte) ou par virement sur demande.", "L'abonnement couvre la période payée (mensuelle ou annuelle). À défaut de renouvellement, un délai de grâce de 7 jours s'applique, puis l'espace passe en lecture seule.", "Les fonctionnalités annoncées « À venir » sont incluses sans supplément dès leur mise en service ; elles ne constituent pas un engagement de date."]],
      ["5. Résiliation et remboursement", ["L'organisation peut cesser de renouveler son abonnement à tout moment. Sauf disposition légale contraire, les périodes entamées ne sont pas remboursées. [Politique de remboursement à préciser.]"]],
      ["6. Utilisation acceptable", ["Il est interdit d'utiliser BAOBAB pour des activités illicites, de tenter d'accéder aux données d'autres organisations ou de perturber le service."]],
      ["7. Intelligence artificielle", ["Les fonctions d'IA respectent la charte d'IA responsable de BAOBAB : pas de chiffres inventés, sources citées, respect des droits d'accès, confirmation humaine avant toute action. Les contenus générés restent à vérifier par l'utilisateur."]],
      ["8. Disponibilité et responsabilité", ["BAOBAB met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantie d'absence d'interruption. Les décisions prises sur la base des données saisies relèvent de la responsabilité de l'organisation."]],
      ["9. Réversibilité", ["À la fin de la relation, l'organisation peut demander l'export de ses données dans un format exploitable. [Délai et modalités à préciser.]"]],
      ["10. Droit applicable", ["Les présentes conditions sont soumises au droit sénégalais. À défaut d'accord amiable, les tribunaux de Dakar sont compétents. [À valider.]"]],
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    updated: UPDATED,
    sections: [
      ["Responsable du traitement", ["[Raison sociale de l'éditeur], [adresse], [email de contact]. Traitement conforme à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, sous le contrôle de la Commission de protection des données personnelles (CDP) [numéro de déclaration à compléter], et au RGPD pour les utilisateurs situés dans l'Union européenne."]],
      ["Données traitées", ["Compte : nom, email, mot de passe (stocké uniquement sous forme chiffrée irréversible), dernière connexion.", "Données saisies par les organisations : profils, structures, projets, budgets prévisionnels et autres contenus métier.", "Paiements : traités par CinetPay ; BAOBAB ne stocke aucune donnée de carte bancaire ni code Mobile Money.", "Journal d'audit des actions importantes, à des fins de sécurité et de traçabilité."]],
      ["Finalités et bases légales", ["Fournir le service (exécution du contrat), sécuriser les comptes (intérêt légitime), facturer (obligation légale), répondre aux demandes de support."]],
      ["Cookies", ["Uniquement des cookies techniques nécessaires : session de connexion, organisation active, langue choisie. Aucun cookie publicitaire ni outil de pistage."]],
      ["Partage", ["Les données ne sont ni vendues ni louées. Sous-traitants : hébergeur [nom, pays], prestataire de paiement CinetPay, prestataire d'envoi d'emails [nom], fournisseur d'IA [nom, à venir] sous engagement de non-réutilisation pour l'entraînement."]],
      ["Conservation", ["Pendant la durée du compte, puis [durée] après sa clôture, sauf obligation légale de conservation plus longue (données de facturation)."]],
      ["Sécurité", ["Isolation stricte des organisations, chiffrement des communications (HTTPS), mots de passe hachés, contrôle des accès par rôle, journal d'audit."]],
      ["Vos droits", ["Accès, rectification, opposition, suppression et portabilité : écrire à [email du délégué / contact]. Vous pouvez saisir la CDP (www.cdp.sn) ou, dans l'UE, votre autorité de contrôle."]],
    ],
  },
  notice: {
    title: "Mentions légales",
    updated: UPDATED,
    sections: [
      ["Éditeur", ["[Raison sociale], [forme juridique], au capital de [montant] FCFA — NINEA [numéro], RCCM [numéro] — [adresse complète], Sénégal — [téléphone], [email]."]],
      ["Directeur de la publication", ["[Nom et fonction]"]],
      ["Hébergement", ["[Nom de l'hébergeur], [adresse], [pays]."]],
      ["Propriété intellectuelle", ["La marque BAOBAB, le logiciel et ses contenus sont protégés. Les données saisies par les organisations restent leur propriété."]],
    ],
  },
};

const en: Record<LegalKey, LegalDoc> = {
  terms: {
    title: "Terms of use and sale",
    updated: UPDATED,
    sections: [
      ["1. Purpose", ["These terms govern access to the BAOBAB platform, an online service for steering organizations, portfolios, programs and projects, and subscription to paid plans."]],
      ["2. Account and organization", ["Users provide accurate information and keep their password confidential. The creator of an organization is its owner and manages members, roles and the subscription.", "Each organization remains the owner of its data. BAOBAB processes it solely to provide the service."]],
      ["3. Free trial", ["Every new organization gets a 30-day free trial with no payment method. When it ends without a subscription, the workspace becomes read-only: no data is deleted."]],
      ["4. Subscriptions, prices and payment", ["Prices are shown in CFA francs on the Pricing page, per organization. Payment is made online via CinetPay (Mobile Money, card) or by bank transfer on request.", "A subscription covers the paid period (monthly or yearly). If not renewed, a 7-day grace period applies, after which the workspace becomes read-only.", "Features marked “Coming” are included at no extra cost once released; they are not a commitment to a date."]],
      ["5. Termination and refunds", ["An organization may stop renewing at any time. Unless the law provides otherwise, periods already started are not refunded. [Refund policy to be specified.]"]],
      ["6. Acceptable use", ["Using BAOBAB for unlawful activities, attempting to access other organizations' data or disrupting the service is prohibited."]],
      ["7. Artificial intelligence", ["AI features follow BAOBAB's responsible AI charter: no invented figures, cited sources, respect for access rights, human confirmation before any action. Generated content must be checked by the user."]],
      ["8. Availability and liability", ["BAOBAB uses reasonable means to ensure availability and security, without guaranteeing uninterrupted service. Decisions based on entered data are the organization's responsibility."]],
      ["9. Reversibility", ["When the relationship ends, the organization may request an export of its data in a usable format. [Timeframe and terms to be specified.]"]],
      ["10. Governing law", ["These terms are governed by Senegalese law. Failing an amicable settlement, the courts of Dakar have jurisdiction. [To be validated.]"]],
    ],
  },
  privacy: {
    title: "Privacy policy",
    updated: UPDATED,
    sections: [
      ["Data controller", ["[Publisher's legal name], [address], [contact email]. Processing complies with Senegalese Law No. 2008-12 of 25 January 2008 on personal data protection, under the supervision of the Personal Data Protection Commission (CDP) [declaration number to be completed], and with the GDPR for users located in the European Union."]],
      ["Data processed", ["Account: name, email, password (stored only as an irreversible hash), last sign-in.", "Data entered by organizations: profiles, units, projects, planned budgets and other business content.", "Payments: processed by CinetPay; BAOBAB stores no card data or Mobile Money codes.", "Audit log of significant actions, for security and traceability."]],
      ["Purposes and legal bases", ["Providing the service (contract), securing accounts (legitimate interest), invoicing (legal obligation), answering support requests."]],
      ["Cookies", ["Only strictly necessary technical cookies: sign-in session, active organization, chosen language. No advertising cookies or tracking tools."]],
      ["Sharing", ["Data is never sold or rented. Processors: hosting provider [name, country], payment provider CinetPay, email provider [name], AI provider [name, upcoming] bound not to use data for training."]],
      ["Retention", ["For the lifetime of the account, then [period] after closure, unless a longer legal retention period applies (billing data)."]],
      ["Security", ["Strict isolation between organizations, encrypted connections (HTTPS), hashed passwords, role-based access control, audit log."]],
      ["Your rights", ["Access, rectification, objection, erasure and portability: write to [contact email]. You may contact the CDP (www.cdp.sn) or, in the EU, your supervisory authority."]],
    ],
  },
  notice: {
    title: "Legal notice",
    updated: UPDATED,
    sections: [
      ["Publisher", ["[Legal name], [legal form], share capital [amount] FCFA — NINEA [number], RCCM [number] — [full address], Senegal — [phone], [email]."]],
      ["Publication director", ["[Name and title]"]],
      ["Hosting", ["[Hosting provider], [address], [country]."]],
      ["Intellectual property", ["The BAOBAB brand, software and content are protected. Data entered by organizations remains their property."]],
    ],
  },
};

export const legalDocs = (locale: string) => (locale === "en" ? en : fr);
