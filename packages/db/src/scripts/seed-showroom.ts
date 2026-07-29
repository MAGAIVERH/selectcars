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

/**
 * A buyer's enquiry about one of the dealership's cars, so the pipeline opens with something
 * to work rather than an empty state nobody can judge.
 */
type SeedLead = {
  /** Slug of the car they asked about: leads always belong to a listing. */
  vehicleSlug: string;
  hoursAgo: number;
  status: "new" | "contacted" | "appointment" | "won" | "lost";
  /** Hours after arriving that the dealership first replied. Omitted while still `new`. */
  respondedAfterHours?: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  message: string;
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
  leads: SeedLead[];
};

const p = (file: string, alt: string): SeedPhoto => ({ file, alt, primary: true });

/**
 * A unit that was sold months ago: enough to draw a trend, and nothing more.
 *
 * These exist so the analytics screen has real history behind it. They carry no photos (a
 * sold car is invisible to buyers) and the specs are deliberately thin, because their whole
 * job is to be a dot on a line. Spelling each one out in full would triple the file for no
 * extra truth.
 */
function soldUnit(input: {
  slug: string;
  make: string;
  model: string;
  year: number;
  bodyStyle: SeedVehicle["bodyStyle"];
  mileage: number;
  listedDaysAgo: number;
  soldDaysAgo: number;
  salePriceUsd: number;
  vehicleCostUsd: number;
  reconCostUsd: number;
  backEndGrossUsd: number;
  buyerName: string;
}): SeedVehicle {
  return {
    slug: input.slug,
    make: input.make,
    model: input.model,
    year: input.year,
    trim: null,
    mileage: input.mileage,
    priceUsd: input.salePriceUsd,
    condition: "Used",
    bodyStyle: input.bodyStyle,
    fuelType: "Gas",
    transmission: "Automatic",
    drivetrain: "AWD",
    exteriorColor: "Black",
    interiorColor: "Black",
    description: "Sold unit, retained for the sales record.",
    photos: [],
    listedDaysAgo: input.listedDaysAgo,
    sale: {
      soldDaysAgo: input.soldDaysAgo,
      salePriceUsd: input.salePriceUsd,
      vehicleCostUsd: input.vehicleCostUsd,
      reconCostUsd: input.reconCostUsd,
      backEndGrossUsd: input.backEndGrossUsd,
      buyerName: input.buyerName,
    },
  };
}

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

      // Older history, so the trend line has months to cross.
      soldUnit({
        slug: "maserati-granturismo",
        make: "Maserati",
        model: "GranTurismo",
        year: 2020,
        bodyStyle: "Coupe",
        mileage: 18900,
        listedDaysAgo: 128,
        soldDaysAgo: 78,
        salePriceUsd: 96000,
        vehicleCostUsd: 82000,
        reconCostUsd: 4100,
        backEndGrossUsd: 3400,
        buyerName: "J. Almeida",
      }),
      soldUnit({
        slug: "porsche-macan-gts",
        make: "Porsche",
        model: "Macan GTS",
        year: 2022,
        bodyStyle: "SUV",
        mileage: 22400,
        listedDaysAgo: 160,
        soldDaysAgo: 112,
        salePriceUsd: 78500,
        vehicleCostUsd: 66000,
        reconCostUsd: 2800,
        backEndGrossUsd: 5100,
        buyerName: "K. Osei",
      }),
      soldUnit({
        slug: "range-rover-sport-hse",
        make: "Range Rover",
        model: "Sport HSE",
        year: 2021,
        bodyStyle: "SUV",
        mileage: 31200,
        listedDaysAgo: 196,
        soldDaysAgo: 149,
        salePriceUsd: 71000,
        vehicleCostUsd: 61500,
        reconCostUsd: 3900,
        backEndGrossUsd: 2200,
        buyerName: "L. Petrov",
      }),
    ],
    leads: [
      {
        vehicleSlug: "bentley-continental-gt",
        hoursAgo: 3,
        status: "new",
        buyerName: "Adrian Foss",
        buyerEmail: "adrian.foss@example.com",
        buyerPhone: "+1 (305) 555-0142",
        message:
          "Is the Mulliner spec documented, and would you consider a trade against a 2021 Aston DB11?",
      },
      {
        vehicleSlug: "mercedes-amg-c63-coupe",
        hoursAgo: 26,
        status: "contacted",
        respondedAfterHours: 2,
        buyerName: "Priya Raman",
        buyerEmail: "priya.raman@example.com",
        buyerPhone: null,
        message: "Who did the widebody work, and is there any paint correction history?",
      },
      {
        vehicleSlug: "bmw-i8",
        hoursAgo: 96,
        status: "appointment",
        respondedAfterHours: 5,
        buyerName: "Tom Van Der Berg",
        buyerEmail: "tom.vdb@example.com",
        buyerPhone: "+1 (786) 555-0119",
        message: "Battery health report available? I can come by Saturday morning.",
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

      // A volume seller's history: more units, thinner gross on each.
      soldUnit({
        slug: "toyota-camry-le",
        make: "Toyota",
        model: "Camry LE",
        year: 2022,
        bodyStyle: "Sedan",
        mileage: 52300,
        listedDaysAgo: 92,
        soldDaysAgo: 66,
        salePriceUsd: 20800,
        vehicleCostUsd: 17600,
        reconCostUsd: 850,
        backEndGrossUsd: 1400,
        buyerName: "A. Whitmore",
      }),
      soldUnit({
        slug: "ford-escape-se",
        make: "Ford",
        model: "Escape SE",
        year: 2021,
        bodyStyle: "SUV",
        mileage: 61700,
        listedDaysAgo: 124,
        soldDaysAgo: 95,
        salePriceUsd: 18900,
        vehicleCostUsd: 15800,
        reconCostUsd: 1100,
        backEndGrossUsd: 900,
        buyerName: "R. Duarte",
      }),
      soldUnit({
        slug: "nissan-rogue-sv",
        make: "Nissan",
        model: "Rogue SV",
        year: 2022,
        bodyStyle: "SUV",
        mileage: 44900,
        listedDaysAgo: 158,
        soldDaysAgo: 133,
        salePriceUsd: 22600,
        vehicleCostUsd: 19200,
        reconCostUsd: 950,
        backEndGrossUsd: 1750,
        buyerName: "P. Sandoval",
      }),
      soldUnit({
        slug: "chevrolet-equinox-lt",
        make: "Chevrolet",
        model: "Equinox LT",
        year: 2021,
        bodyStyle: "SUV",
        mileage: 58400,
        listedDaysAgo: 188,
        soldDaysAgo: 160,
        salePriceUsd: 19400,
        vehicleCostUsd: 16600,
        reconCostUsd: 780,
        backEndGrossUsd: 1050,
        buyerName: "M. Ferreira",
      }),
    ],
    leads: [
      {
        vehicleSlug: "hyundai-kona",
        hoursAgo: 7,
        status: "new",
        buyerName: "Marisol Vega",
        buyerEmail: "marisol.vega@example.com",
        buyerPhone: "+1 (813) 555-0177",
        message: "Was this a rental? Happy with that, I just want the service record first.",
      },
      {
        vehicleSlug: "hyundai-elantra",
        hoursAgo: 52,
        status: "won",
        respondedAfterHours: 1,
        buyerName: "Devon Clarke",
        buyerEmail: "devon.clarke@example.com",
        buyerPhone: null,
        message: "Can you hold it until Friday? I have financing approved already.",
      },
      {
        vehicleSlug: "genesis-g90",
        hoursAgo: 120,
        status: "lost",
        respondedAfterHours: 19,
        buyerName: "Helena Braga",
        buyerEmail: "helena.braga@example.com",
        buyerPhone: null,
        message: "Still available? Comparing against a G80 at another dealer.",
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
): Promise<{ photos: number; deals: number; leads: number }> {
  return withTenant(dealership.id, async (client) => {
    // Rebuild this dealership's inventory from scratch. RLS scopes every delete to this
    // tenant. Deals and leads go first: the vehicle FK on `deals` is `on delete restrict`
    // precisely so a sale cannot be erased as a side effect of deleting a car, which means
    // the seed has to say out loud that it is throwing the history away too.
    await client.query("delete from public.leads where tenant_id = $1", [dealership.id]);
    await client.query("delete from public.deals where tenant_id = $1", [dealership.id]);
    await client.query("delete from public.vehicles where tenant_id = $1", [dealership.id]);

    const vehicleIdBySlug = new Map<string, string>();
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
      vehicleIdBySlug.set(v.slug, vehicleId);

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

    // Leads last: they point at a listing, so the cars have to exist first.
    let leadCount = 0;
    for (const lead of dealership.leads) {
      const vehicleId = vehicleIdBySlug.get(lead.vehicleSlug);
      if (!vehicleId) throw new Error(`Lead references an unknown listing: ${lead.vehicleSlug}`);

      await client.query(
        `insert into public.leads (
           tenant_id, vehicle_id, status, buyer_name, buyer_email, buyer_phone, message,
           created_at, first_response_at
         ) values (
           $1, $2, $3, $4, $5, $6, $7,
           now() - ($8 || ' hours')::interval,
           case when $9::text is null then null
                else now() - (($8::numeric - $9::numeric) || ' hours')::interval end
         )`,
        [
          dealership.id,
          vehicleId,
          lead.status,
          lead.buyerName,
          lead.buyerEmail,
          lead.buyerPhone,
          lead.message,
          String(lead.hoursAgo),
          lead.respondedAfterHours === undefined ? null : String(lead.respondedAfterHours),
        ],
      );
      leadCount++;
    }

    return { photos: photoCount, deals: dealCount, leads: leadCount };
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
  let leads = 0;
  for (const dealership of DEALERSHIPS) {
    const count = await seedInventory(dealership);
    const live = dealership.vehicles.filter((v) => !v.sale).length;
    vehicles += dealership.vehicles.length;
    photos += count.photos;
    deals += count.deals;
    leads += count.leads;
    console.log(
      `${dealership.name} (${dealership.city}, ${dealership.state}): ` +
        `${live} live, ${count.deals} sold, ${count.photos} photos, ${count.leads} leads`,
    );
  }

  console.log(
    `\nseeded: ${DEALERSHIPS.length} dealerships, ${vehicles} vehicles ` +
      `(${vehicles - deals} live, ${deals} sold), ${photos} photos, ${deals} deals, ${leads} leads`,
  );
  console.log("live listings are status=active; sold units carry a recorded deal instead");

  await pool.end();
  console.log("\ndone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
