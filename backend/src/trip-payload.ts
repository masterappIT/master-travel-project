import { Prisma } from "../generated/prisma";

export const tripDriverSelect = Prisma.validator<Prisma.DriverSelect>()({
  id: true,
  name: true,
  phone: true,
  settlementMethod: true,
});

export type TripDriverSummary = Prisma.DriverGetPayload<{
  select: typeof tripDriverSelect;
}>;

export function tripDriverResponse(driver: TripDriverSummary) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    settlementMethod: driver.settlementMethod,
  };
}

export const adminTripDetailInclude = Prisma.validator<Prisma.TripInclude>()({
  user: true,
  quote: {
    include: {
      pricing: { include: { tiers: { orderBy: { order: "asc" } } } },
      vehicle: true,
      promotionUsages: { include: { promotion: true } },
      lines: { orderBy: { order: "asc" } },
    },
  },
  payment: true,
  settlement: true,
  driver: { select: tripDriverSelect },
});
