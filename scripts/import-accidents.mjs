/**
 * นำเข้าข้อมูลแจ้งเหตุจาก raw/*.xlsx (export จากระบบ 1669) เข้าตาราง accident
 *
 * ตาราง accident มีโครงสร้างตรงกับไฟล์ครบทั้ง 88 คอลัมน์ script นี้จึงคัดลอกทุกคอลัมน์
 * แล้วเติมคอลัมน์เสริม 2 ตัวที่ไฟล์ไม่มี คือ place_coordinate (PostGIS) และ triage (enum)
 *
 * ใช้ pg ตรงๆ เพราะ Prisma Client เขียนคอลัมน์ Unsupported("geometry") ไม่ได้
 *
 * วิธีรัน:
 *   node scripts/import-accidents.mjs [โฟลเดอร์]        ล้างของเดิมแล้วนำเข้าใหม่ทั้งหมด
 *   node scripts/import-accidents.mjs --accident-only    เฉพาะ CBD ที่เป็นอุบัติเหตุ
 *   node scripts/import-accidents.mjs --keep             ไม่ล้างของเดิม (upsert ทับด้วย unique key)
 */
import "dotenv/config";
import { readdir } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import pg from "pg";

const args = process.argv.slice(2);
const ACCIDENT_ONLY = args.includes("--accident-only");
const KEEP = args.includes("--keep");
const SOURCE_DIR = args.find((a) => !a.startsWith("--")) ?? "raw";

