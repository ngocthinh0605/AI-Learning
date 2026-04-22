import React from "react";
import { AuthScreen } from "../src/screens/AuthScreen";
import { DashboardScreen } from "../src/screens/DashboardScreen";

describe("mobile screen contracts", () => {
  it("auth screen exports a renderable component", () => {
    expect(typeof AuthScreen).toBe("function");
  });

  it("dashboard screen exports a renderable component", () => {
    expect(typeof DashboardScreen).toBe("function");
  });
});
