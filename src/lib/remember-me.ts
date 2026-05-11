// "Remember me" support.
//
// Supabase persists auth in localStorage by default, which means a user stays
// signed in across browser restarts. When "Remember me" is unchecked, we still
// allow the session to survive reloads within the same browser session, but
// clear it the moment the tab/window is closed so the next visit requires a
// fresh sign-in.
const FLAG_KEY = "tentra.rememberMe";

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLAG_KEY, remember ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(FLAG_KEY);
    // Default to true (Supabase's default behaviour).
    return v !== "0";
  } catch {
    return true;
  }
}

function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

let installed = false;
export function installRememberMeHandler() {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  const onHide = () => {
    if (!getRememberMe()) {
      clearSupabaseAuthStorage();
    }
  };
  window.addEventListener("pagehide", onHide);
  window.addEventListener("beforeunload", onHide);
}
