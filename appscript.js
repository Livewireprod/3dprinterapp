const SHEET_NAME = "Sheet1"; // Requests sheet
const ITEMS_SHEET_NAME = "Items"; // Items lookup sheet

// ---------- helpers ----------
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function safeParseBody(e) {
  const raw =
    e && e.postData && typeof e.postData.contents === "string"
      ? e.postData.contents
      : "{}";

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON body", raw };
  }

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return { ok: false, error: "Invalid nested JSON body", raw };
    }
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object", raw };
  }

  return { ok: true, body };
}

function getSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error(`Sheet "${SHEET_NAME}" not found`);
  return sh;
}

function getItemsSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ITEMS_SHEET_NAME);
  if (!sh) throw new Error(`Sheet "${ITEMS_SHEET_NAME}" not found`);
  return sh;
}

function getHeaders_(sh) {
  const lastCol = sh.getLastColumn();
  if (lastCol < 1) throw new Error("No headers found in row 1");
  return sh
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((h) => String(h).trim());
}

function findHeaderIndex_(headers, wanted) {
  const w = String(wanted).toLowerCase();
  return headers.findIndex((h) => String(h).toLowerCase() === w);
}

function findRowById_(sh, headers, id) {
  const idIndex = findHeaderIndex_(headers, "id");
  if (idIndex === -1) throw new Error('Missing "id" header');

  const ids = sh
    .getRange(2, idIndex + 1, sh.getLastRow() - 1, 1)
    .getValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      return i + 2;
    }
  }
  return -1;
}

// ---------- GET: return all requests ----------
function doGet() {
  const sh = getSheet_();
  const headers = getHeaders_(sh);

  if (sh.getLastRow() < 2) return jsonOut({ ok: true, rows: [] });

  const values = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues();

  const rows = values
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });

  return jsonOut({ ok: true, rows });
}

// ---------- POST ----------
function doPost(e) {
  const parsed = safeParseBody(e);
  if (!parsed.ok) return jsonOut(parsed);

  const body = parsed.body;
  const action = String(body.action || "").toLowerCase();

  // ===== ITEMS =====

  if (action === "getitems") {
    const sh = getItemsSheet_();
    const rows = sh.getDataRange().getValues().slice(1);
    return jsonOut({
      ok: true,
      items: rows.map(([id, name]) => ({ id, name })),
    });
  }

  if (action === "additem") {
    const name = String(body.name || "").trim();
    if (!name) return jsonOut({ ok: false, error: "Missing item name" });

    const sh = getItemsSheet_();
    const id = sh.getLastRow();
    sh.appendRow([id, name]);

    return jsonOut({ ok: true, item: { id, name } });
  }

  // ===== REQUESTS =====

  const sh = getSheet_();
  const headers = getHeaders_(sh);

  // ----- DELETE -----
  if (action === "delete") {
    const id = String(body.id || "").trim();
    if (!id) return jsonOut({ ok: false, error: "Missing id" });

    const row = findRowById_(sh, headers, id);
    if (row !== -1) sh.deleteRow(row);

    return jsonOut({ ok: true });
  }

  // ----- UPDATE -----
  if (action === "update") {
    const id = String(body.id || "").trim();
    const fields = body.fields || {};

    if (!id) return jsonOut({ ok: false, error: "Missing id" });

    const row = findRowById_(sh, headers, id);
    if (row === -1) return jsonOut({ ok: false, error: "ID not found" });

    const allowed = ["priority", "status", "devNotes", "quantity", "item"];
    const updated = {};

    allowed.forEach((key) => {
      if (key in fields) {
        const col = findHeaderIndex_(headers, key);
        if (col !== -1) {
          sh.getRange(row, col + 1).setValue(fields[key]);
          updated[key] = fields[key];
        }
      }
    });

    return jsonOut({ ok: true, updated });
  }

  // ----- ADD (default) -----
  if (!body.name || !body.item) {
    return jsonOut({
      ok: false,
      error: "Missing required fields: name and item",
    });
  }

  const row = headers.map((h) => (body[h] != null ? body[h] : ""));
  sh.appendRow(row);

  return jsonOut({ ok: true });
}
