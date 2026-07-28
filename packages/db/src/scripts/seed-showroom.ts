/**
 * Seed the marketplace with real sellers.
 *
 * SELECTCARS is a multi-seller platform, so the seed creates **two** dealerships and gives
 * each its own inventory:
 *
 *   SELECTCARS Showroom  (Miami, FL)  a private performance and grand touring showroom
 *   Bayshore Fleet Sales (Tampa, FL)  a rental company remarketing its own fleet
 *
 * That is the point: a buyer browsing `/colecao` sees both sellers' cars in one collection,
 * can tell who is selling each one, and can filter down to a single seller. It is exactly
 * what happens when a real business signs up and publishes: nothing here is special-cased.
 *
 * Every photo follows one standard: a complete car in side profile, facing left, on a
 * transparent background (the car "floats"). Sources and the processing note are in
 * apps/marketplace/public/cars/CREDITS.json. Rows store the site-relative path under /public.
 *
 * Idempotent: it re-creates each dealership's inventory from scratch on every run, scoped to
 * that tenant by RLS, so it never touches a dealership it does not own.
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

type SeedPhoto = { file: string; alt: string; primary?: boolean };

/** A closed sale, so the dashboard's financial numbers have real history behind them. */
type SeedSale = {
  /** Days ago the deal closed, relative to the seed run. */
  soldDaysAgo: number;
  salePriceUsd: number;
  vehicleCostUsd: number;
  reconCostUsd: number;
  backEndGrossUsd: number;
  buyerName: string;
};

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
  /**
   * How long ago this car was listed. Without it every unit would have arrived today, and the
   * two numbers a dealer principal actually watches, average days on lot and what is aging
   * past 60 days, would be a flat zero on a screen that is supposed to warn them.
   */
  listedDaysAgo: number;
  /** Present on units that have already been sold. Those carry no photos: see the note below. */
  sale?: SeedSale;
};

/** A dealership account, exactly as a real one looks after signing up and filling its profile. */
type SeedDealership = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  phone: string;
  about: string;
  vehicles: SeedVehicle[];
};

const p = (file: string, alt: string): SeedPhoto => ({ file, alt, primary: true });

