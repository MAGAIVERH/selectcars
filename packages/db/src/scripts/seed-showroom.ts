/**
 * Seed the showroom inventory.
 *
 * Loads a curated set of luxury listings, with their gallery photos, into a single
 * "SELECTCARS Showroom" dealership. Everything the marketplace renders (names, prices,
 * specs, images) then comes from the database rather than a hardcoded file.
 *
 * The images themselves are free stock photos (Pexels License, no attribution required);
 * provenance is recorded in apps/marketplace/public/cars/CREDITS.json. The rows store only
 * the site-relative path under /public, so moving to Supabase Storage later is a URL swap.
 *
 * Idempotent: it re-creates the showroom's inventory from scratch on every run, scoped to
 * the showroom tenant by RLS, so it never touches another dealership's cars.
 *
 *   Run: pnpm --filter @selectcars/db seed
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { PoolClient } from "pg";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

import { getPool } from "../pool";
import { withTenant } from "../tenant";
import { assertSelectcarsDatabase, describeTarget } from "../guard";

/** A stable id and slug so re-running the seed reuses the same dealership. */
const SHOWROOM = {
  id: "org_selectcars_showroom",
  name: "SELECTCARS Showroom",
  slug: "selectcars-showroom",
} as const;

type SeedPhoto = { file: string; alt: string; primary?: boolean };

type SeedVehicle = {
  slug: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  mileage: number;
  priceUsd: number | null;
  condition: "New" | "Used" | "Certified";
  bodyStyle: "Sedan" | "Coupe" | "SUV" | "Truck" | "Convertible" | "Hatchback";
  fuelType: "Gas" | "Hybrid" | "EV" | "Diesel";
  transmission: "Automatic" | "Manual";
  drivetrain: "FWD" | "RWD" | "AWD" | "4WD";
  exteriorColor: string;
  interiorColor: string;
  description: string;
  photos: SeedPhoto[];
};

const p = (file: string, alt: string, primary = false): SeedPhoto => ({ file, alt, primary });

const VEHICLES: SeedVehicle[] = [
  {
    slug: "porsche-911-gt3-rs",
    make: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    trim: "Weissach",
    mileage: 750,
    priceUsd: 289000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Carrara White",
    interiorColor: "Black",
    description:
      "Weissach package, carbon bucket seats, and impeccable single-owner provenance. A track weapon that remains a Porsche you can drive home.",
    photos: [
      p("porsche-911-white.jpg", "Porsche 911 GT3 RS in Carrara White", true),
      p("porsche-911-red.jpg", "Porsche 911 in Guards Red"),
      p("porsche-911-green.jpg", "Porsche 911 in Python Green"),
      p("porsche-911-turbo.jpg", "Porsche 911 rear three-quarter"),
    ],
  },
  {
    slug: "ferrari-296-gtb",
    make: "Ferrari",
    model: "296 GTB",
    year: 2023,
    trim: "Assetto Fiorano",
    mileage: 2100,
    priceUsd: 359000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Hybrid",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Rosso Corsa",
    interiorColor: "Nero",
    description:
      "Twin-turbo V6 hybrid making 830 combined horsepower. Full Ferrari history and factory service, with the Assetto Fiorano package.",
    photos: [
      p("ferrari-red.jpg", "Ferrari 296 GTB in Rosso Corsa", true),
      p("ferrari-red-showroom.jpg", "Ferrari 296 GTB in the showroom"),
      p("ferrari-yellow.jpg", "Ferrari in Giallo Modena"),
      p("ferrari-red-black.jpg", "Ferrari 296 GTB detail"),
    ],
  },
  {
    slug: "lamborghini-huracan-tecnica",
    make: "Lamborghini",
    model: "Huracan Tecnica",
    year: 2024,
    trim: "Tecnica",
    mileage: 550,
    priceUsd: 319000,
    condition: "New",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Arancio Xanto",
    interiorColor: "Nero Ade",
    description:
      "Naturally aspirated 5.2 V10, track-focused dynamics, and a one-off specification. The last of a breed before electrification.",
    photos: [
      p("lamborghini-huracan-orange.jpg", "Lamborghini Huracan Tecnica in Arancio Xanto", true),
      p("lamborghini-green.jpg", "Lamborghini in Verde Mantis"),
      p("lamborghini-runway.jpg", "Lamborghini Huracan on the runway"),
    ],
  },
  {
    slug: "mercedes-amg-gt-63-s",
    make: "Mercedes-AMG",
    model: "GT 63 S",
    year: 2023,
    trim: "Edition 1",
    mileage: 3200,
    priceUsd: 185000,
    condition: "Certified",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "AWD",
    exteriorColor: "Brilliant Blue",
    interiorColor: "Black Nappa",
    description:
      "Handbuilt 4.0 twin-turbo V8 with AMG Performance 4MATIC+. Designo finish and an independent pre-purchase inspection on file.",
    photos: [
      p("mercedes-amg-gtr-blue.jpg", "Mercedes-AMG GT in Brilliant Blue", true),
      p("mercedes-amg-dealership.jpg", "Mercedes-AMG in the showroom"),
    ],
  },
  {
    slug: "aston-martin-db12",
    make: "Aston Martin",
    model: "DB12",
    year: 2024,
    trim: "Coupe",
    mileage: 930,
    priceUsd: null,
    condition: "New",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Ice White",
    interiorColor: "Chestnut Tan",
    description:
      "The self-styled super tourer: 680 horsepower, Bridge of Weir leather, and brushed aluminum details. Priced on application.",
    photos: [p("aston-martin-white.jpg", "Aston Martin DB12 in Ice White", true)],
  },
  {
    slug: "bentley-continental-gt-speed",
    make: "Bentley",
    model: "Continental GT Speed",
    year: 2023,
    trim: "Mulliner",
    mileage: 4200,
    priceUsd: 289000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "AWD",
    exteriorColor: "Silver Frost",
    interiorColor: "Linen",
    description:
      "Twelve-cylinder grand tourer with a Mulliner leather interior. Effortless presence for any occasion, with the full Bentley service book.",
    photos: [p("bentley-continental-gt.jpg", "Bentley Continental GT Speed in Silver Frost", true)],
  },
  {
    slug: "jaguar-f-type-r75",
    make: "Jaguar",
    model: "F-Type R75",
    year: 2023,
    trim: "R75 Convertible",
    mileage: 2600,
    priceUsd: 109000,
    condition: "Certified",
    bodyStyle: "Convertible",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "AWD",
    exteriorColor: "Firenze Red",
    interiorColor: "Mars Red",
    description:
      "The final-edition supercharged 5.0 V8, one of the last of the breed. Convertible, all-wheel drive, and a soundtrack to match.",
    photos: [
      p("jaguar-red.jpg", "Jaguar F-Type R75 in Firenze Red", true),
      p("jaguar-black-showroom.jpg", "Jaguar in Santorini Black"),
      p("jaguar-white.jpg", "Jaguar in Fuji White"),
    ],
  },
  {
    slug: "range-rover-sv-autobiography",
    make: "Range Rover",
    model: "SV Autobiography",
    year: 2024,
    trim: "SV",
    mileage: 2000,
    priceUsd: 215000,
    condition: "Used",
    bodyStyle: "SUV",
    fuelType: "Hybrid",
    transmission: "Automatic",
    drivetrain: "4WD",
    exteriorColor: "Arctic White",
    interiorColor: "Caraway",
    description:
      "The flagship SV: a plug-in hybrid drivetrain, executive rear seating, and the most complete luxury SUV Land Rover builds.",
    photos: [p("range-rover-white.jpg", "Range Rover SV Autobiography in Arctic White", true)],
  },
  {
    slug: "bmw-m5-competition",
    make: "BMW",
    model: "M5 Competition",
    year: 2024,
    trim: "Competition",
    mileage: 1740,
    priceUsd: 122000,
    condition: "Used",
    bodyStyle: "Sedan",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "AWD",
    exteriorColor: "Marina Bay Blue",
    interiorColor: "Silverstone",
    description:
      "The super sedan benchmark: 617 horsepower, M xDrive with a rear-drive mode, and carbon ceramic brakes. A car for every day and every track day.",
    photos: [p("bmw-blue.jpg", "BMW M5 Competition in Marina Bay Blue", true)],
  },
];

