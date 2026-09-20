/**
 * Master Test Runner for Dynamic Multimodal Re-Routing Module
 * Executes:
 * - 14 Backend Service & Algorithm Tests
 * - 6 Core Re-Routing Scenarios (Train -> Flight, Train -> Bus, Multi-Service, No Route, Cheapest vs Fastest, Preference Change)
 * - 5 Frontend Component & State Tests (Disruption Alert, Route Cards, Recommendation, Loading, Error)
 */

import { runBackendTests, TestResult } from "./unit/backend-tests";
import { runScenarioTests } from "./unit/scenarios-1-to-6";
import { runFrontendTests } from "./unit/frontend-tests";
import { runPrdIntegrationTests } from "./unit/prd-integration-tests";
import { runTheTenTestCases } from "./unit/ten-test-cases";

export interface MasterTestSummary {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms: number;
  results: {
    suite: string;
    name: string;
    passed: boolean;
    durationMs: number;
    details?: string;
    error?: string;
  }[];
  suites: {
    backend_services: TestResult[];
    scenarios_1_to_6: TestResult[];
    frontend_components: TestResult[];
    prd_integration: any[];
    ten_user_cases: any[];
  };
}

export function executeAllTests(): MasterTestSummary {
  const start = performance.now();

  const backendResults = runBackendTests();
  const scenarioResults = runScenarioTests();
  const frontendResults = runFrontendTests();
  const prdResults = runPrdIntegrationTests();
  const tenCasesResults = runTheTenTestCases();

  const all = [...backendResults, ...scenarioResults, ...frontendResults, ...prdResults, ...tenCasesResults];
  const passed = all.filter((r) => r.passed).length;
  const failed = all.filter((r) => !r.passed).length;
  const totalDuration = parseFloat((performance.now() - start).toFixed(2));

  const flattenedResults = [
    ...backendResults.map((r) => ({ suite: r.suite, name: r.name, passed: r.passed, durationMs: r.durationMs, error: r.error })),
    ...scenarioResults.map((r) => ({ suite: r.suite, name: r.name, passed: r.passed, durationMs: r.durationMs, error: r.error })),
    ...frontendResults.map((r) => ({ suite: r.suite, name: r.name, passed: r.passed, durationMs: r.durationMs, error: r.error })),
    ...prdResults.map((r) => ({ suite: `PRD (${r.id})`, name: r.name, passed: r.passed, durationMs: r.duration_ms, error: r.message })),
    ...tenCasesResults.map((r) => ({ suite: `10 User Cases (Case ${r.caseNumber})`, name: r.title, passed: r.passed, durationMs: r.durationMs, details: r.details, error: r.error })),
  ];

  return {
    timestamp: new Date().toISOString(),
    total_tests: all.length,
    passed_tests: passed,
    failed_tests: failed,
    duration_ms: totalDuration,
    results: flattenedResults,
    suites: {
      backend_services: backendResults,
      scenarios_1_to_6: scenarioResults,
      frontend_components: frontendResults,
      prd_integration: prdResults,
      ten_user_cases: tenCasesResults,
    },
  };
}

// If run directly from CLI via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("\n================================================================================");
  console.log("  DYNAMIC MULTIMODAL RE-ROUTING MODULE - COMPLETE TEST SUITE VERIFICATION");
  console.log("================================================================================\n");

  const summary = executeAllTests();

  console.log(`[BACKEND SUITE 1-14] Tested ${summary.suites.backend_services.length} services & algorithms`);
  for (const t of summary.suites.backend_services) {
    const symbol = t.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${symbol} [${t.suite}] ${t.name} (${t.durationMs}ms)`);
    if (!t.passed) console.error(`    Error: ${t.error}`);
  }

  console.log(`\n[MANDATORY SCENARIOS 1-6] Tested ${summary.suites.scenarios_1_to_6.length} end-to-end scenarios`);
  for (const t of summary.suites.scenarios_1_to_6) {
    const symbol = t.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${symbol} [${t.suite}] ${t.name} (${t.durationMs}ms)`);
    if (!t.passed) console.error(`    Error: ${t.error}`);
  }

  console.log(`\n[FRONTEND COMPONENTS] Tested ${summary.suites.frontend_components.length} UI components & states`);
  for (const t of summary.suites.frontend_components) {
    const symbol = t.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${symbol} [${t.suite}] ${t.name} (${t.durationMs}ms)`);
    if (!t.passed) console.error(`    Error: ${t.error}`);
  }

  console.log(`\n[PRD INTEGRATION SUITE] Tested ${summary.suites.prd_integration.length} PRD Parts A/B/C/D endpoints`);
  for (const t of summary.suites.prd_integration) {
    const symbol = t.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${symbol} [${t.id}] ${t.name} (${t.duration_ms}ms)`);
    if (!t.passed) console.error(`    Error: ${t.message}`);
  }

  console.log(`\n[10 USER SPECIFIED TEST CASES] Tested ${summary.suites.ten_user_cases.length} autonomous concierge test cases`);
  for (const t of summary.suites.ten_user_cases) {
    const symbol = t.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${symbol} [Case ${t.caseNumber}] ${t.title} (${t.durationMs}ms)`);
    if (!t.passed) console.error(`    Error: ${t.error}`);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Total: ${summary.total_tests} | Passed: ${summary.passed_tests} | Failed: ${summary.failed_tests} | Duration: ${summary.duration_ms}ms`);
  console.log("--------------------------------------------------------------------------------\n");

  if (summary.failed_tests > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  }
}
