import { 
  processRescueSubmission, 
  getAllRescueIncidents, 
  updateRescueIncidentStatus, 
  queryCorroboratedCluster, 
  _resetRescueStore 
} from "../lib/rescueStore";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING ANONYMOUS RESCUE DEDUPLICATION TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let total = 8;

  // ---------------------------------------------------------
  // TEST 1: First Request
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("▶ TEST 1: First request from Device A...");
  const t1 = await processRescueSubmission({
    device_id: "device-dad-uuid-1111",
    type: "flood",
    message: "Help",
    latitude: 19.076,
    longitude: 72.8777,
    ip_address: "103.25.10.20",
  });

  if (t1.action === "CREATED" && getAllRescueIncidents().length === 1 && t1.incident.report_count === 1) {
    console.log("  ✅ TEST 1 PASSED: 1 incident created, action = CREATED, report_count = 1");
    passed++;
  } else {
    console.error("  ❌ TEST 1 FAILED:", t1);
  }

  // ---------------------------------------------------------
  // TEST 2: Repeated Request from Same Device
  // ---------------------------------------------------------
  console.log("\n▶ TEST 2: Repeated request from Device A while incident is ACTIVE...");
  const t2 = await processRescueSubmission({
    device_id: "device-dad-uuid-1111",
    type: "flood",
    message: "Help, we are trapped",
    latitude: 19.0762,
    longitude: 72.8779,
    ip_address: "103.25.10.20",
  });

  const allIncidentsT2 = getAllRescueIncidents();
  if (
    t2.action === "UPDATED" &&
    allIncidentsT2.length === 1 &&
    t2.incident_id === t1.incident_id &&
    t2.incident.report_count === 2 &&
    t2.incident.reports.length === 2
  ) {
    console.log("  ✅ TEST 2 PASSED: 0 new incidents created, action = UPDATED, reports timeline = 2");
    passed++;
  } else {
    console.error("  ❌ TEST 2 FAILED:", t2);
  }

  // ---------------------------------------------------------
  // TEST 3: Five Family Members on Same Wi-Fi (Same Public IP)
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("\n▶ TEST 3: Five family members on same Wi-Fi (IP 103.25.10.20, 5 unique device_ids)...");
  const devices = ["dev-dad", "dev-mom", "dev-son", "dev-daughter", "dev-neighbor"];
  for (const dev of devices) {
    await processRescueSubmission({
      device_id: dev,
      type: "flood",
      message: `Emergency from ${dev}`,
      latitude: 19.076,
      longitude: 72.877,
      ip_address: "103.25.10.20", // Same Public IP!
    });
  }

  const allIncidentsT3 = getAllRescueIncidents();
  const uniqueDevs = new Set(allIncidentsT3.map((i) => i.device_id));

  if (allIncidentsT3.length === 5 && uniqueDevs.size === 5) {
    console.log("  ✅ TEST 3 PASSED: Created 5 separate incidents for 5 unique devices on same IP (Not merged by IP!)");
    passed++;
  } else {
    console.error("  ❌ TEST 3 FAILED: Expected 5 incidents, found", allIncidentsT3.length);
  }

  // ---------------------------------------------------------
  // TEST 4: Same Device After Multiple Updates
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("\n▶ TEST 4: Same device sending multiple updates (Help -> Trapped -> Medical)...");
  await processRescueSubmission({ device_id: "dev-single", type: "flood", message: "Help", latitude: 19.076, longitude: 72.877, ip_address: "10.0.0.1" });
  await processRescueSubmission({ device_id: "dev-single", type: "flood", message: "Smoke entering building", latitude: 19.076, longitude: 72.877, ip_address: "10.0.0.1" });
  const t4 = await processRescueSubmission({ device_id: "dev-single", type: "medical", message: "One person injured", latitude: 19.076, longitude: 72.877, ip_address: "10.0.0.1" });

  if (getAllRescueIncidents().length === 1 && t4.incident.report_count === 3 && t4.incident.reports.length === 3) {
    console.log("  ✅ TEST 4 PASSED: 1 active incident containing 3 events timeline");
    passed++;
  } else {
    console.error("  ❌ TEST 4 FAILED:", t4);
  }

  // ---------------------------------------------------------
  // TEST 5: Incident Resolved -> New Request Creates NEW Incident
  // ---------------------------------------------------------
  console.log("\n▶ TEST 5: Device submits request AFTER previous incident was RESOLVED...");
  updateRescueIncidentStatus(t4.incident_id, "resolved");

  const t5 = await processRescueSubmission({
    device_id: "dev-single",
    type: "fire",
    message: "New emergency next day",
    latitude: 19.080,
    longitude: 72.880,
    ip_address: "10.0.0.1",
  });

  const allIncidentsT5 = getAllRescueIncidents();
  if (t5.action === "CREATED" && t5.incident_id !== t4.incident_id && allIncidentsT5.length === 2) {
    console.log("  ✅ TEST 5 PASSED: Old incident resolved, new request created NEW active incident!");
    passed++;
  } else {
    console.error("  ❌ TEST 5 FAILED:", t5);
  }

  // ---------------------------------------------------------
  // TEST 6: Simultaneous Concurrent Requests from Same Device
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("\n▶ TEST 6: Simultaneous concurrent requests from same device_id...");
  const p1 = processRescueSubmission({ device_id: "dev-concurrent", type: "flood", message: "Req 1", latitude: 19.076, longitude: 72.877, ip_address: "127.0.0.1" });
  const p2 = processRescueSubmission({ device_id: "dev-concurrent", type: "flood", message: "Req 2", latitude: 19.076, longitude: 72.877, ip_address: "127.0.0.1" });

  await Promise.all([p1, p2]);
  const allIncidentsT6 = getAllRescueIncidents();

  if (allIncidentsT6.length === 1 && allIncidentsT6[0].report_count === 2) {
    console.log("  ✅ TEST 6 PASSED: Concurrency lock prevented duplicate active incidents (1 ACTIVE incident, 2 reports)");
    passed++;
  } else {
    console.error("  ❌ TEST 6 FAILED: Found incidents count:", allIncidentsT6.length);
  }

  // ---------------------------------------------------------
  // TEST 7: Different Browsers / Clients
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("\n▶ TEST 7: Two independent anonymous client IDs behind same IP...");
  await processRescueSubmission({ device_id: "browser-chrome-1", type: "flood", message: "Chrome user", latitude: 19.076, longitude: 72.877, ip_address: "203.0.113.5" });
  await processRescueSubmission({ device_id: "browser-firefox-2", type: "flood", message: "Firefox user", latitude: 19.076, longitude: 72.877, ip_address: "203.0.113.5" });

  if (getAllRescueIncidents().length === 2) {
    console.log("  ✅ TEST 7 PASSED: 2 independent incidents created for 2 different client IDs");
    passed++;
  } else {
    console.error("  ❌ TEST 7 FAILED:", getAllRescueIncidents().length);
  }

  // ---------------------------------------------------------
  // TEST 8: Duplicate HTTP Retry (Idempotency Key)
  // ---------------------------------------------------------
  _resetRescueStore();
  console.log("\n▶ TEST 8: Duplicate HTTP retry with same idempotency_key...");
  const key = "idemp-key-abc-123";
  const r1 = await processRescueSubmission({ device_id: "dev-idemp", type: "flood", message: "Retry test", latitude: 19.076, longitude: 72.877, ip_address: "127.0.0.1", idempotency_key: key });
  const r2 = await processRescueSubmission({ device_id: "dev-idemp", type: "flood", message: "Retry test", latitude: 19.076, longitude: 72.877, ip_address: "127.0.0.1", idempotency_key: key });

  if (r1.action === "CREATED" && r2.action === "IDEMPOTENT_DUPLICATE" && getAllRescueIncidents()[0].reports.length === 1) {
    console.log("  ✅ TEST 8 PASSED: Duplicate HTTP retry returned cached result without adding duplicate report");
    passed++;
  } else {
    console.error("  ❌ TEST 8 FAILED:", r2);
  }

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------
  console.log("\n=================================================");
  console.log(`🎉 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("=================================================");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