const DEALERSHIPS: SeedDealership[] = [
  {
    id: "org_selectcars_showroom",
    name: "SELECTCARS Showroom",
    slug: "selectcars-showroom",
    city: "Miami",
    state: "FL",
    phone: "+1 (305) 000-0000",
    about:
      "A private Miami showroom dealing in low-mileage performance and grand touring cars. Every unit is inspected in house and sold with its full service history.",
    vehicles: [
      {
        slug: "bentley-continental-gt",
        make: "Bentley",
        model: "Continental GT",
        year: 2022,
        trim: "Mulliner",
        mileage: 6400,
        priceUsd: 239000,
        condition: "Used",
        bodyStyle: "Coupe",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "Anthracite Satin",
        interiorColor: "Linen",
        description:
          "Twelve-cylinder grand tourer with a Mulliner leather interior. Effortless presence for any occasion, with the full Bentley service book.",
        photos: [p("bentley-continental-gt.png", "Bentley Continental GT in Anthracite Satin")],
        listedDaysAgo: 74,
      },
      {
        slug: "mercedes-amg-c63-coupe",
        make: "Mercedes-AMG",
        model: "C 63 Coupe",
        year: 2023,
        trim: "Widebody",
        mileage: 3900,
        priceUsd: 124000,
        condition: "Used",
        bodyStyle: "Coupe",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "RWD",
        exteriorColor: "Bronze Metallic",
        interiorColor: "Black Nappa",
        description:
          "A handbuilt AMG V8 under a widebody kit, forged wheels, and a fixed rear wing. Loud where it should be, finished to a standard that is not.",
        photos: [p("mercedes-amg-c63.png", "Mercedes-AMG C 63 Coupe in Bronze Metallic")],
        listedDaysAgo: 21,
      },
      {
        slug: "jaguar-f-type-r",
        make: "Jaguar",
        model: "F-Type R",
        year: 2023,
        trim: null,
        mileage: 5100,
        priceUsd: 98500,
        condition: "Certified",
        bodyStyle: "Coupe",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "Fuji White",
        interiorColor: "Ebony",
        description:
          "The supercharged V8 F-Type, all-wheel drive, and one of the last of its kind. Certified, with the remainder of its factory warranty.",
        photos: [p("jaguar-f-type.png", "Jaguar F-Type R in Fuji White")],
        listedDaysAgo: 38,
      },
      {
        slug: "bmw-i8",
        make: "BMW",
        model: "i8",
        year: 2020,
        trim: null,
        mileage: 12400,
        priceUsd: 89000,
        condition: "Used",
        bodyStyle: "Coupe",
        fuelType: "Hybrid",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "E-Copper",
        interiorColor: "Amido Black",
        description:
          "Carbon-fibre passenger cell, plug-in hybrid drivetrain, and doors that still stop traffic. A future classic that is genuinely usable today.",
        photos: [p("bmw-i8.png", "BMW i8 in E-Copper")],
        listedDaysAgo: 96,
      },

      // --- Sold: history, so the dashboard opens with real numbers -----------------------
      // These carry no photos on purpose. A sold car is invisible to buyers (RLS admits only
      // `active` rows), so a photo would be work nobody ever sees, and inventing one would
      // mean showing the same image on two different listings in the dealer's own list.
      {
        slug: "porsche-911-carrera-s",
        make: "Porsche",
        model: "911 Carrera S",
        year: 2021,
        trim: null,
        mileage: 14200,
        priceUsd: 142000,
        condition: "Used",
        bodyStyle: "Coupe",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "RWD",
        exteriorColor: "Chalk",
        interiorColor: "Bordeaux Red",
        description: "Sport Chrono, ceramic brakes, and a documented single-owner history.",
        photos: [],
        listedDaysAgo: 55,
        sale: {
          soldDaysAgo: 12,
          salePriceUsd: 142000,
          vehicleCostUsd: 118000,
          reconCostUsd: 3200,
          backEndGrossUsd: 4800,
          buyerName: "R. Whitfield",
        },
      },
      {
        slug: "audi-r8-v10",
        make: "Audi",
        model: "R8 V10 performance",
        year: 2022,
        trim: null,
        mileage: 8700,
        priceUsd: 168000,
        condition: "Used",
        bodyStyle: "Coupe",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "Kemora Grey",
        interiorColor: "Black",
        description: "The last naturally aspirated V10 supercar, with carbon exterior package.",
        photos: [],
        listedDaysAgo: 90,
        sale: {
          soldDaysAgo: 34,
          salePriceUsd: 168000,
          vehicleCostUsd: 145000,
          reconCostUsd: 5500,
          backEndGrossUsd: 2900,
          buyerName: "M. Okafor",
        },
      },
    ],
  },
  {
    id: "org_bayshore_fleet",
    name: "Bayshore Fleet Sales",
    slug: "bayshore-fleet-sales",
    city: "Tampa",
    state: "FL",
    phone: "+1 (813) 000-0000",
    about:
      "The remarketing arm of a Florida rental fleet. Every car comes off our own rental line, is serviced on schedule, and is sold with its full maintenance record and a clean title.",
    vehicles: [
      {
        slug: "genesis-g90",
        make: "Genesis",
        model: "G90",
        year: 2023,
        trim: "3.5T",
        mileage: 21300,
        priceUsd: 57000,
        condition: "Used",
        bodyStyle: "Sedan",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "Vik Black",
        interiorColor: "Obsidian Black",
        description:
          "Our executive car: a twin-turbo V6 flagship sedan with rear-seat comfort that embarrasses cars twice the price. Serviced on schedule, one fleet owner.",
        photos: [p("genesis-g90.png", "Genesis G90 in Vik Black")],
        listedDaysAgo: 12,
      },
      {
        slug: "hyundai-kona",
        make: "Hyundai",
        model: "Kona SEL",
        year: 2022,
        trim: null,
        mileage: 28900,
        priceUsd: 22400,
        condition: "Used",
        bodyStyle: "SUV",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "FWD",
        exteriorColor: "Surf Blue",
        interiorColor: "Gray",
        description:
          "A compact crossover that spent its life on airport runs: highway miles, dealer-serviced, and cheap to run. Clean title, full maintenance record.",
        photos: [p("hyundai-kona.png", "Hyundai Kona SEL in Surf Blue")],
        listedDaysAgo: 47,
      },
      {
        slug: "hyundai-elantra",
        make: "Hyundai",
        model: "Elantra Limited",
        year: 2023,
        trim: null,
        mileage: 32700,
        priceUsd: 19900,
        condition: "Used",
        bodyStyle: "Sedan",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "FWD",
        exteriorColor: "Fluid Metal",
        interiorColor: "Black",
        description:
          "The value pick of the fleet: a well-equipped Limited with the balance of its factory warranty, priced to move as it leaves the rental line.",
        photos: [p("hyundai-elantra.png", "Hyundai Elantra Limited in Fluid Metal")],
        listedDaysAgo: 63,
      },

      // --- Sold: a volume seller's history, thin gross and quick turns --------------------
      {
        slug: "nissan-altima-sv",
        make: "Nissan",
        model: "Altima SV",
        year: 2023,
        trim: null,
        mileage: 34100,
        priceUsd: 21400,
        condition: "Used",
        bodyStyle: "Sedan",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "FWD",
        exteriorColor: "Gun Metallic",
        interiorColor: "Charcoal",
        description: "Ex-rental sedan, dealer serviced, clean title.",
        photos: [],
        listedDaysAgo: 30,
        sale: {
          soldDaysAgo: 8,
          salePriceUsd: 21400,
          vehicleCostUsd: 17800,
          reconCostUsd: 900,
          backEndGrossUsd: 1650,
          buyerName: "D. Alvarez",
        },
      },
      {
        slug: "kia-sportage-lx",
        make: "Kia",
        model: "Sportage LX",
        year: 2022,
        trim: null,
        mileage: 41800,
        priceUsd: 24900,
        condition: "Used",
        bodyStyle: "SUV",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "AWD",
        exteriorColor: "Snow White Pearl",
        interiorColor: "Black",
        description: "Compact SUV off the rental line, full maintenance record.",
        photos: [],
        listedDaysAgo: 41,
        sale: {
          soldDaysAgo: 19,
          salePriceUsd: 24900,
          vehicleCostUsd: 21000,
          reconCostUsd: 1250,
          backEndGrossUsd: 2100,
          buyerName: "T. Nguyen",
        },
      },
      {
        slug: "chevrolet-malibu-lt",
        make: "Chevrolet",
        model: "Malibu LT",
        year: 2022,
        trim: null,
        mileage: 47600,
        priceUsd: 19600,
        condition: "Used",
        bodyStyle: "Sedan",
        fuelType: "Gas",
        transmission: "Automatic",
        drivetrain: "FWD",
        exteriorColor: "Mosaic Black",
        interiorColor: "Jet Black",
        description: "High-mileage but honest: fleet maintained and priced to move.",
        photos: [],
        listedDaysAgo: 74,
        sale: {
          soldDaysAgo: 51,
          salePriceUsd: 19600,
          vehicleCostUsd: 16900,
          reconCostUsd: 700,
          backEndGrossUsd: 1200,
          buyerName: "S. Brennan",
        },
      },
    ],
  },
];

