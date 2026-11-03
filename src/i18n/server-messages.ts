import type { LocaleCode } from "./config";

/**
 * Traduction des messages d'erreur produits côté serveur (règles métier, validation).
 * Le français est la langue source ; les messages non répertoriés restent en français.
 */
const EXACT_EN: Record<string, string> = {
  "Certains champs sont invalides.": "Some fields are invalid.",
  "Une erreur inattendue est survenue. Réessayez ; si le problème persiste, contactez l'administrateur.": "An unexpected error occurred. Please try again; if the problem persists, contact your administrator.",
  "Vous n'avez pas les droits nécessaires pour cette action.": "You do not have the required permissions for this action.",
  "Élément introuvable.": "Item not found.",
  "La période d'essai ou l'abonnement de l'organisation est terminé : l'espace est en lecture seule. Vos données sont conservées ; activez un abonnement pour continuer à les modifier.": "The organization's trial or subscription has ended: the workspace is read-only. Your data is kept; activate a subscription to keep editing it.",
  "Email ou mot de passe incorrect.": "Incorrect email or password.",
  "Trop de tentatives. Réessayez dans quelques minutes.": "Too many attempts. Please try again in a few minutes.",
  "Un compte existe déjà avec cette adresse email.": "An account already exists with this email address.",
  "Adresse email invalide.": "Invalid email address.",
  "Email invalide.": "Invalid email.",
  "Le mot de passe est obligatoire.": "Password is required.",
  "Le mot de passe doit contenir au moins 10 caractères.": "Password must be at least 10 characters long.",
  "Le mot de passe doit contenir au moins une lettre.": "Password must contain at least one letter.",
  "Le mot de passe doit contenir au moins un chiffre.": "Password must contain at least one digit.",
  "Date invalide.": "Invalid date.",
  "Nombre entier attendu.": "A whole number is expected.",
  "Valeur positive attendue.": "A positive value is expected.",
  "Montant invalide.": "Invalid amount.",
  "Le montant doit être positif.": "The amount must be positive.",
  "Le code est obligatoire.": "Code is required.",
  "Le code doit contenir au moins 2 caractères.": "The code must be at least 2 characters long.",
  "Code : lettres, chiffres, tirets, points ou tirets bas uniquement.": "Code: letters, digits, hyphens, dots or underscores only.",
  "Devise ISO à 3 lettres (ex. XOF, EUR).": "3-letter ISO currency (e.g. XOF, EUR).",
  "URL invalide (https://…).": "Invalid URL (https://…).",
  "Année invalide.": "Invalid year.",
  "Rôle invalide.": "Invalid role.",
  "La date de fin doit être postérieure ou égale à la date de début.": "The end date must be on or after the start date.",
  "Ce code d'organisation est déjà utilisé.": "This organization code is already in use.",
  "Ce code est déjà utilisé par un autre portefeuille.": "This code is already used by another portfolio.",
  "Ce code est déjà utilisé par un autre programme.": "This code is already used by another program.",
  "Ce code est déjà utilisé par un autre projet.": "This code is already used by another project.",
  "Ce portefeuille contient des programmes ou projets : détachez-les d'abord.": "This portfolio contains programs or projects: detach them first.",
  "Ce programme contient des projets : détachez-les d'abord.": "This program contains projects: detach them first.",
  "Ce rôle est attribué à des membres : réattribuez-les d'abord.": "This role is assigned to members: reassign them first.",
  "Cette personne est déjà membre de l'organisation.": "This person is already a member of the organization.",
  "Cette transition de statut n'est pas autorisée.": "This status change is not allowed.",
  "Invitation introuvable.": "Invitation not found.",
  "Invitation invalide, expirée ou déjà utilisée.": "Invalid, expired or already used invitation.",
  "L'organisation doit conserver au moins un propriétaire actif.": "The organization must keep at least one active owner.",
  "Le paiement en ligne n'est pas encore activé sur cette installation. Utilisez la demande d'activation.": "Online payment is not enabled on this installation yet. Use the activation request.",
  "Le prestataire de paiement est momentanément indisponible. Réessayez ou utilisez la demande d'activation.": "The payment provider is temporarily unavailable. Try again or use the activation request.",
  "Le programme choisi appartient à un autre portefeuille.": "The selected program belongs to another portfolio.",
  "Le rôle Propriétaire n'est pas modifiable.": "The Owner role cannot be changed.",
  "Les rôles système ne peuvent pas être supprimés.": "System roles cannot be deleted.",
  "Membre introuvable.": "Member not found.",
  "Plan non payable en ligne (le plan Entreprise est sur devis).": "This plan cannot be paid online (Enterprise is quote-based).",
  "Portefeuille introuvable dans cette organisation.": "Portfolio not found in this organization.",
  "Portefeuille introuvable.": "Portfolio not found.",
  "Programme introuvable dans cette organisation.": "Program not found in this organization.",
  "Programme introuvable.": "Program not found.",
  "Projet introuvable.": "Project not found.",
  "Renseignez les dates de début et de fin avant d'activer le projet.": "Enter the start and end dates before activating the project.",
  "Rôle introuvable.": "Role not found.",
  "Seul un propriétaire peut attribuer ou retirer le rôle de propriétaire.": "Only an owner can grant or remove the owner role.",
  "Seul un propriétaire peut inviter un autre propriétaire.": "Only an owner can invite another owner.",
  "Structure introuvable.": "Unit not found.",
  "Structure parente introuvable.": "Parent unit not found.",
  "Supprimez ou déplacez d'abord les sous-structures.": "Delete or move the sub-units first.",
  "Une demande est déjà en cours de traitement pour cette organisation.": "A request is already being processed for this organization.",
  "Une structure ne peut pas être rattachée à elle-même ou à l'une de ses sous-structures.": "A unit cannot report to itself or to one of its sub-units.",
  "Vous ne pouvez pas modifier votre propre statut.": "You cannot change your own status.",
  "Lien de réinitialisation invalide ou expiré.": "Invalid or expired reset link.",
  "Vous devez accepter les conditions d'utilisation.": "You must accept the terms of use.",
  "Le paiement par Mobile Money n'est pas configuré sur cette installation.": "Mobile Money payment is not configured on this installation.",
  "Opérateur non pris en charge.": "Unsupported operator.",
  "Un paiement déclaré est déjà en attente de vérification pour cette organisation.": "A declared payment is already awaiting verification for this organization.",
  "L'identifiant de la transaction est obligatoire.": "The transaction ID is required.",
  "Le numéro ayant effectué le paiement est obligatoire.": "The number that made the payment is required.",
  "Ce paiement a déjà été traité.": "This payment has already been processed.",
  "Paiement introuvable.": "Payment not found.",
  "Demande introuvable ou déjà traitée.": "Request not found or already processed.",
  // Messages de succès
  "Invitation révoquée.": "Invitation revoked.",
  "Membre suspendu.": "Member suspended.",
  "Membre réactivé.": "Member reactivated.",
  "Rôle modifié.": "Role changed.",
  "Modifications enregistrées.": "Changes saved.",
  "Portefeuille enregistré.": "Portfolio saved.",
  "Profil enregistré.": "Profile saved.",
  "Programme enregistré.": "Program saved.",
  "Rattachements enregistrés.": "Assignments saved.",
  "Rôle créé.": "Role created.",
  "Rôle enregistré.": "Role saved.",
  "Rôle supprimé.": "Role deleted.",
  "Statut mis à jour.": "Status updated.",
  "Structure créée.": "Unit created.",
  "Structure modifiée.": "Unit updated.",
  "Structure supprimée.": "Unit deleted.",
  "Invitation créée.": "Invitation created.",
  "Abonnement activé.": "Subscription activated.",
  "Paiement rejeté.": "Payment rejected.",
  "Paiement déclaré. Vous serez activé dès la confirmation de réception.": "Payment declared. You will be activated as soon as receipt is confirmed.",
  "Invitation créée et envoyée par email.": "Invitation created and sent by email.",
};

