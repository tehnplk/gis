import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Admin/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright/index.js");
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(".playwright-cli/e2e-screenshots");

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  console.log("==================================================");
  console.log(" Starting GIS Accident Map E2E Test Suite");
  console.log(" Target: " + BASE_URL);
  console.log("==================================================\n");

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--window-size=1400,900"],
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  async function testStep(name, fn) {
    process.stdout.write("⏳ [TEST] " + name + " ... ");
    try {
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL: " + err.message);
      failed++;
    }
  }

  try {
    // 1. Navigation and Initial Map Load
    await testStep("1. Home route (/) redirects to /accident", async () => {
      await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
      const url = page.url();
      if (!url.includes("/accident")) {
        throw new Error("Expected redirect to /accident, got " + url);
      }
    });

    await testStep("2. Map Page Title & Header verification", async () => {
      const title = await page.title();
      if (!title.includes("แผนที่จุดเกิดอุบัติเหตุทางถนน")) {
        throw new Error("Unexpected page title: " + title);
      }

      const heading = await page.locator("h1").textContent();
      if (!heading?.includes("แผนที่จุดเกิดอุบัติเหตุทางถนน")) {
        throw new Error("Unexpected h1 content: " + heading);
      }

      const subtitle = await page.getByText("สำนักงานสาธารณสุขจังหวัดพิษณุโลก").isVisible();
      if (!subtitle) {
        throw new Error("Subtitle not visible");
      }

      await page.waitForSelector(".leaflet-container", { timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_map_loaded.png") });
    });

    await testStep("3. Initial Points Counter verification", async () => {
      const counterEl = page.locator("text=/\\d+\\s*\\/\\s*\\d+\\s*จุด/");
      const counterText = await counterEl.textContent();
      if (!counterText) {
        throw new Error("Points counter not found");
      }
      console.log("(Counter: " + counterText.trim() + ")");
    });

    // 2. Map Filtering & Controls
    await testStep("4. District selector filtering (เมืองพิษณุโลก)", async () => {
      const districtSelect = page.locator("select").first();
      await districtSelect.selectOption({ label: "เมืองพิษณุโลก" });
      await page.waitForURL(/district=/, { timeout: 5000 });
      await page.waitForTimeout(600);

      const counterAfter = await page.locator("text=/\\d+\\s*\\/\\s*\\d+\\s*จุด/").textContent();
      console.log("(Filtered count: " + counterAfter?.trim() + ")");
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_district_filter.png") });

      // Reset back to ทุกอำเภอ
      await districtSelect.selectOption({ label: "ทุกอำเภอ" });
      await page.waitForURL((url) => !url.searchParams.has("district"), { timeout: 5000 });
      await page.waitForTimeout(600);
    });

    await testStep("5. Triage Level Checkbox Filtering", async () => {
      const labels = ["ดำ", "แดง", "ส้ม"];
      for (const lbl of labels) {
        const cb = page.locator("label:has-text('" + lbl + "') input[type=checkbox]").first();
        if (await cb.isVisible()) {
          await cb.uncheck();
        }
      }
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_triage_filter.png") });

      // Re-check all
      for (const lbl of labels) {
        const cb = page.locator("label:has-text('" + lbl + "') input[type=checkbox]").first();
        if (await cb.isVisible()) {
          await cb.check();
        }
      }
      await page.waitForTimeout(400);
    });

    await testStep("6. Drunk Driving filter checkbox", async () => {
      const drunkCb = page.locator("label:has-text('เฉพาะที่ดื่มสุรา') input[type=checkbox]").first();
      if (await drunkCb.isVisible()) {
        await drunkCb.check();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_drunk_filter.png") });
        await drunkCb.uncheck();
        await page.waitForTimeout(400);
      }
    });

    await testStep("7. Heatmap layer toggle", async () => {
      const heatmapCb = page.locator("label:has-text('ความชุก (heatmap)') input[type=checkbox]").first();
      if (await heatmapCb.isVisible()) {
        await heatmapCb.check();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_heatmap_layer.png") });
        await heatmapCb.uncheck();
        await page.waitForTimeout(400);
      }
    });

    await testStep("8. Resource layers toggle (จุดเสี่ยง & จุดรถกู้ภัย)", async () => {
      const riskCb = page.locator("label:has-text('จุดเสี่ยง') input[type=checkbox]").first();
      const rescueCb = page.locator("label:has-text('จุดรถกู้ภัย') input[type=checkbox]").first();

      if (await riskCb.isVisible()) await riskCb.check();
      if (await rescueCb.isVisible()) await rescueCb.check();
      await page.waitForTimeout(600);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_resources_layers.png") });

      if (await riskCb.isVisible()) await riskCb.uncheck();
      if (await rescueCb.isVisible()) await rescueCb.uncheck();
      await page.waitForTimeout(400);
    });

    await testStep("9. Basemap Switcher (Satellite, Dark, Topo, Roadmap)", async () => {
      const basemaps = ["ดาวเทียม", "โหมดมืด", "ภูมิประเทศ", "แผนที่ถนน"];
      for (const bm of basemaps) {
        const btn = page.locator("button:has-text('" + bm + "')").first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(500);
        }
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_basemap_switch.png") });
    });

    await testStep("10. Control Panel Collapse & Expand", async () => {
      const collapseBtn = page.locator("button:has-text('ซ่อนแผงควบคุม')").first();
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(400);
        const expandBtn = page.locator("button:has-text('ชั้นข้อมูล ☰')").first();
        if (!await expandBtn.isVisible()) {
          throw new Error("Expand button ('ชั้นข้อมูล ☰') not found after collapse");
        }
        await expandBtn.click();
        await page.waitForTimeout(400);
      }
    });

    // 3. Rescue Bases Management CRUD (/accident/rescue)
    await testStep("11. Navigate to Rescue Base Management page", async () => {
      await page.goto(BASE_URL + "/accident/rescue", { waitUntil: "networkidle" });
      const title = await page.locator("h2").textContent();
      if (!title?.includes("จัดการจุดรถกู้ชีพ")) {
        throw new Error("Unexpected management page title: " + title);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_rescue_management_list.png") });
    });

    const testRescueName = "E2E หน่วยทดสอบ " + Date.now();
    const testRescueEdited = testRescueName + " (แก้ไข)";

    await testStep("12. Create new Rescue Base (CRUD Create)", async () => {
      const addBtn = page.locator("button:has-text('เพิ่มจุดรถกู้ชีพ')").first();
      await addBtn.click();
      await page.waitForSelector("#rescue-name", { timeout: 3000 });

      await page.fill("#rescue-name", testRescueName);
      await page.fill("#rescue-level", "ALS");
      await page.fill("#rescue-vehicle-level", "รถพยาบาลฉุกเฉินระดับสูง");
      await page.fill("#rescue-lat", "16.821100");
      await page.fill("#rescue-lng", "100.265900");

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_rescue_create_modal.png") });

      const submitBtn = page.locator("button[type=submit]:has-text('เพิ่มจุดรถกู้ชีพ')").last();
      await submitBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const createdRow = page.locator("tr:has-text('" + testRescueName + "')");
      if (!await createdRow.isVisible()) {
        throw new Error("Newly created rescue base not found in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_rescue_created_success.png") });
    });

    await testStep("13. Edit Rescue Base (CRUD Update)", async () => {
      const targetRow = page.locator("tr:has-text('" + testRescueName + "')");
      const editBtn = targetRow.locator("button:has-text('แก้ไข')").first();
      await editBtn.click();

      await page.waitForSelector("#rescue-name", { timeout: 3000 });
      await page.fill("#rescue-name", testRescueEdited);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11_rescue_edit_modal.png") });

      const saveBtn = page.locator("button[type=submit]:has-text('บันทึกการแก้ไข')").first();
      await saveBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const editedRow = page.locator("tr:has-text('" + testRescueEdited + "')");
      if (!await editedRow.isVisible()) {
        throw new Error("Edited rescue base name not found in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "12_rescue_edited_success.png") });
    });

    await testStep("14. Delete Rescue Base (CRUD Delete)", async () => {
      const targetRow = page.locator("tr:has-text('" + testRescueEdited + "')");
      const deleteBtn = targetRow.locator("button:has-text('ลบ')").first();
      await deleteBtn.click();

      await page.waitForSelector("button:has-text('ลบจุดรถกู้ชีพ')", { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13_rescue_delete_confirm.png") });

      const confirmDeleteBtn = page.locator("button[type=submit]:has-text('ลบจุดรถกู้ชีพ')").last();
      await confirmDeleteBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const deletedRow = page.locator("tr:has-text('" + testRescueEdited + "')");
      if (await deletedRow.isVisible()) {
        throw new Error("Deleted rescue base still visible in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "14_rescue_deleted_success.png") });
    });

    // 4. Risk Points Management CRUD (/accident/risk)
    await testStep("15. Navigate to Risk Points Management page", async () => {
      await page.goto(BASE_URL + "/accident/risk", { waitUntil: "networkidle" });
      const title = await page.locator("h2").textContent();
      if (!title?.includes("จัดการจุดเสี่ยง")) {
        throw new Error("Unexpected risk page title: " + title);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "15_risk_management_list.png") });
    });

    const testRiskPlace = "E2E จุดเสี่ยงทดสอบ " + Date.now();
    const testRiskEdited = testRiskPlace + " (แก้ไข)";

    await testStep("16. Create new Risk Point (CRUD Create)", async () => {
      const addBtn = page.locator("button:has-text('เพิ่มจุดเสี่ยง')").first();
      await addBtn.click();
      await page.waitForSelector("#risk-place-name", { timeout: 3000 });

      await page.fill("#risk-place-name", testRiskPlace);
      await page.fill("#risk-lat", "16.835000");
      await page.fill("#risk-lng", "100.275000");
      await page.fill("#risk-note", "สี่แยกทดสอบการเกิดอุบัติเหตุบ่อยครั้ง E2E");

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "16_risk_create_modal.png") });

      const submitBtn = page.locator("button[type=submit]:has-text('เพิ่มจุดเสี่ยง')").last();
      await submitBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const createdRow = page.locator("tr:has-text('" + testRiskPlace + "')");
      if (!await createdRow.isVisible()) {
        throw new Error("Newly created risk point not found in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "17_risk_created_success.png") });
    });

    await testStep("17. Edit Risk Point (CRUD Update)", async () => {
      const targetRow = page.locator("tr:has-text('" + testRiskPlace + "')");
      const editBtn = targetRow.locator("button:has-text('แก้ไข')").first();
      await editBtn.click();

      await page.waitForSelector("#risk-place-name", { timeout: 3000 });
      await page.fill("#risk-place-name", testRiskEdited);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "18_risk_edit_modal.png") });

      const saveBtn = page.locator("button[type=submit]:has-text('บันทึกการแก้ไข')").first();
      await saveBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const editedRow = page.locator("tr:has-text('" + testRiskEdited + "')");
      if (!await editedRow.isVisible()) {
        throw new Error("Edited risk point not found in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "19_risk_edited_success.png") });
    });

    await testStep("18. Delete Risk Point (CRUD Delete)", async () => {
      const targetRow = page.locator("tr:has-text('" + testRiskEdited + "')");
      const deleteBtn = targetRow.locator("button:has-text('ลบ')").first();
      await deleteBtn.click();

      await page.waitForSelector("button:has-text('ลบจุดเสี่ยง')", { timeout: 3000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "20_risk_delete_confirm.png") });

      const confirmDeleteBtn = page.locator("button[type=submit]:has-text('ลบจุดเสี่ยง')").last();
      await confirmDeleteBtn.click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const deletedRow = page.locator("tr:has-text('" + testRiskEdited + "')");
      if (await deletedRow.isVisible()) {
        throw new Error("Deleted risk point still visible in table");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "21_risk_deleted_success.png") });
    });

    // 5. Upload Management Page (/accident/upload)
    await testStep("19. Upload Page UI and Format Reference Table", async () => {
      await page.goto(BASE_URL + "/accident/upload", { waitUntil: "networkidle" });
      const heading = await page.locator("h2").textContent();
      if (!heading?.includes("นำเข้าข้อมูลอุบัติเหตุ")) {
        throw new Error("Unexpected upload heading: " + heading);
      }

      const columnTable = page.locator("table");
      if (!await columnTable.isVisible()) {
        throw new Error("Column format reference table not visible");
      }

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "22_upload_page.png") });
    });

    // 6. Boundary GeoJSON API Endpoints
    await testStep("20. API Endpoint /api/boundaries/district", async () => {
      const response = await page.request.get(BASE_URL + "/api/boundaries/district");
      if (response.status() !== 200) {
        throw new Error("Expected 200, got " + response.status());
      }
      const data = await response.json();
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Invalid GeoJSON FeatureCollection response for districts");
      }
      console.log("(Found " + data.features.length + " district features)");
    });

    await testStep("21. API Endpoint /api/boundaries/subdistrict", async () => {
      const response = await page.request.get(BASE_URL + "/api/boundaries/subdistrict");
      if (response.status() !== 200) {
        throw new Error("Expected 200, got " + response.status());
      }
      const data = await response.json();
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Invalid GeoJSON FeatureCollection response for subdistricts");
      }
      console.log("(Found " + data.features.length + " subdistrict features)");
    });

  } finally {
    await browser.close();
  }

  console.log("\n==================================================");
  console.log(" E2E Test Suite Summary");
  console.log(" Total Tests: " + (passed + failed));
  console.log(" Passed:      " + passed);
  console.log(" Failed:      " + failed);
  console.log(" Screenshots: " + SCREENSHOT_DIR);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
