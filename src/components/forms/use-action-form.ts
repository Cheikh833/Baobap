"use client";
import { startTransition, useActionState, useEffect, type FormEvent } from "react";

type State = { ok: boolean; message?: string; errors?: Record<string, string>; data?: Record<string, string> } | null;

/**
 * Soumet un formulaire à une Server Action :
 * - sans la réinitialisation automatique de React 19 (la saisie est conservée en cas d'erreur) ;
 * - navigation pilotée par l'action via `data.redirect`, en chargement complet de page : données toujours
 *   fraîches (pas de cache client périmé) et comportement déterministe.
 *   Voir docs/decisions/ADR-004-navigation-apres-action.md.
 */
export function useActionForm(action: (prev: State, fd: FormData) => Promise<State>, opts: { confirm?: string } = {}) {
  const [state, dispatch, pending] = useActionState(action, null);
  useEffect(() => {
    const to = state?.ok ? state.data?.redirect : undefined;
    if (to) window.location.assign(to);
  }, [state]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, pending: pending || !!(state?.ok && state.data?.redirect), onSubmit };
}