const LABELS_EN: Record<string, string> = {
  "Le nom": "Name", "Le pays": "Country", "Le nom de l'organisation": "Organization name", "Le nom du projet": "Project name",
  "Le nom du rôle": "Role name", "Le responsable": "The manager", "Le coordinateur": "The coordinator", "Le chef de projet": "The project manager",
};

const RULES_EN: [RegExp, (...g: string[]) => string][] = [
  [/^(.+) est obligatoire\.$/, (l) => `${LABELS_EN[l] ?? l} is required.`],
  [/^(.+) doit être un membre actif de l'organisation\.$/, (l) => `${LABELS_EN[l] ?? l} must be an active member of the organization.`],
  [/^Cette invitation est destinée à (.+)\. Connectez-vous avec ce compte\.$/, (e) => `This invitation is addressed to ${e}. Sign in with that account.`],
  [/^Limite de (\d+) membres du plan (.+) atteinte.*$/, (n, p) => `The ${p} plan limit of ${n} members has been reached (pending invitations included). Read-only donors remain unlimited. Upgrade your plan to add members.`],
  [/^Limite de (\d+) projets non archivés du plan (.+) atteinte.*$/, (n, p) => `The ${p} plan limit of ${n} non-archived projects has been reached. Archive a completed project or upgrade your plan.`],
  [/^Un projet portant ce nom existe déjà dans ce programme \((.+)\)\..*$/, (c) => `A project with this name already exists in this program (${c}). Give it a distinctive name.`],
  [/^Un projet hors programme portant ce nom existe déjà \((.+)\)\..*$/, (c) => `A project outside any program already has this name (${c}). Give it a distinctive name.`],
  [/^Permission inconnue : (.+)$/, (p) => `Unknown permission: ${p}`],
];

export function translateServerMessage(message: string, locale: LocaleCode): string {
  if (locale !== "en") return message;
  if (EXACT_EN[message]) return EXACT_EN[message];
  for (const [re, f] of RULES_EN) {
    const g = message.match(re);
    if (g) return f(...g.slice(1));
  }
  return message;
}
