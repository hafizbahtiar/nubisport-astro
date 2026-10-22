// Semua ikon UI = Lucide (lucide-static, lesen ISC) - satu set, satu gaya: grid 24, garis 2,
// hujung bulat, warna `currentColor`. Saiz dari CSS (`.lucide` dalam global.css, 1.25em).
// Tambah ikon: import dari "lucide-static" dan daftar di ICONS. Jangan lukis path sendiri;
// pengecualian = jenama (public/brand) dan tanda semak `.check` (path Lucide `check` dalam CSS).
// Hanya ikon yang diimport masuk ke bundle (skrip pelayar guna ini untuk innerHTML).
import {
  Activity,
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
  LogOut,
  Menu,
  Pause,
  Play,
  Search,
  Settings,
  SkipForward,
  Smartphone,
  Tag,
  Timer,
  Upload,
  UserRound,
  X,
} from "lucide-static";

const ICONS = {
  aktiviti: Activity,
  awan: Cloud,
  bawah: ChevronDown,
  bendera: Flag,
  cari: Search,
  buku: BookOpen,
  harga: Tag,
  laju: Gauge,
  kalendar: Calendar,
  kanan: ChevronRight,
  keluar: LogOut,
  jeda: Pause,
  kiri: ChevronLeft,
  langkau: SkipForward,
  main: Play,
  mangga: LockKeyhole,
  menu: Menu,
  nadi: HeartPulse,
  pemasa: Timer,
  muatNaik: Upload,
  pengguna: UserRound,
  peranti: Smartphone,
  rumah: House,
  selesai: CircleCheck,
  tanda: Check,
  tetapan: Settings,
  tutup: X,
};
export type IconName = keyof typeof ICONS;

/** SVG Lucide sebagai string (hiasan - aria-hidden). Label teks datang dari elemen induk. */
export const icon = (name: IconName): string =>
  ICONS[name].replace("<svg", '<svg aria-hidden="true" focusable="false"');
