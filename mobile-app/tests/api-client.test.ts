import { API_BASE_URL } from "../src/api/client";

describe("mobile api client", () => {
  it("uses the backend v1 base url", () => {
    expect(API_BASE_URL).toContain("/api/v1");
  });
});
