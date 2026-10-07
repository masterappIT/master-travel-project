import assert from "node:assert/strict";
import test from "node:test";
import {
  adminListResponse,
  adminQueryBoolean,
  adminQueryDate,
  adminQueryValue,
  adminTripStatusWhere,
  parseAdminListQuery,
} from "./admin-query";

const request = (query: Record<string, string | undefined>) => ({ query });

test("parses bounded admin list queries with legacy search alias", () => {
  assert.deepEqual(parseAdminListQuery(request({ page: "3", pageSize: "250", q: "  driver ", sortOrder: "ASC" })), {
    page: 3,
    pageSize: 100,
    search: "driver",
    sortOrder: "asc",
  });
  assert.deepEqual(parseAdminListQuery(request({ page: "-1", pageSize: "0" }), 20), {
    page: 1,
    pageSize: 20,
    search: "",
    sortOrder: "desc",
  });
});

test("parses admin boolean and date filters and rejects invalid values", () => {
  assert.equal(adminQueryValue(request({ value: "  text " }), "value"), "text");
  assert.equal(adminQueryBoolean(request({ enabled: "1" }), "enabled"), true);
  assert.equal(adminQueryBoolean(request({ enabled: "false" }), "enabled"), false);
  assert.equal(adminQueryBoolean(request({ enabled: "" }), "enabled"), undefined);
  assert.equal(adminQueryDate(request({ from: "2026-01-01T00:00:00.000Z" }), "from")?.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.throws(() => adminQueryBoolean(request({ enabled: "yes" }), "enabled"), /must be true or false/);
  assert.throws(() => adminQueryDate(request({ from: "invalid" }), "from"), /must be a valid date/);
});

test("builds trip status filters and paged response metadata", () => {
  assert.deepEqual(adminTripStatusWhere("IN_PROGRESS", ""), { AND: [{ executionPhase: "IN_PROGRESS" }] });
  assert.deepEqual(adminTripStatusWhere("CONFIRMED", "DRIVER_ASSIGNED"), {
    AND: [{ status: "CONFIRMED" }, { executionPhase: "DRIVER_ASSIGNED" }],
  });
  assert.deepEqual(adminTripStatusWhere("unknown", "unknown"), {});
  assert.deepEqual(adminListResponse([{ id: "trip" }], 21, { page: 2, pageSize: 10, search: "", sortOrder: "desc" }, { pending: 2 }), {
    data: [{ id: "trip" }],
    total: 21,
    page: 2,
    pageSize: 10,
    pageCount: 3,
    summary: { pending: 2 },
  });
});
