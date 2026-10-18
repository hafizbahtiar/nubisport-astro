// Semua ikon UI = Lucide (lucide-static, lesen ISC) - satu set, satu gaya: grid 24, garis 2,
// hujung bulat, warna `currentColor`. Saiz dari CSS (`.lucide` dalam global.css, 1.25em).
// Tambah ikon: import dari "lucide-static" dan daftar di IKON. Jangan lukis path sendiri;
// pengecualian = jenama (public/brand) dan tanda semak `.check` (path Lucide `check` dalam CSS).
// Hanya ikon yang diimport masuk ke bundle (skrip pelayar guna ini untuk innerHTML).
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Cloud,
  Flag,
  Gauge,
  HeartPulse,
  House,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  SkipForward,
  Smartphone,
  Timer,
  UserRound,
  X,
} from "lucide-static";

const IKON = {
  awan: Cloud,
  bawah: ChevronDown,
  bendera: Flag,
  buku: BookOpen,
  laju: Gauge,
  kalendar: Calendar,
  kanan: ChevronRight,
  jeda: Pause,
  kiri: ChevronLeft,
  langkau: SkipForward,
  main: Play,
  mangga: LockKeyhole,
  menu: Menu,
  nadi: HeartPulse,
  pemasa: Timer,
  pengguna: UserRound,
  peranti: Smartphone,
  rumah: House,
  selesai: CircleCheck,
  tanda: Check,
  tutup: X,
};
export type NamaIkon = keyof typeof IKON;

/** SVG Lucide sebagai string (hiasan - aria-hidden). Label teks datang dari elemen induk. */
export const ikon = (nama: NamaIkon): string =>
  IKON[nama].replace("<svg", '<svg aria-hidden="true" focusable="false"');
