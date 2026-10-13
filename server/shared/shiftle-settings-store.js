// ===================================================================
// SHIFTLE SETTINGS STORE  (update 63)
// Remembers the two host choices that belong to SHIFTLE's color legend:
//
//   * show    - is the color legend visible on the board at all?            (default ON)
//   * reveal  - does the legend tell the audience what each color means in
//               the CURRENT round? (default ON). When OFF the legend only
//               shows the three colors with a "?" and the audience has to
//               work the meanings out from the clues themselves - exactly
//               like the original Shuffl-O. The meanings are always shown
//               once a round has ended.
//
// Written to data/shiftle-settings.json so the choices survive a restart.
// A read-only disk is fine: the choice still works for this run.
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "shiftle-settings.json");

const settings = { show: true, reveal: true };
let saveTimer = null;

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (raw && typeof raw.show === "boolean") settings.show = raw.show;
    if (raw && typeof raw.reveal === "boolean") settings.reveal = raw.reveal;
  } catch (e) {
    // first run / unreadable file: defaults stay
  }
}
load();

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
export function getLegendReveal() { return settings.reveal; }

export function setLegendShow(on) {
  settings.show = Boolean(on);
  scheduleSave();
  return settings.show;
}
export function setLegendReveal(on) {
  settings.reveal = Boolean(on);
  scheduleSave();
  return settings.reveal;
}
