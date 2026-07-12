export type Availability = "available" | "inquire";
export type Badge = "RARE" | "NEW" | "FINAL UNIT" | "RESERVED";
export type Body = "Coupe" | "Sedan" | "GT" | "Convertible" | "SUV";
export type Transmission = "PDK" | "DCT" | "Automatic";
export type Fuel = "Gas" | "Hybrid";

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number; // miles
  color: string; // e.g. "Carrara White"
  body: Body;
  transmission: Transmission;
  fuel: Fuel;
  /** price in USD, or null when "Inquire" */
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
    mileage: 750,
    color: "Carrara White",
    description: "Weissach package, carbon bucket seats, and impeccable single-owner provenance.",
    body: "Coupe",
    transmission: "PDK",
    fuel: "Gas",
    price: 289000,
    badge: "RARE",
    image: "/Image (Porsche 911 GT3 RS).png",
  },
  {
    id: "ferrari-296-gtb",
    brand: "Ferrari",
    model: "296 GTB",
    year: 2023,
    mileage: 2100,
    color: "Rosso Corsa",
    description: "Twin-turbo V6 hybrid, 830 combined hp. Full history and factory service.",
    body: "Coupe",
    transmission: "DCT",
    fuel: "Hybrid",
    price: null,
    badge: "FINAL UNIT",
    image: "/Image (Ferrari 296 GTB).png",
  },
  {
    id: "lamborghini-huracan-tecnica",
    brand: "Lamborghini",
    model: "Huracán Tecnica",
    year: 2024,
    mileage: 550,
    color: "Mantis Green",
    description: "Naturally aspirated V10, track-focused dynamics, one-off specification.",
    body: "Coupe",
    transmission: "DCT",
    fuel: "Gas",
    price: 319000,
    badge: "NEW",
    image: "/Image (Lamborghini Huracán Tecnica).png",
  },
  {
    id: "mercedes-amg-gt-63-s",
    brand: "Mercedes-AMG",
    model: "GT 63 S",
    year: 2023,
    mileage: 3200,
    color: "Obsidian Black",
    description: "Four-door with a 4.0 twin-turbo V8. Designo finish and independent inspection.",
    body: "Sedan",
    transmission: "Automatic",
    fuel: "Gas",
    price: 185000,
    image: "/Image (Mercedes-AMG GT 63 S).png",
  },
  {
    id: "aston-martin-db12",
    brand: "Aston Martin",
    model: "DB12",
    year: 2024,
    mileage: 930,
    color: "British Racing Green",
    description:
      "British super GT with 680 hp. Bridge of Weir leather and brushed aluminum details.",
    body: "GT",
    transmission: "Automatic",
    fuel: "Gas",
    price: null,
    badge: "RESERVED",
    image: "/Image (Aston Martin DB12).png",
  },
  {
    id: "bentley-continental-gt-speed",
    brand: "Bentley",
    model: "Continental GT Speed",
    year: 2023,
    mileage: 4200,
    color: "Orange Flame",
    description: "Twelve-cylinder GT, Mulliner leather interior, presence for any occasion.",
    body: "GT",
    transmission: "Automatic",
    fuel: "Gas",
    price: 289000,
    image: "/Image (Bentley Continental GT Speed).png",
  },
  {
    id: "bmw-m5-competition",
    brand: "BMW",
    model: "M5 Competition",
    year: 2024,
    mileage: 1740,
    color: "Brooklyn Grey",
    body: "Sedan",
    transmission: "Automatic",
    fuel: "Gas",
    price: 122000,
    badge: "NEW",
    // placeholder: real BMW photo pending; design reuses the Porsche shot
    image: "/Image (Porsche 911 GT3 RS).png",
    placeholder: true,
  },
  {
    id: "jaguar-f-type-r75",
    brand: "Jaguar",
    model: "F-Type R75",
    year: 2023,
    mileage: 2600,
    color: "Velocity Blue",
    body: "Convertible",
    transmission: "Automatic",
    fuel: "Gas",
    price: 109000,
    // placeholder: real Jaguar photo pending; design reuses the Porsche shot
    image: "/Image (Porsche 911 GT3 RS).png",
    placeholder: true,
  },
  {
    id: "range-rover-sv-autobiography",
    brand: "Range Rover",
    model: "SV Autobiography",
    year: 2024,
    mileage: 2000,
    color: "Belgravia Green",
    body: "SUV",
    transmission: "Automatic",
    fuel: "Hybrid",
    price: 215000,
    // placeholder: real Range Rover photo pending; design reuses the Mercedes shot
    image: "/Image (Mercedes-AMG GT 63 S).png",
    placeholder: true,
  },
];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null): string {
  return price === null ? "Inquire" : usd.format(price);
}

export function formatMileage(mileage: number): string {
  return `${new Intl.NumberFormat("en-US").format(mileage)} mi`;
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

export const bodies: Body[] = ["Coupe", "Sedan", "GT", "Convertible", "SUV"];
export const transmissions: Transmission[] = ["PDK", "DCT", "Automatic"];
export const fuels: Fuel[] = ["Gas", "Hybrid"];
