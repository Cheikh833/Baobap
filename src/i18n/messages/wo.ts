import type { DeepPartial } from "../types";
import type { Messages } from "./fr";

// WOLOF — VERSION BÊTA, À FAIRE VALIDER PAR DES LOCUTEURS NATIFS.
// Volontairement limitée aux termes courants ; tout le reste s'affiche en français.
// Contribuer : docs/product/langues.md.
const wo: DeepPartial<Messages> = {
  common: {
    language: "Làkk",
    signIn: "Dugg",
    signUp: "Tàmbali",
    openWorkspace: "Ubbi sama bérab",
    logout: "Génn",
    soon: "Dina ñëw",
    pricing: "Njëg yi",
    betaTranslation: "Tekki bii dañu koy saytu",
  },
  nav: {
    organization: "Mbootaay",
    organizationSection: "Mbootaay",
    projects: "Porose yi",
    programs: "Prograam yi",
    newOrg: "Mbootaay bu bees",
    openMenu: "Ubbi menu bi",
    closeMenu: "Tëj menu bi",
  },
  banner: { action: "Xool njëg yi" },
  landing: {
    tagline: "Waajal. Def. Soppi.",
    heroTitle1: "Toppatoo sa porose yi.",
    heroTitle2: "Yokk sa njariñ.",
  },
  auth: {
    loginTitle: "Dugg",
    signupTitle: "Ubbi kont",
    password: "Baatu jàll",
    fullName: "Sa tur ak sa sant",
    loginSubmit: "Dugg",
    signupSubmit: "Ubbi sama kont",
    noAccount: "Amuloo kont ?",
    createAccount: "Ubbi kont",
    haveAccount: "Am nga kont ba noppi ?",
    goLogin: "Dugg",
  },
};

export default wo;
