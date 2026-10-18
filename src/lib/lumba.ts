// Tarikh hari ini di Malaysia (YYYY-MM-DD) - /lumba sembunyikan acara lepas, skrip semak kira `disemak`.
export const tarikhMY = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(d);
