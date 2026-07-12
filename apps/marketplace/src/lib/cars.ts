export type Availability = "disponivel" | "sob-consulta";
export type Badge = "RARO" | "NOVO" | "ÚLTIMA UNIDADE" | "RESERVADO";
export type Body = "Coupé" | "Sedan" | "GT" | "Conversível" | "SUV";
export type Transmission = "PDK" | "DCT" | "Automático";
export type Fuel = "Gasolina" | "Híbrido";

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  color: string; // e.g. "Branco Carrara"
  body: Body;
  transmission: Transmission;
  fuel: Fuel;
  /** price in BRL, or null when "Sob consulta" */
  price: number | null;
  badge?: Badge;
  /** short editorial note shown on the showroom card */
  description?: string;
  image: string; // path under /public
  /** true when a placeholder photo is used (real photo pending) */
  placeholder?: boolean;
}

export const cars: Car[] = [
  {
    id: "porsche-911-gt3-rs",
    brand: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    km: 1200,
    color: "Branco Carrara",
    description: "Aero kit Weissach, bancos em carbono e procedência impecável de primeiro dono.",
    body: "Coupé",
    transmission: "PDK",
    fuel: "Gasolina",
    price: 2890000,
    badge: "RARO",
    image: "/Image (Porsche 911 GT3 RS).png",
  },
  {
    id: "ferrari-296-gtb",
    brand: "Ferrari",
    model: "296 GTB",
    year: 2023,
    km: 3400,
    color: "Rosso Corsa",
    description: "V6 híbrido turbinado, 830 cv combinados. Histórico completo e revisão oficial.",
    body: "Coupé",
    transmission: "DCT",
    fuel: "Híbrido",
    price: null,
    badge: "ÚLTIMA UNIDADE",
    image: "/Image (Ferrari 296 GTB).png",
  },
  {
    id: "lamborghini-huracan-tecnica",
    brand: "Lamborghini",
    model: "Huracán Tecnica",
    year: 2024,
    km: 880,
    color: "Verde Mantis",
    description: "V10 aspirado, dinâmica de pista, configuração específica para a unidade.",
    body: "Coupé",
    transmission: "DCT",
    fuel: "Gasolina",
    price: 3450000,
    badge: "NOVO",
    image: "/Image (Lamborghini Huracán Tecnica).png",
  },
  {
    id: "mercedes-amg-gt-63-s",
    brand: "Mercedes-AMG",
    model: "GT 63 S",
    year: 2023,
    km: 5100,
    color: "Preto Obsidiana",
    description: "Quatro portas com motor 4.0 V8 biturbo. Acabamento Designo e laudo independente.",
    body: "Sedan",
    transmission: "Automático",
    fuel: "Gasolina",
    price: 1690000,
    image: "/Image (Mercedes-AMG GT 63 S).png",
  },
  {
    id: "aston-martin-db12",
    brand: "Aston Martin",
    model: "DB12",
    year: 2024,
    km: 1500,
    color: "British Racing Green",
    description:
      "Super GT inglês com 680 cv. Couro Bridge of Weir e detalhes em alumínio escovado.",
    body: "GT",
    transmission: "Automático",
    fuel: "Gasolina",
    price: null,
    badge: "RESERVADO",
    image: "/Image (Aston Martin DB12).png",
  },
  {
    id: "bentley-continental-gt-speed",
    brand: "Bentley",
    model: "Continental GT Speed",
    year: 2023,
    km: 6800,
    color: "Orange Flame",
    description: "GT de 12 cilindros, interior em couro Mulliner, presença para qualquer agenda.",
    body: "GT",
    transmission: "Automático",
    fuel: "Gasolina",
    price: 2150000,
    image: "/Image (Bentley Continental GT Speed).png",
  },
  {
    id: "bmw-m5-competition",
    brand: "BMW",
    model: "M5 Competition",
    year: 2024,
    km: 2800,
    color: "Cinza Brooklyn",
    body: "Sedan",
    transmission: "Automático",
    fuel: "Gasolina",
    price: 1290000,
    badge: "NOVO",
    // placeholder: real BMW photo pending — design reuses the Porsche shot
    image: "/Image (Porsche 911 GT3 RS).png",
    placeholder: true,
  },
  {
    id: "jaguar-f-type-r75",
    brand: "Jaguar",
    model: "F-Type R75",
    year: 2023,
    km: 4200,
    color: "Azul Velocity",
    body: "Conversível",
    transmission: "Automático",
    fuel: "Gasolina",
    price: 980000,
    // placeholder: real Jaguar photo pending — design reuses the Porsche shot
    image: "/Image (Porsche 911 GT3 RS).png",
    placeholder: true,
  },
  {
    id: "range-rover-sv-autobiography",
    brand: "Range Rover",
    model: "SV Autobiography",
    year: 2024,
    km: 3200,
    color: "Belgravia Green",
    body: "SUV",
    transmission: "Automático",
    fuel: "Híbrido",
    price: 1890000,
    // placeholder: real Range Rover photo pending — design reuses the Mercedes shot
    image: "/Image (Mercedes-AMG GT 63 S).png",
    placeholder: true,
  },
];

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null): string {
  return price === null ? "Sob consulta" : brl.format(price);
}

export function formatKm(km: number): string {
  return `${new Intl.NumberFormat("pt-BR").format(km)} km`;
}

export const brands = [
  "Porsche",
  "Ferrari",
  "Lamborghini",
  "Mercedes-AMG",
  "Aston Martin",
  "Bentley",
  "BMW",
  "Jaguar",
  "Range Rover",
] as const;

export const bodies: Body[] = ["Coupé", "Sedan", "GT", "Conversível", "SUV"];
export const transmissions: Transmission[] = ["PDK", "DCT", "Automático"];
export const fuels: Fuel[] = ["Gasolina", "Híbrido"];
