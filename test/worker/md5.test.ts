import { describe, expect, it } from "vitest";
import { md5Hex } from "../../worker/md5";

describe("md5Hex", () => {
  it("returns the standard MD5 digest for UTF-8 text", async () => {
    await expect(md5Hex("")).resolves.toBe("d41d8cd98f00b204e9800998ecf8427e");
    await expect(md5Hex("The quick brown fox jumps over the lazy dog"))
      .resolves.toBe("9e107d9d372bb6826bd81d3542a419d6");
  });
});
