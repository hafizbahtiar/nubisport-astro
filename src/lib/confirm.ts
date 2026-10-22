// Tanya sebelum tindakan yang tidak boleh dibatalkan (padam pelan, log keluar).
// Dialog: src/components/ui/ConfirmDialog.astro (dipasang dalam Layout + AccountLayout).
//
//   if (await confirmDialog({ title: "Padam pelan?", message: "...", confirmLabel: "Padam", danger: true })) ...

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Butang merah, dan fokus mula pada "Batal" supaya Enter tidak memadam tanpa sengaja. */
  danger?: boolean;
}

export function confirmDialog({ title, message, confirmLabel = "Ya", cancelLabel = "Batal", danger = false }: ConfirmOptions): Promise<boolean> {
  const d = document.getElementById("confirm-dialog") as HTMLDialogElement | null;
  if (!d || typeof d.showModal !== "function") return Promise.resolve(confirm(`${title}\n\n${message}`));
  const btnYa = d.querySelector<HTMLButtonElement>("[data-ya]")!;
  const btnBatal = d.querySelector<HTMLButtonElement>("[data-batal]")!;
  d.querySelector("#confirm-title")!.textContent = title;
  d.querySelector("#confirm-message")!.textContent = message;
  btnYa.textContent = confirmLabel;
  btnBatal.textContent = cancelLabel;
  btnYa.classList.toggle("btn-bahaya", danger);
  d.showModal();
  (danger ? btnBatal : btnYa).focus();
  // Jawapan terus dari tindakan pengguna, bukan hanya event "close" (tidak segerak, dan Chrome
  // headless kadang-kadang tidak menghantarnya). Pendengar dibuang selepas satu jawapan.
  return new Promise((jawab) => {
    const ac = new AbortController();
    const opt = { signal: ac.signal };
    const tamat = (ya: boolean) => {
      ac.abort();
      if (d.open) d.close(ya ? "ya" : "");
      jawab(ya);
    };
    btnYa.addEventListener("click", () => tamat(true), opt);
    btnBatal.addEventListener("click", () => tamat(false), opt);
    d.addEventListener("cancel", () => tamat(false), opt); // Esc
    d.addEventListener("click", (e) => e.target === d && tamat(false), opt); // klik pada latar
    d.addEventListener("close", () => tamat(d.returnValue === "ya"), opt); // ditutup cara lain
  });
}
