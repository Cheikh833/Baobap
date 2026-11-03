# ADR-007 — Paiement en ligne via CinetPay

**Statut** : acceptée · **Date** : 2026-11-03 · **Choix délégué par le porteur de projet** (PayDunya ou CinetPay)

**Options** : PayDunya, CinetPay.

**Décision** : **CinetPay**.
- **Couverture** : une seule intégration pour une dizaine de pays d'Afrique de l'Ouest et centrale (Sénégal, Côte d'Ivoire, Cameroun, Mali, Burkina Faso, Togo, Bénin, Guinée, Niger, RD Congo). C'est adapté à une plateforme destinée aux organisations africaines au-delà du Sénégal.
- **Moyens de paiement** : Wave, Orange Money, MTN, Moov et cartes bancaires sur la même page de paiement.
- **API** : initialisation, vérification de transaction serveur à serveur et notification signée (HMAC), ce qui permet une validation sûre.
- PayDunya reste une bonne alternative très implantée au Sénégal. L'intégration est isolée dans `src/server/payments/cinetpay.ts` et `src/server/services/payments.ts`, un second prestataire peut donc être ajouté sans toucher au reste.

**Sécurité** : le statut n'est jamais déduit de la notification. Il est confirmé par `/v2/payment/check` (statut, montant, devise) ; activation idempotente (mise à jour conditionnelle) ; signature `x-token` vérifiée si la clé secrète est configurée ; montant multiple de 5 en XOF.

**Limite** : l'API CinetPay n'était pas joignable depuis l'environnement de développement et aucun compte marchand n'existe encore. L'intégration est testée avec un CinetPay simulé, et le premier paiement réel doit être fait après la création du compte (voir `docs/deploiement.md`).
