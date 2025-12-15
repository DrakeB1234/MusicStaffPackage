import { type GlyphNames } from "../glyphs";
import type { Accidentals, Durations, NoteNames, NoteObj } from "../types";

export const REGEX_NOTE_STRING = /^(?<name>[A-Ga-g])(?<accidental>[#b]?)(?<octave>\d)(?<duration>[whqeWHQE]?)$/;
export const REGEX_DURATION_NOTE_STRING = /^[whqeWHQE]$/;
export const REGEX_REST_STRING = /^(?<rest>[rR])(?<duration>[whqeWHQE]?)$/;

const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as NoteNames[];

export function parseNoteString(noteString: string): NoteObj {
  const match = noteString.match(REGEX_NOTE_STRING);

  if (!match || !match.groups) {
    throw new Error(`Invalid note string format: ${noteString}. Expected format: [A-Ga-g][#|b]?[0-9][w|h|q|e].`);
  };

  let { name, accidental, octave, duration } = match.groups;

  // Normalize input
  name = name.toUpperCase();
  duration = duration.toLowerCase();

  if (!name) {
    throw new Error(`Invalid note name: ${name}. Valid note names are: C, D, E, F, G, A, B.`);
  };
  if (!octave) {
    throw new Error(`Invalid octave: ${octave}. Octave must be a number between 0 and 9.`);
  }
  if (!duration) {
    duration = 'w';
  }

  const noteObj: NoteObj = {
    name: name as NoteNames,
    octave: parseInt(octave),
    duration: duration as Durations,
  }

  if (accidental) {
    noteObj.accidental = accidental as Accidentals;
  }

  return noteObj;
}

export function parseDurationNoteString(note: string): Durations {
  const match = note.match(REGEX_DURATION_NOTE_STRING);
  if (!match) throw new Error(`Invalid note duration '${note}'. Use w | h | q | e.`);
  let string = match.toString().toLowerCase() as Durations;

  return string;
};

export function parseRestString(rest: string): Durations {
  const match = rest.match(REGEX_REST_STRING);

  if (!match || !match.groups) {
    throw new Error(`Invalid rest string format: ${rest}. Expected format: [r][w|h|q|e].`);
  };

  let duration = match.groups[1];

  // Normalize input
  duration = duration.toLowerCase();

  if (!duration) {
    duration = 'w';
  }

  return duration as Durations;
}

export function getGlyphNameByClef(clef: string): GlyphNames {
  let searchKey: GlyphNames | undefined;

  switch (clef) {
    case 'treble':
      searchKey = 'CLEF_TREBLE';
      break;
    case 'bass':
      searchKey = 'CLEF_BASS';
      break;
    case 'alto':
      searchKey = 'CLEF_ALTO';
      break;
  }
  if (!searchKey) throw new Error(`Invalid clef type: ${clef}. Valid clef types are: treble, bass, alto.`);

  return searchKey;
}

export function getNoteSpacingFromReference(referenceNote: NoteObj, targetNote: NoteObj): number {
  const nameDiff = NOTE_NAMES.indexOf(referenceNote.name) - NOTE_NAMES.indexOf(targetNote.name);
  let octaveDiff = referenceNote.octave - targetNote.octave;
  octaveDiff *= 7;

  return nameDiff + octaveDiff;
}

// DOES NOT CONSIDER ACCIDENTAL INTO FINAL SEMITONE AMOUNT
export function noteToAbsoluteSemitone(note: NoteObj): number {
  let semitone = NOTE_NAMES.indexOf(note.name);
  semitone += (note.octave * 12)
  return semitone;
}