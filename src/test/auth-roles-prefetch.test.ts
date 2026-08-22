import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeAuthRolesPrefetch,
  stashAuthRolesPrefetch,
  type PrefetchedRole,
} from "@/lib/auth-roles-prefetch";

const KEY = "auth_roles_prefetch_v1";

describe("auth roles prefetch", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("consome uma lista válida apenas uma vez", () => {
    const roles: PrefetchedRole[] = [
      { role: "admin", tenant_id: null },
      { role: "coach", tenant_id: "tenant-1" },
    ];

    stashAuthRolesPrefetch(roles);

    expect(consumeAuthRolesPrefetch()).toEqual(roles);
    expect(consumeAuthRolesPrefetch()).toBeNull();
  });

  it("limpa o prefetch quando o login não possui lista completa autoritativa", () => {
    sessionStorage.setItem(KEY, JSON.stringify([{ role: "coach", tenant_id: "tenant-1" }]));

    stashAuthRolesPrefetch([]);

    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(consumeAuthRolesPrefetch()).toBeNull();
  });

  it("ignora conteúdo inválido em vez de quebrar a autenticação", () => {
    sessionStorage.setItem(KEY, "not-json");

    expect(consumeAuthRolesPrefetch()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
