import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveAthleteProfilePhoto } from "@/lib/athlete-profile-photo";

const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: () => ({ data: { publicUrl: "https://example.test/profile.jpg" } }) }) },
  from: () => ({ update: mocks.update }),
} }));
describe("athlete profile photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = { eq: mocks.eq, select: mocks.select, single: mocks.single };
    mocks.update.mockReturnValue(chain); mocks.eq.mockReturnValue(chain); mocks.select.mockReturnValue(chain);
    mocks.upload.mockResolvedValue({ error: null });
    mocks.single.mockResolvedValue({ data: { avatar_url: "https://example.test/profile.jpg" }, error: null });
  });
  it("saves the real profile image scoped to the account and tenant", async () => {
    const url = await saveAthleteProfilePhoto("athlete-id", "tenant-id", new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    expect(mocks.upload.mock.calls[0][0]).toMatch(/^athlete-id\/profile-.*\.jpg$/);
    expect(mocks.eq).toHaveBeenCalledWith("id", "athlete-id");
    expect(mocks.eq).toHaveBeenCalledWith("tenant_id", "tenant-id");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: url }));
  });
  it("does not change the profile when upload fails", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("failed upload") });
    await expect(saveAthleteProfilePhoto("athlete-id", "tenant-id", new File(["image"], "photo.jpg", { type: "image/jpeg" }))).rejects.toThrow("failed upload");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("removes the new file when saving the profile fails", async () => {
    mocks.single.mockResolvedValue({ error: new Error("failed save") });
    await expect(saveAthleteProfilePhoto("athlete-id", "tenant-id", new File(["image"], "photo.jpg", { type: "image/jpeg" }))).rejects.toThrow("failed save");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });
});