/** [หัวคอลัมน์ในไฟล์, ชื่อคอลัมน์ในตาราง, วิธีแปลงค่า] เรียงตามลำดับคอลัมน์ในไฟล์ */
const FIELDS = [
  ["เลขรับแจ้งเหตุ", "incident_no", "text"],
  ["เลขปฏิบัติการ", "op_no", "text"],
  ["จังหวัดสั่งการ", "command_province", "text"],
  ["ศูนย์สั่งการ", "command_center", "text"],
  ["วันที่รับแจ้งเหตุ", "incident_datetime", "datetime"],
  ["ช่องทางแจ้งเหตุ", "report_channel", "text"],
  ["ผู้แจ้งเหตุ", "reporter", "text"],
  ["เบอร์โทรติดต่อผู้แจ้งเหตุ", "reporter_phone", "text"],
  ["จังหวัดเกิดเหตุ", "province", "text"],
  ["อำเภอเกิดเหตุ", "district", "text"],
  ["ตำบลเกิดเหตุ", "subdistrict", "text"],
  ["สถานที่เกิดเหตุ", "place", "text"],
  ["CBD", "cbd", "text"],
  ["IDC Code", "idc_code", "text"],
  ["Phone Triage", "phone_triage", "text"],
  ["RC Code", "rc_code", "text"],
  ["Scene Triage", "scene_triage", "text"],
  ["รหัสหน่วยปฏิบัติการ", "unit_code", "text"],
  ["ชื่อหน่วยปฏิบัติการ", "unit_name", "text"],
  ["รหัสชุดปฏิบัติการ", "team_code", "text"],
  ["ชื่อชุดปฏิบัติการ", "team_name", "text"],
  ["ประเภทปฏิบัติการ", "op_type", "text"],
  ["ระดับชุดปฏิบัติการ", "team_level", "text"],
  ["เวลารับแจ้ง", "time_received", "datetime"],
  ["เวลาสั่งการ", "time_dispatched", "datetime"],
  ["เวลาออกจากฐาน", "time_departed_base", "datetime"],
  ["เวลาถึงที่เกิดเหตุ", "time_arrived_scene", "datetime"],
  ["เวลาออกจากเหตุ", "time_left_scene", "datetime"],
  ["เวลาถึง รพ.", "time_arrived_hospital", "datetime"],
  ["เวลา ถึงฐาน", "time_returned_base", "datetime"],
  ["ระยะเวลา รับแจ้ง ถึง สั่งการ (นาที)", "min_received_to_dispatch", "int"],
  ["ระยะเวลา รับแจ้ง ถึง ออกจากฐาน (นาที)", "min_received_to_depart", "int"],
  ["ระยะเวลา สั่งการ ถึง ออกจากฐาน (นาที)", "min_dispatch_to_depart", "int"],
  ["ระยะเวลา รับแจ้ง ถึง ที่เกิดเหตุ (นาที)", "min_received_to_scene", "int"],
  ["ระยะเวลา ที่เกิดเหตุ ถึง ออกจากเหตุ (นาที)", "min_scene_to_leave", "int"],
  ["ระยะเวลา ออกจากเหตุ ถึง รพ. (นาที)", "min_leave_to_hospital", "int"],
  ["ระยะเวลา รพ. ถึง ฐาน (นาที)", "min_hospital_to_base", "int"],
  ["ระยะทาง รับแจ้ง ถึง ที่เกิดเหตุ", "km_received_to_scene", "num"],
  ["ระยะทาง ออกจากเหตุ ถึง รพ.", "km_leave_to_hospital", "num"],
  ["ระยะทาง รพ. ถึง ฐาน", "km_hospital_to_base", "num"],
  ["การปฏิบัติการ", "op_result", "text"],
  ["เลขผู้ป่วย", "patient_no", "text"],
  ["อายุ (ปี/เดือน)", "age_raw", "text"],
  ["เพศ", "gender", "text"],
  ["กลุ่มผู้ใช้สิทธิการรักษา", "benefit_group", "text"],
  ["passport", "passport", "text"],
  ["สิทธิการรักษา", "benefit_type", "text"],
  ["ประกันอื่นๆถ้ามี", "other_insurance", "text"],
  ["ประเทศในกลุ่มผู้ใช้สิทธิการรักษา", "benefit_country", "text"],
  ["ประเภทรถ", "vehicle_type", "text"],
  ["ทะเบียนรถหมวด", "plate_category", "text"],
  ["เลขทะเบียน", "plate_no", "text"],
  ["จังหวัด", "plate_province", "text"],
  ["ประเภทผู้ป่วย", "patient_type", "text"],
  ["ผลการดูแลรักษาขั้นต้น", "initial_care_result", "text"],
  ["นำส่ง รพ.", "hospital_code", "text"],
  ["เกณฑ์การนำส่ง", "transfer_criteria", "text"],
  ["รหัสผู้ผู้สรุปรายงาน", "summarizer_code", "text"],
  ["ชื่อผู้สรุปรายงาน", "summarizer_name", "text"],
  ["HN", "hn", "text"],
  ["การวินิจฉัยโรค", "diagnosis", "text"],
  ["ระดับการคัดแยก (ER Triage)", "er_triage", "text"],
  ["ทางเดินหายใจ", "airway", "text"],
  ["การห้ามเลือด", "bleeding_control", "text"],
  ["การให้สารน้ำ", "iv_fluid", "text"],
  ["การดามกระดูก2", "splinting", "text"],
  ["ผู้ประเมิน", "assessor", "text"],
  ["ตำแหน่งผู้ประเมิน", "assessor_position", "text"],
  ["Admitted", "admitted", "text"],
  ["ผลการรักษาใน รพ.", "hospital_result", "text"],
  ["เจ้าหน้าที่ผู้บันทึก", "recorder", "text"],
  ["ผู้รับรอง", "certifier", "text"],
  ["สถานะ", "status", "text"],
  ["ประมาณการค่าตอบแทน", "estimated_fee", "num"],
  ["ค่าใช้จ่ายตามระยะทาง", "distance_fee", "num"],
  ["ปรึกษาแพทย์อำนวยการรับแจ้งเหตุ", "consult_intake", "text"],
  ["ชื่อแพทย์อำนวยการรับแจ้งเหตุ", "consult_intake_doctor", "text"],
  ["ปรึกษาแพทย์อำนวยการสั่งการ (ใบเหลือง)", "consult_dispatch", "text"],
  ["ชื่อแพทย์อำนวยการสั่งการ (ใบเหลือง)", "consult_dispatch_doctor", "text"],
  ["รายละเอียดคำปรึกษาแพทย์สั่งการ (ใบเหลือง)", "consult_dispatch_note", "text"],
  ["ปรึกษาแพทย์อำนวยการปฏิบัติการแพทย์", "consult_medical", "text"],
  ["ชื่อแพทย์อำนวยปฏิบัติการแพทย์", "consult_medical_doctor", "text"],
  ["รายละเอียดคำปรึกษาแพทย์ปฏิบัติการแพทย์", "consult_medical_note", "text"],
  ["ละติจูด", "lat", "num"],
  ["ลองจิจูด", "lon", "num"],
  ["ผู้ปฏิบัติการ (แพทย์)", "crew_doctor", "text"],
  ["ผู้ปฏิบัติการ (พยาบาล)", "crew_nurse", "text"],
  ["ผู้ปฏิบัติการ (ฉุกเฉินการแพทย์และอื่นๆ)", "crew_emt", "text"]
];

/** สีคัดแยกในไฟล์ → enum triage (ขาว = ทั่วไป จัดเป็น green เพราะ enum ไม่มีระดับขาว) */
const TRIAGE = [
  [/^แดง/, "red"],
  [/^เหลือง/, "yellow"],
  [/^เขียว/, "green"],
  [/^ขาว/, "green"],
  [/^ดำ/, "black"],
];

/** CBD ที่นับเป็นอุบัติเหตุ ใช้เมื่อสั่ง --accident-only */
const ACCIDENT_CBD = /^\[(24|25)\]/;

