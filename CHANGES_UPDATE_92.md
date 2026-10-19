# Update 92 - LINEDLE: customizable wave panel

New card **Settings -> Wave panel look** in LINEDLE. Every change applies instantly on every connected screen, is saved on the server (`data/linedle-wave.json`) and survives a restart.

## What the host can change
- **Panel box:** gradient / solid / transparent background, 2 colors, border on/off + color, corner roundness, panel height.
- **Pillars:** show / hide, color, strength, width, outline on/off; numbers (or revealed letters) under the pillars: show / hide, color, size.
- **Horizontal letter lines:** show / hide, color, strength, thickness, style (dotted / dashed / solid), which letters get a line (A F K P U Z, every 2nd, every letter, only A and Z).
- **Letters on the left side (A-Z scale):** show / hide on their own (independent of the lines), color, strength, size, which letters are shown.
- **Light-blue wave:** color (or Auto = Color shades), thickness, glow, dots on the pillars (show / hide, size).
- **White wave:** color (or Auto), thickness, glow, green / yellow / grey dots (show / hide, size), letter inside each dot, faint trails of earlier guesses (show / hide, how many, thickness, strength).
- **5 ready looks:** Night blue (standard), Clean light, Neon, Chalkboard, Minimal (no lines or letters) + "Reset the wave panel look".

## Files
- NEW `server/shared/linedle-wave-store.js` (validated, saved look)
- `server/linedle/linedle-server.js` (sends `waveStyle`, actions `set_wave_style` / `reset_wave_style`)
- `server/linedle/public/linedle-game.js`, `linedle-index.html`, `linedle-style.css`
