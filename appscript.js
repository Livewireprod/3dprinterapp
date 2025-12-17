const SHEET_NAME = "Sheet1"; // <-- change to your tab name

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
  } catch (err) {
    return { ok: false, error: "Invalid JSON body", raw };
  }

  // Handle double-encoded JSON string: "\"{...}\""
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return { ok: false, error: "Invalid nested JSON body", raw, nested: body };
    }
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object", raw };
  }

  return { ok: true, body };
}

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error(`Sheet "${SHEET_NAME}" not found`);
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
  if (idIndex === -1) throw new Error('Missing "id" header in row 1');

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;

  const idCol = idIndex + 1; // 1-based
  const ids = sh.getRange(2, idCol, lastRow - 1, 1).getValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) {
      return i + 2; // sheet row number
    }
  }
  return -1;
}

// ---------- GET: return all requests ----------
function doGet(e) {
  const sh = getSheet_();
  const headers = getHeaders_(sh);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return jsonOut({ ok: true, rows: [] });

  const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const rows = values
    // drop totally empty rows
    .filter((r) => r.some((cell) => String(cell).trim() !== ""))
    // map to objects by header
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });

  return jsonOut({ ok: true, rows });
}

// ---------- POST: add / delete / update ----------
function doPost(e) {
  const sh = getSheet_();
  const parsed = safeParseBody(e);
  if (!parsed.ok) return jsonOut(parsed);

  const body = parsed.body;
  const action = String(body.action || "").toLowerCase().trim();

  const headers = getHeaders_(sh);

  // ----- DELETE -----
  // Payload: { action: "delete", id: "..." }
  if (action === "delete") {
    const id = String(body.id || "").trim();
    if (!id) return jsonOut({ ok: false, error: "Missing id for delete" });

    const idIndex = findHeaderIndex_(headers, "id");
    if (idIndex === -1) throw new Error('Missing "id" header in row 1');

    const idCol = idIndex + 1;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return jsonOut({ ok: true, deleted: 0 });

    const ids = sh.getRange(2, idCol, lastRow - 1, 1).getValues();

    let deleted = 0;
    // delete bottom-up to avoid row shift issues
    for (let i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]).trim() === id) {
        sh.deleteRow(i + 2);
        deleted++;
      }
    }

    return jsonOut({ ok: true, deleted });
  }

  // ----- UPDATE -----
  // Payload: { action: "update", id: "...", fields: { priority, status, devNotes } }
  if (action === "update") {
    const id = String(body.id || "").trim();
    const fields =
      body.fields && typeof body.fields === "object" ? body.fields : null;

    if (!id) return jsonOut({ ok: false, error: "Missing id for update" });
    if (!fields) return jsonOut({ ok: false, error: "Missing fields object" });

    const rowNumber = findRowById_(sh, headers, id);
    if (rowNumber === -1)
      return jsonOut({ ok: false, error: "ID not found", id });

    const allowed = ["priority", "status", "devNotes"];
    const updated = {};

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        const colIndex = findHeaderIndex_(headers, key);
        if (colIndex !== -1) {
          sh.getRange(rowNumber, colIndex + 1).setValue(fields[key]);
          updated[key] = fields[key];
        }
      }
    }

    return jsonOut({ ok: true, updated });
  }

  // ----- ADD (default) -----
  // Prevent junk appends forever
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  if (!name || !description) {
    return jsonOut({
      ok: false,
      error: "Missing required fields: name and description",
    });
  }

  // Append based on header names
  const row = headers.map((h) => (body[h] != null ? body[h] : ""));
  sh.appendRow(row);

  return jsonOut({ ok: true });
}