async function upsertShowroom(client: PoolClient): Promise<void> {
  await client.query(
    `insert into public."organization" (id, name, slug, "createdAt")
     values ($1, $2, $3, now())
     on conflict (id) do update set name = excluded.name`,
    [SHOWROOM.id, SHOWROOM.name, SHOWROOM.slug],
  );
}

async function seedInventory(): Promise<{ vehicles: number; photos: number }> {
  return withTenant(SHOWROOM.id, async (client) => {
    // Rebuild this showroom's inventory from scratch. RLS scopes the delete to this tenant,
    // and the FK cascade removes the old photos, so a re-run never duplicates or leaks.
    await client.query("delete from public.vehicles where tenant_id = $1", [SHOWROOM.id]);

    let photoCount = 0;
    for (const v of VEHICLES) {
      const inserted = await client.query<{ id: string }>(
        `insert into public.vehicles (
           tenant_id, slug, make, model, year, trim, mileage, price_usd,
           condition, body_style, fuel_type, transmission, drivetrain,
           exterior_color, interior_color, description, status
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active')
         returning id`,
        [
          SHOWROOM.id,
          v.slug,
          v.make,
          v.model,
          v.year,
          v.trim,
          v.mileage,
          v.priceUsd,
          v.condition,
          v.bodyStyle,
          v.fuelType,
          v.transmission,
          v.drivetrain,
          v.exteriorColor,
          v.interiorColor,
          v.description,
        ],
      );
      const vehicleId = inserted.rows[0].id;

      for (let i = 0; i < v.photos.length; i++) {
        const photo = v.photos[i];
        await client.query(
          `insert into public.vehicle_photos (vehicle_id, tenant_id, url, alt, position, is_primary)
           values ($1,$2,$3,$4,$5,$6)`,
          [
            vehicleId,
            SHOWROOM.id,
            `/cars/${photo.file}`,
            photo.alt,
            i,
            photo.primary === true,
          ],
        );
        photoCount++;
      }
    }

    return { vehicles: VEHICLES.length, photos: photoCount };
  });
}

async function main(): Promise<void> {
  const connectionString = process.env.SELECTCARS_DATABASE_URL;
  if (!connectionString) throw new Error("SELECTCARS_DATABASE_URL is not set.");

  // Say out loud where we are about to write, and refuse anything that is not this
  // project's Supabase database. Never seed into the wrong place.
  const target = assertSelectcarsDatabase(connectionString);
  console.log(`target: ${target.user}@${target.host}/${target.database}\n`);
  void describeTarget; // keep the guard's public API referenced

  const pool = getPool();

  // The organization row is written as the connecting role (postgres): the app role has no
  // grant on the auth tables. Vehicles and photos are written tenant-scoped, under RLS.
  const client = await pool.connect();
  try {
    await upsertShowroom(client);
  } finally {
    client.release();
  }
  console.log(`showroom: ${SHOWROOM.name} (${SHOWROOM.id})`);

  const { vehicles, photos } = await seedInventory();
  console.log(`seeded:   ${vehicles} vehicles, ${photos} photos, all status=active`);

  await pool.end();
  console.log("\ndone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
