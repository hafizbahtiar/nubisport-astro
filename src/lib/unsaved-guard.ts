// Guard perubahan belum disimpan pada borang pelan.
// - Back link dalam page: dialog dahulu jika form aktif + ada perubahan.
// - Browser/device back: sentinel history + popstate; dialog yang sama.
// Guard hanya aktif bila borang kelihatan (contoh view -> Edit), dan hanya bila
// nilai form berbeza daripada snapshot terakhir.
import { confirmDialog } from "./confirm";

export interface UnsavedGuard {
  /** Pasang sentinel history bila form mula diedit. Selamat dipanggil berulang. */
  arm: () => void;
  /** Snapshot nilai semasa sebagai "sudah disimpan". */
  markClean: () => void;
}

export interface UnsavedGuardOptions {
  active: () => boolean;
  backLink?: HTMLAnchorElement | null;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const serialize = (form: HTMLFormElement) =>
  [...new FormData(form).entries()]
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : value.name}`)
    .sort()
    .join("\n");

export function mountUnsavedGuard(
  form: HTMLFormElement,
  options: UnsavedGuardOptions,
): UnsavedGuard {
  const { active, backLink = null } = options;
  let baseline = serialize(form);
  let dirty = false;
  let sentinel = false;
  let leaving = false;
  let dialogOpen = false;

  const refresh = () => {
    dirty = serialize(form) !== baseline;
  };
  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);

  const confirmLeave = async () => {
    if (dialogOpen) return false;
    dialogOpen = true;
    const yes = await confirmDialog({
      title: options.title ?? "Buang perubahan?",
      message:
        options.message ??
        "Perubahan pada pelan ini belum disimpan. Kalau keluar sekarang, perubahan akan hilang.",
      confirmLabel: options.confirmLabel ?? "Buang perubahan",
      cancelLabel: options.cancelLabel ?? "Teruskan edit",
      danger: true,
    });
    dialogOpen = false;
    return yes;
  };

  const pushGuard = () => {
    history.pushState(
      { ...(history.state ?? {}), unsavedGuard: true },
      "",
      location.href,
    );
    sentinel = true;
  };

  const arm = () => {
    if (sentinel || !active()) return;
    pushGuard();
  };

  const leave = () => {
    leaving = true;
    history.back();
  };

  backLink?.addEventListener("click", async (event) => {
    if (leaving || !active() || !dirty) return;
    event.preventDefault();
    if (await confirmLeave()) {
      leaving = true;
      location.href = backLink.href;
    }
  });

  window.addEventListener("popstate", async () => {
    if (!sentinel || leaving) return;
    sentinel = false;
    if (!active() || !dirty) {
      leave();
      return;
    }
    if (!(await confirmLeave())) {
      pushGuard();
      return;
    }
    leave();
  });

  return {
    arm,
    markClean() {
      baseline = serialize(form);
      dirty = false;
    },
  };
}
