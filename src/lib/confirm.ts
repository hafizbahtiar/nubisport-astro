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
  /** Tunjuk medan kata laluan dengan label ini (contoh padam akaun). */
  passwordLabel?: string;
  /** Jalan bila "Ya" ditekan, dialog kekal buka: pulang mesej ralat (dipapar dalam dialog), atau null = selesai. */
  action?: (password: string) => Promise<string | null>;
}

export function confirmDialog({ title, message, confirmLabel = "Ya", cancelLabel = "Batal", danger = false, passwordLabel, action }: ConfirmOptions): Promise<boolean> {
  const d = document.getElementById("confirm-dialog") as HTMLDialogElement | null;
  if (!d || typeof d.showModal !== "function") return Promise.resolve(!action && confirm(`${title}\n\n${message}`));
  const btnYa = d.querySelector<HTMLButtonElement>("[data-ya]")!;
  const btnBatal = d.querySelector<HTMLButtonElement>("[data-batal]")!;
  const medan = d.querySelector<HTMLElement>(".confirm-field")!;
  const input = d.querySelector<HTMLInputElement>("#confirm-input")!;
  const ralat = d.querySelector<HTMLElement>("#confirm-error")!;
  d.querySelector("#confirm-title")!.textContent = title;
  d.querySelector("#confirm-message")!.textContent = message;
  d.querySelector("#confirm-field-label")!.textContent = passwordLabel ?? "";
  medan.hidden = !passwordLabel;
  input.value = "";
  ralat.hidden = true;
  btnYa.textContent = confirmLabel;
  btnBatal.textContent = cancelLabel;
  btnYa.classList.toggle("btn-bahaya", danger);
  d.showModal();
  (passwordLabel ? input : danger ? btnBatal : btnYa).focus();
  // Jawapan terus dari tindakan pengguna, bukan hanya event "close" (tidak segerak, dan Chrome
  // headless kadang-kadang tidak menghantarnya). Pendengar dibuang selepas satu jawapan.
  return new Promise((jawab) => {
    const ac = new AbortController();
    const opt = { signal: ac.signal };
    let sibuk = false;
    const tamat = (ya: boolean) => {
      ac.abort();
      input.value = ""; // jangan tinggal kata laluan dalam DOM
      if (d.open) d.close(ya ? "ya" : "");
      jawab(ya);
    };
    const ya = async () => {
      if (!action) return tamat(true);
      if (sibuk) return;
      sibuk = btnYa.disabled = btnBatal.disabled = true;
      const mesej = await action(input.value).catch(() => "Tiada sambungan. Semak internet anda dan cuba lagi.");
      sibuk = btnYa.disabled = btnBatal.disabled = false;
      if (mesej === null) return tamat(true);
      ralat.textContent = mesej;
      ralat.hidden = false;
      (passwordLabel ? input : btnYa).focus();
    };
    btnYa.addEventListener("click", ya, opt);
    input.addEventListener("keydown", (e) => e.key === "Enter" && ya(), opt);
    btnBatal.addEventListener("click", () => tamat(false), opt);
    d.addEventListener("cancel", (e) => (sibuk ? e.preventDefault() : tamat(false)), opt); // Esc
    d.addEventListener("click", (e) => e.target === d && !sibuk && tamat(false), opt); // klik pada latar
    d.addEventListener("close", () => tamat(d.returnValue === "ya"), opt); // ditutup cara lain
  });
}