/**
 * Create the dealership and fill in its public profile.
 *
 * The organization row is written as the connecting role: the app role has no grant on the
 * auth tables. The `dealer_profiles` row is created by a trigger on that insert (migration
 * 0008), so this only fills in what a dealership would type in its dashboard.
 */
async function upsertDealership(client: PoolClient, dealership: SeedDealership): Promise<void> {
  await client.query(
    `insert into public."organization" (id, name, slug, "createdAt")
     values ($1, $2, $3, now())
     on conflict (id) do update set name = excluded.name`,
    [dealership.id, dealership.name, dealership.slug],
  );

  await client.query(
    `update public.dealer_profiles
        set display_name = $2, slug = $3, city = $4, state = $5, phone = $6, about = $7
      where tenant_id = $1`,
    [
      dealership.id,
      dealership.name,
      dealership.slug,
      dealership.city,
      dealership.state,
      dealership.phone,
      dealership.about,
    ],
  );
}

async function seedInventory(
  dealership: SeedDealership,
): Promise<{ photos: number; deals: number }> {
  return withTenant(dealership.id, async (client) => {
    // Rebuild this dealership's inventory from scratch. RLS scopes both deletes to this
    // tenant. Deals go first: the vehicle FK is `on delete restrict` precisely so a sale
    // cannot be erased as a side effect of deleting a car, which means the seed has to say
    // out loud that it is throwing the history away too.
    await client.query("delete from public.deals where tenant_id = $1", [dealership.id]);
    await client.query("delete from public.vehicles where tenant_id = $1", [dealership.id]);

    let photoCount = 0;
    let dealCount = 0;
    for (const v of dealership.vehicles) {
      const inserted = await client.query<{ id: string }>(
        `insert into public.vehicles (
           tenant_id, slug, make, model, year, trim, mileage, price_usd,
           condition, body_style, fuel_type, transmission, drivetrain,
           exterior_color, interior_color, description, status, created_at
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
           now() - ($18 || ' days')::interval
         )
         returning id`,
        [
          dealership.id,
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
          v.sale ? "sold" : "active",
          String(v.listedDaysAgo),
        ],
      );
      const vehicleId = inserted.rows[0].id;

      for (let i = 0; i < v.photos.length; i++) {
        const photo = v.photos[i];
        await client.query(
          `insert into public.vehicle_photos (vehicle_id, tenant_id, url, alt, position, is_primary)
           values ($1,$2,$3,$4,$5,$6)`,
          [vehicleId, dealership.id, `/cars/${photo.file}`, photo.alt, i, photo.primary === true],
        );
        photoCount++;
      }

      if (v.sale) {
        // Only the four figures a dealer actually types. Front-end and total gross are
        // generated columns, so the seed cannot invent numbers that do not add up.
        await client.query(
          `insert into public.deals (
             tenant_id, vehicle_id, sold_at, sale_price_usd, vehicle_cost_usd,
             recon_cost_usd, back_end_gross_usd, buyer_name
           ) values (
             $1, $2, (current_date - ($3 || ' days')::interval)::date, $4, $5, $6, $7, $8
           )`,
          [
            dealership.id,
            vehicleId,
            String(v.sale.soldDaysAgo),
            v.sale.salePriceUsd,
            v.sale.vehicleCostUsd,
            v.sale.reconCostUsd,
            v.sale.backEndGrossUsd,
            v.sale.buyerName,
          ],
        );
        dealCount++;
      }
    }

    return { photos: photoCount, deals: dealCount };
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

  const client = await pool.connect();
  try {
    for (const dealership of DEALERSHIPS) await upsertDealership(client, dealership);
  } finally {
    client.release();
  }

  let vehicles = 0;
  let photos = 0;
  let deals = 0;
  for (const dealership of DEALERSHIPS) {
    const count = await seedInventory(dealership);
    const live = dealership.vehicles.filter((v) => !v.sale).length;
    vehicles += dealership.vehicles.length;
    photos += count.photos;
    deals += count.deals;
    console.log(
      `${dealership.name} (${dealership.city}, ${dealership.state}): ` +
        `${live} live, ${count.deals} sold, ${count.photos} photos`,
    );
  }

  console.log(
    `\nseeded: ${DEALERSHIPS.length} dealerships, ${vehicles} vehicles ` +
      `(${vehicles - deals} live, ${deals} sold), ${photos} photos, ${deals} deals`,
  );
  console.log("live listings are status=active; sold units carry a recorded deal instead");

  await pool.end();
  console.log("\ndone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
