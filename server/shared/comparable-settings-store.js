// ===================================================================
// COMPARABLE SETTINGS STORE  (update 65)
// Remembers the one host choice that belongs to COMPARABLE's color legend:
//
//   * show - is the color legend (Green / Yellow / Grey and what they mean) visible above the board? (default ON)
//
// Unlike SHIFTLE the colors never change meaning, so the legend always says what each color means.
// Written to data/comparable-settings.json so the choice survives a restart.
// A read-only disk is fine: the choice still works for this run.
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "comparable-settings.json");

const settings = { show: true };
let saveTimer = null;

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw.show === "boolean") settings.show = raw.show;
} catch (e) {
  // first run / unreadable file: defaults stay
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
      // read-only disk - ignore
    }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getLegendShow() { return settings.show; }

export function setLegendShow(on) {
  settings.show = Boolean(on);
  scheduleSave();
  return settings.show;
}
