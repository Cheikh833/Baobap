# Tarification BAOBAB

**Décision du porteur de projet (2026-11-03)** : une phase d'essai gratuite, puis un abonnement payant. Les montants ci-dessous sont une **proposition** argumentée, ajustable sans modifier le code de l'application : tout est centralisé dans `src/lib/plans.ts`.

## Principes
1. **Un prix par organisation, pas par utilisateur.** Les ONG ont des budgets fixés par projet et ont besoin de coûts prévisibles. Facturer à l'utilisateur pousse à partager des comptes, ce qui casse l'audit.
2. **Bailleurs et partenaires en lecture seule gratuits et illimités.** C'est un argument commercial fort : chaque bailleur invité découvre BAOBAB, et la transparence envers les bailleurs est au cœur du produit.
3. **Prix en francs CFA**, avec l'équivalent en euros à parité fixe (1 € = 655,957 FCFA), donc exact et stable.
4. **Annuel = 10 mois** (2 mois offerts) : cela correspond aux cycles budgétaires annuels des projets et améliore la trésorerie.
5. **Tarif solidaire −30 %** pour les organisations communautaires et associations locales, sur justificatif.
6. **Fin d'essai ou d'abonnement = lecture seule, jamais de suppression.** Les données appartiennent à l'organisation.
7. **Honnêteté** : la page Tarifs distingue ce qui est disponible de ce qui est « À venir ». Les fonctionnalités à venir seront incluses sans supplément.

## Grille proposée
| Plan | Cible | Mensuel | Annuel | Membres | Projets actifs | Documents | IA (à venir) |
|---|---|---|---|---|---|---|---|
| **Essai gratuit** | Toute nouvelle organisation | 0 (30 jours) | — | comme Professionnel | illimités | — | — |
| **Essentiel** | Associations, OCB, petites ONG | 15 000 FCFA (≈ 23 €) | 150 000 FCFA | 5 | 10 | 5 Go | 100 req./mois |
| **Professionnel** ⭐ | ONG nationales, bureaux d'études, programmes | 49 000 FCFA (≈ 75 €) | 490 000 FCFA | 25 | illimités | 50 Go | 1 000 req./mois |
| **Institution** | ONG internationales, agences, fondations, collectivités | 149 000 FCFA (≈ 227 €) | 1 490 000 FCFA | 100 | illimités | 250 Go | 5 000 req./mois |
| **Entreprise & Gouvernement** | Ministères, agences ONU, réseaux multi-pays | Sur devis | Sur devis | illimités | illimités | illimité | sur mesure |

Repères : 15 000 FCFA par mois représentent environ le coût d'une connexion internet de bureau. Le plan Professionnel coûte moins de 2 % du salaire mensuel d'un chargé de suivi-évaluation dans la sous-région, et il remplace plusieurs licences d'outils étrangers facturés à l'utilisateur. À valider par des entretiens avec 5 à 10 organisations cibles pendant la phase d'essai.

## Ce qui est appliqué dans l'application (implémenté et testé)
- Création d'organisation : essai **Professionnel de 30 jours**, sans paiement.
- Bandeau d'essai (jours restants), page **Organisation → Abonnement** : plan, statut, utilisation (membres, projets), demande d'activation.
- Limites appliquées côté serveur : **membres facturables**, invitations en attente comprises (les bailleurs ne comptent pas), et **projets non archivés**. Le stockage et l'IA seront limités avec leurs modules.
- Fin d'essai sans abonnement → **lecture seule** : toute écriture est refusée côté serveur, la consultation reste possible. Abonnement expiré → 7 jours de grâce, puis lecture seule.
- Permissions `billing:view` (directeur exécutif, admin, propriétaire) et `billing:manage` (admin, propriétaire). La demande d'abonnement reste possible en lecture seule.

## Encaissement (en attendant le paiement en ligne)
1. L'organisation envoie une demande depuis l'espace Abonnement (plan, cycle, tarif solidaire, téléphone).
2. L'équipe BAOBAB liste les demandes : `npm run billing -- list`.
3. Après réception du paiement (Wave, Orange Money, virement) : `npm run billing -- activate <CODE_ORG> <PLAN> <MONTHLY|YEARLY>`. L'activation est journalisée.

**Paiement en ligne** : intégré via **CinetPay** (ADR-007). Wave, Orange Money, MTN, Moov et cartes ; l'abonnement est activé automatiquement après vérification du paiement. Le tarif solidaire et le plan Entreprise passent par la demande manuelle, car ils nécessitent un justificatif ou un devis. **Reste à arbitrer** : facturation électronique et TVA applicable.

## Points de vigilance
- Abus d'essai (création répétée d'organisations) : à surveiller ; mesure possible : un essai par utilisateur propriétaire.
- Réévaluer la grille après 3 mois d'essai réel (taux de conversion, plan choisi, demandes solidaires).
