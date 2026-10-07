import { BadRequestException } from "@nestjs/common";
import { Prisma } from "../generated/prisma";

export type AdminQueryRequest = {
  query?: Record<string, string | undefined>;
};

export type AdminListQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortOrder: "asc" | "desc";
};

export type AdminListResponse<T, S extends Record<string, unknown> = Record<string, number>> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary?: S;
};

export function adminQueryValue(req: AdminQueryRequest, key: string) {
  return req.query?.[key]?.trim() || "";
}

const adminTripStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const adminTripExecutionPhases = ["WAITING_DRIVER", "DRIVER_PENDING_ACCEPTANCE", "DRIVER_ASSIGNED", "IN_PROGRESS"] as const;

export function adminTripStatusWhere(statusValue: string, executionPhaseValue: string): Prisma.TripWhereInput {
  const filters: Prisma.TripWhereInput[] = [];
  if (adminTripStatuses.includes(statusValue as (typeof adminTripStatuses)[number]))
    filters.push({ status: statusValue as (typeof adminTripStatuses)[number] });
  if (statusValue === "IN_PROGRESS") filters.push({ executionPhase: "IN_PROGRESS" });
  if (adminTripExecutionPhases.includes(executionPhaseValue as (typeof adminTripExecutionPhases)[number]))
    filters.push({ executionPhase: executionPhaseValue as (typeof adminTripExecutionPhases)[number] });
  return filters.length ? { AND: filters } : {};
}

export function parseAdminListQuery(req: AdminQueryRequest, defaultPageSize = 25): AdminListQuery {
  const page = Number.parseInt(adminQueryValue(req, "page"), 10);
  const pageSize = Number.parseInt(adminQueryValue(req, "pageSize"), 10);
  const sortOrder = adminQueryValue(req, "sortOrder").toLowerCase();
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize:
      Number.isSafeInteger(pageSize) && pageSize > 0
        ? Math.min(pageSize, 100)
        : defaultPageSize,
    search: adminQueryValue(req, "search") || adminQueryValue(req, "q"),
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  };
}

export function adminQueryBoolean(req: AdminQueryRequest, key: string) {
  const value = adminQueryValue(req, key).toLowerCase();
  if (!value) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new BadRequestException(`${key} must be true or false`);
}

export function adminQueryDate(req: AdminQueryRequest, key: string) {
  const value = adminQueryValue(req, key);
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`${key} must be a valid date`);
  return date;
}

export function adminListResponse<T, S extends Record<string, unknown>>(
  data: T[],
  total: number,
  query: AdminListQuery,
  summary?: S,
): AdminListResponse<T, S> {
  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    ...(summary ? { summary } : {}),
  };
}
