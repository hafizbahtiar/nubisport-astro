// Tanya sebelum tindakan yang tak boleh diundur (padam pelan, log keluar).
// Dialog: src/components/ui/ConfirmDialog.astro (dipasang dalam Layout + AccountLayout).
//
//   if (await sahkan({ tajuk: "Padam pelan?", mesej: "...", ya: "Padam", bahaya: true })) ...

export interface Sahkan {
  tajuk: string;
  mesej: string;
  ya?: string;
  batal?: string;
  /** Butang merah, dan fokus mula pada "Batal" supaya Enter tak memadam tanpa sengaja. */
  bahaya?: boolean;
}

export function sahkan({ tajuk, mesej, ya = "Ya", batal = "Batal", bahaya = false }: Sahkan): Promise<boolean> {
  const d = document.getElementById("sahkan") as HTMLDialogElement | null;
  if (!d || typeof d.showModal !== "function") return Promise.resolve(confirm(`${tajuk}\n\n${mesej}`));
  const btnYa = d.querySelector<HTMLButtonElement>("[data-ya]")!;
  const btnBatal = d.querySelector<HTMLButtonElement>("[data-batal]")!;
  d.querySelector("#sahkan-tajuk")!.textContent = tajuk;
  d.querySelector("#sahkan-mesej")!.textContent = mesej;
  btnYa.textContent = ya;
  btnBatal.textContent = batal;
  btnYa.classList.toggle("btn-bahaya", bahaya);
  d.showModal();
  (bahaya ? btnBatal : btnYa).focus();
  // Jawapan terus dari tindakan pengguna, bukan hanya event "close" (tak segerak, dan Chrome
  // headless kadang-kadang tak menghantarnya). Pendengar dibuang selepas satu jawapan.
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
