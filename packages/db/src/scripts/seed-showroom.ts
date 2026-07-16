/**
 * Seed the showroom inventory.
 *
 * Loads a curated set of luxury listings, each with one full-car photo presented on a
 * transparent background (the car "floating"), into a single "SELECTCARS Showroom"
 * dealership. Everything the marketplace renders (names, prices, specs, images) then comes
 * from the database rather than a hardcoded file.
 *
 * The images are free stock photos (Pexels License, no attribution required) with their
 * backgrounds removed locally; provenance is in apps/marketplace/public/cars/CREDITS.json.
 * Each listing's make/model/body is aligned to the actual car in its photo, so nothing
 * misrepresents what a buyer sees. Rows store the site-relative path under /public.
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

const p = (file: string, alt: string): SeedPhoto => ({ file, alt, primary: true });

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
    exteriorColor: "GT Silver",
    interiorColor: "Black",
    description:
      "Weissach package, carbon bucket seats, and impeccable single-owner provenance. A track weapon that remains a Porsche you can drive home.",
    photos: [p("porsche-911.png", "Porsche 911 GT3 RS in GT Silver")],
  },
  {
    slug: "ferrari-488-challenge",
    make: "Ferrari",
    model: "488 Challenge Evo",
    year: 2021,
    trim: null,
    mileage: 3400,
    priceUsd: 328000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Rosso Corsa",
    interiorColor: "Nero Alcantara",
    description:
      "The 488 Challenge Evo: a race-bred twin-turbo V8, full aero, and competition livery. Track ready, with a documented racing history.",
    photos: [p("ferrari-488.png", "Ferrari 488 Challenge Evo in Rosso Corsa")],
  },
  {
    slug: "lamborghini-huracan-tecnica",
    make: "Lamborghini",
    model: "Huracan Tecnica",
    year: 2024,
    trim: null,
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
    photos: [p("lamborghini-huracan.png", "Lamborghini Huracan Tecnica in Arancio Xanto")],
  },
  {
    slug: "mercedes-amg-gt-r",
    make: "Mercedes-AMG",
    model: "GT R",
    year: 2023,
    trim: null,
    mileage: 4100,
    priceUsd: 168000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Brilliant Blue",
    interiorColor: "Black Nappa",
    description:
      "The Green Hell GT R: a handbuilt 4.0 twin-turbo V8, active aero, and rear-wheel steering. Finished in a striking Brilliant Blue.",
    photos: [p("mercedes-amg-gtr.png", "Mercedes-AMG GT R in Brilliant Blue")],
  },
  {
    slug: "aston-martin-db11",
    make: "Aston Martin",
    model: "DB11",
    year: 2022,
    trim: "V8",
    mileage: 6200,
    priceUsd: 179000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Ice White",
    interiorColor: "Chestnut Tan",
    description:
      "The quintessential super tourer: a 4.0 twin-turbo V8, hand-stitched leather, and grand touring comfort with genuine pace.",
    photos: [p("aston-martin-db11.png", "Aston Martin DB11 in Ice White")],
  },
  {
    slug: "range-rover-evoque",
    make: "Range Rover",
    model: "Evoque Dynamic",
    year: 2024,
    trim: null,
    mileage: 5200,
    priceUsd: 62000,
    condition: "Certified",
    bodyStyle: "SUV",
    fuelType: "Hybrid",
    transmission: "Automatic",
    drivetrain: "4WD",
    exteriorColor: "Fuji White",
    interiorColor: "Ebony",
    description:
      "The compact luxury SUV that started a category. Plug-in hybrid, all-wheel drive, and an interior a class above its size.",
    photos: [p("range-rover-evoque.png", "Range Rover Evoque Dynamic in Fuji White")],
  },
  {
    slug: "jaguar-xf",
    make: "Jaguar",
    model: "XF R-Sport",
    year: 2022,
    trim: null,
    mileage: 12800,
    priceUsd: 47000,
    condition: "Used",
    bodyStyle: "Sedan",
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "RWD",
    exteriorColor: "Polaris White",
    interiorColor: "Jet Black",
    description:
      "A British executive sport sedan: supercharged, rear-wheel drive, and finished with R-Sport styling. Poised and understated.",
    photos: [p("jaguar-xf.png", "Jaguar XF R-Sport in Polaris White")],
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
    exteriorColor: "Onyx Black",
    interiorColor: "Linen",
    description:
      "Twelve-cylinder grand tourer with a Mulliner leather interior. Effortless presence for any occasion, with the full Bentley service book.",
    photos: [p("bentley-continental.png", "Bentley Continental GT Speed in Onyx Black")],
  },
  {
    slug: "bmw-m2-competition",
    make: "BMW",
    model: "M2 Competition",
    year: 2023,
    trim: null,
    mileage: 9800,
    priceUsd: 68000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    transmission: "Manual",
    drivetrain: "RWD",
    exteriorColor: "Alpine White",
    interiorColor: "Black",
    description:
      "The purist's M car: a twin-turbo inline-six, a manual gearbox, and rear-wheel drive, wrapped in M Motorsport livery.",
    photos: [p("bmw-m2.png", "BMW M2 Competition in Alpine White")],
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
          [vehicleId, SHOWROOM.id, `/cars/${photo.file}`, photo.alt, i, photo.primary === true],
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
