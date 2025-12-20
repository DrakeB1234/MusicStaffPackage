import type { StaffParams } from "./strategies/StrategyInterface";
import type { Durations, StaffTypes } from "./types";

export const NAMESPACE = "vs";

// Staff constants
export const STAFF_LINE_COUNT = 5;
export const STAFF_LINE_SPACING = 10;
export const NOTE_LAYER_START_X = 38;
export const GRAND_STAFF_SPACING = 30;

// Accidental constants
export const ACCIDENTAL_OFFSET_X = -8;
export const DOUBLE_SHARP_ACCIDENTAL_OFFSET_X = -2;
export const DOUBLE_FLAT_ACCIDENTAL_OFFSET_X = -6;

// Note constants
export const HALF_NOTEHEAD_WIDTH = 10;
export const NOTEHEAD_STEM_HEIGHT = 28;
export const NOTE_SPACING = 28;

// Ledger line constants
export const START_LEDGER_LINE_X = -2;
export const WHOLE_NOTE_LEDGER_LINE_WIDTH = 17;
export const HALF_NOTE_LEDGER_LINE_WIDTH = 12.5;

// Chord constants
export const CHORD_MAX_CONSECUTIVE_ACCIDENTALS = 3;


export const staffParams: Record<StaffTypes, StaffParams> = {
  treble: {
    staffType: "treble",
    paddingTop: 13,
    paddingBottom: 3,
    topLineNote: { name: "F", octave: 5 },
    topLineYPos: 0,
    bottomLineYPos: STAFF_LINE_SPACING * (STAFF_LINE_COUNT - 1),
  },
  bass: {
    staffType: "bass",
    paddingTop: 0,
    paddingBottom: 0,
    topLineNote: { name: "A", octave: 3 },
    topLineYPos: 0,
    bottomLineYPos: STAFF_LINE_SPACING * (STAFF_LINE_COUNT - 1)
  },
  alto: {
    staffType: "alto",
    paddingTop: 0,
    paddingBottom: 0,
    topLineNote: { name: "G", octave: 4 },
    topLineYPos: 0,
    bottomLineYPos: STAFF_LINE_SPACING * (STAFF_LINE_COUNT - 1)
  },
  grand: {
    staffType: "grand",
    paddingTop: 13,
    paddingBottom: 0,
    topLineNote: { name: "F", octave: 5 },
    topLineYPos: 0,
    bottomLineYPos: STAFF_LINE_SPACING * (STAFF_LINE_COUNT * 2 - 2) + GRAND_STAFF_SPACING
  },
}

export const durationBeatValueMap: Record<Durations, number> = {
  w: 4,
  h: 2,
  q: 1,
  e: 0.5,
  s: 0.25
};