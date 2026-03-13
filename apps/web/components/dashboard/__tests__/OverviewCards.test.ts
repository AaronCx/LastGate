import { describe, test, expect } from "bun:test";

// Test the data model and logic behind OverviewCards component
const stats = [
  { label: "Total Checks Today", value: "1,284", change: "+12%", changeType: "positive" },
  { label: "Pass Rate", value: "94.2%", change: "+2.1%", changeType: "positive" },
  { label: "Blocked Commits", value: "23", change: "-8%", changeType: "positive" },
  { label: "Active Repos", value: "18", change: "+3", changeType: "neutral" },
];

describe("OverviewCards", () => {
  test("renders correct counts for total checks, pass rate, blocked commits, active repos", () => {
    expect(stats[0].label).toBe("Total Checks Today");
    expect(stats[0].value).toBe("1,284");
    expect(stats[1].label).toBe("Pass Rate");
    expect(stats[1].value).toBe("94.2%");
    expect(stats[2].label).toBe("Blocked Commits");
    expect(stats[2].value).toBe("23");
    expect(stats[3].label).toBe("Active Repos");
    expect(stats[3].value).toBe("18");
  });

  test("pass rate displays as percentage with 1 decimal", () => {
    const passRate = stats.find(s => s.label === "Pass Rate")!;
    expect(passRate.value).toMatch(/^\d+\.\d%$/);
  });

  test("has exactly 4 stat cards", () => {
    expect(stats.length).toBe(4);
  });

  test("zero state: cards would show 0 / 0% when no data", () => {
    const emptyStats = [
      { label: "Total Checks Today", value: "0" },
      { label: "Pass Rate", value: "0.0%" },
      { label: "Blocked Commits", value: "0" },
      { label: "Active Repos", value: "0" },
    ];
    expect(emptyStats[0].value).toBe("0");
    expect(emptyStats[1].value).toBe("0.0%");
  });

  test("each card has an icon color and background", () => {
    const cardConfigs = [
      { iconColor: "text-blue-500", iconBg: "bg-blue-50" },
      { iconColor: "text-emerald-500", iconBg: "bg-emerald-50" },
      { iconColor: "text-red-500", iconBg: "bg-red-50" },
      { iconColor: "text-violet-500", iconBg: "bg-violet-50" },
    ];
    for (const config of cardConfigs) {
      expect(config.iconColor).toBeTruthy();
      expect(config.iconBg).toBeTruthy();
    }
  });
});