/** ไฟล์เก็บเวลาเป็นข้อความ "2026-07-01 00:24:00" ตามเวลาไทย ไม่มี timezone กำกับ */
function bangkokDate(text) {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "00"] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ระยะทางบางแถวหลุดมาเป็น "3.000026e+06" Number() อ่านได้ตรงๆ */
function toNumber(text) {
  if (!text) return null;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function convert(kind, text) {
  if (!text) return null;
  if (kind === "datetime") return bangkokDate(text);
  if (kind === "int") {
    const n = toNumber(text);
    return n === null ? null : Math.trunc(n);
  }
  if (kind === "num") return toNumber(text);
  return text;
}

function headerIndex(worksheet) {
  const index = new Map();
  worksheet.getRow(1).eachCell((cell, number) => {
    const name = String(cell.text ?? "").trim();
    if (name && !index.has(name)) index.set(name, number);
  });

  const missing = FIELDS.filter(([header]) => !index.has(header)).map(([h]) => h);
  if (missing.length > 0) throw new Error(`ไม่พบคอลัมน์: ${missing.join(", ")}`);
  return FIELDS.map(([header, column, kind]) => [index.get(header), column, kind]);
}

async function readFileRows(file, stats) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const worksheet = workbook.worksheets[0];
  const plan = headerIndex(worksheet);
  const source = path.basename(file);

  const rows = [];
  for (let n = 2; n <= worksheet.rowCount; n += 1) {
    const excelRow = worksheet.getRow(n);
    const cells = plan.map(([at]) => String(excelRow.getCell(at).text ?? "").trim());
    const value = (column) => cells[plan.findIndex(([, name]) => name === column)];

    if (!value("incident_no")) continue;
    stats.read += 1;

    if (ACCIDENT_ONLY && !ACCIDENT_CBD.test(value("cbd"))) {
      stats.skippedCbd += 1;
      continue;
    }

    const row = {};
    plan.forEach(([, column, kind], i) => {
      row[column] = convert(kind, cells[i]);
    });

    if (!row.incident_datetime) {
      stats.skippedDate += 1;
      continue;
    }

    const lat = Number(row.lat);
    const lng = Number(row.lon);
    // พิกัดนอกกรอบประเทศไทยถือว่าใช้ไม่ได้ กันจุดหลุดออกนอกแผนที่
    const usable =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106;
    if (!usable) stats.skippedGeo += 1;

    row.__lat = usable ? lat : null;
    row.__lng = usable ? lng : null;
    row.triage = triageOf(row.er_triage, row.scene_triage);
    row.source_file = source;
    rows.push(row);
  }
  return rows;
}

function triageOf(er, scene) {
  const text = (er || scene || "").trim();
  if (!text) return null;
  return TRIAGE.find(([re]) => re.test(text))?.[1] ?? null;
}

const files = (await readdir(SOURCE_DIR))
  .filter((name) => name.toLowerCase().endsWith(".xlsx") && !name.startsWith("~$"))
  .sort()
  .map((name) => path.join(SOURCE_DIR, name));

if (files.length === 0) throw new Error(`ไม่พบไฟล์ .xlsx ใน ${SOURCE_DIR}`);

const stats = { read: 0, skippedCbd: 0, skippedDate: 0, skippedGeo: 0 };
const rows = [];
for (const file of files) {
  const fileRows = await readFileRows(file, stats);
  console.log(`อ่าน ${path.basename(file)}: ${fileRows.length} แถว`);
  rows.push(...fileRows);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// คอลัมน์ที่เขียน = 88 คอลัมน์จากไฟล์ + triage + source_file (place_coordinate ต่อท้ายเป็น expression)
const COLUMNS = [...FIELDS.map(([, column]) => column), "triage", "source_file"];

try {
  await client.query("BEGIN");

  if (!KEEP) {
    const { rows: before } = await client.query("SELECT count(*)::int AS n FROM accident");
    await client.query("TRUNCATE TABLE accident RESTART IDENTITY");
    console.log(`ล้างข้อมูลเดิม ${before[0].n} แถว`);
  }

  const chunkSize = 200;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const params = [];
    const tuples = chunk.map((row) => {
      const holes = COLUMNS.map((column) => {
        params.push(row[column]);
        return `$${params.length}`;
      });
      // ST_MakePoint รับ lng ก่อน lat
      params.push(row.__lng, row.__lat);
      const lng = `$${params.length - 1}`;
      const lat = `$${params.length}`;
      holes.push(
        `CASE WHEN ${lng}::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326) END`,
      );
      return `(${holes.join(", ")})`;
    });

    const names = [...COLUMNS, "place_coordinate"].map((c) => `"${c}"`).join(", ");
    const updates = [...COLUMNS, "place_coordinate"]
      .filter((c) => !["op_no", "patient_no", "incident_datetime"].includes(c))
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");

    await client.query(
      `INSERT INTO accident (${names}) VALUES ${tuples.join(", ")}
       ON CONFLICT ("op_no", "patient_no", "incident_datetime") DO UPDATE SET ${updates}`,
      params,
    );
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}

const { rows: summary } = await client.query(`
  SELECT count(*)::int AS total,
         count(place_coordinate)::int AS with_geom,
         count(triage)::int AS with_triage,
         count(DISTINCT district)::int AS districts,
         to_char(min(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS date_min,
         to_char(max(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS date_max
  FROM accident
`);

await client.end();

console.log(
  `\nอ่านทั้งหมด ${stats.read} แถว | ข้ามเพราะไม่ใช่ CBD อุบัติเหตุ ${stats.skippedCbd}` +
    ` | วันที่ไม่ถูกต้อง ${stats.skippedDate} | พิกัดใช้ไม่ได้ ${stats.skippedGeo}`,
);
console.table(summary);
