import { NOTE_LAYER_START_X, NOTE_SPACING, STAFF_LINE_SPACING } from "../constants";
import type { GlyphNames } from "../glyphs";
import { parseNoteString } from "../helpers/notehelpers";
import GrandStaffStrategy from "../strategies/GrandStaffStrategy";
import SingleStaffStrategy from "../strategies/SingleStaffStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { NoteObj, StaffTypes } from "../types";
import NoteRenderer, { type RenderNoteReturn } from "./NoteRenderer";
import SVGRenderer from "./SVGRenderer";

export type MusicStaffOptions = {
  width?: number;
  scale?: number;
  staffType?: StaffTypes;
  spaceAbove?: number;
  spaceBelow?: number;
  staffColor?: string;
  staffBackgroundColor?: string;
};

const USE_GLPYHS: GlyphNames[] = [
  "CLEF_TREBLE", "CLEF_BASS", "CLEF_ALTO",
  "NOTE_HEAD_WHOLE", "NOTE_HEAD_HALF", "NOTE_HEAD_QUARTER", "EIGHTH_NOTE", "EIGHTH_NOTE_FLIPPED",
  "ACCIDENTAL_SHARP", "ACCIDENTAL_FLAT", "ACCIDENTAL_NATURAL", "ACCIDENTAL_DOUBLE_SHARP", "ACCIDENTAL_DOUBLE_FLAT"
];

type NoteEntry = {
  gElement: SVGGElement;
  note: NoteObj;
  xPos: number;
  yPos: number;
  accidentalXOffset: number;
};

export default class MusicStaff {
  private svgRendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private noteRendererInstance: NoteRenderer;

  private options: Required<MusicStaffOptions>;

  private noteEntries: NoteEntry[] = [];
  private noteCursorX: number = 0;

  /**
   * Creates an instance of a MusicStaff, A single staff.
   *
   * @param rootElementCtx - The element (div) reference that will append the music staff elements to.
   * @param options - Optional configuration settings. Can adjust staff type (treble, bass, alto, grand), width, scale, spaces above/below, etc. All config options are in the type MusicStaffOptions
  */
  constructor(rootElementCtx: HTMLElement, options?: MusicStaffOptions) {
    this.options = {
      width: 300,
      scale: 1,
      staffType: "treble",
      spaceAbove: 0,
      spaceBelow: 0,
      staffColor: "black",
      staffBackgroundColor: "transparent",
      ...options
    } as Required<MusicStaffOptions>;

    // Create the SVGRenderer instance with its options passed into this class
    this.svgRendererInstance = new SVGRenderer(rootElementCtx, {
      width: this.options.width,
      height: 100,
      scale: this.options.scale,
      staffColor: this.options.staffColor,
      staffBackgroundColor: this.options.staffBackgroundColor,
      useGlyphs: USE_GLPYHS
    });
    const rootSvgElement = this.svgRendererInstance.rootSvgElement;

    // Create the strategy instance based on the staffType
    switch (this.options.staffType) {
      case "grand":
        this.strategyInstance = new GrandStaffStrategy(this.svgRendererInstance, "grand");
        break;
      case "bass":
        this.strategyInstance = new SingleStaffStrategy(this.svgRendererInstance, "bass");
        break;
      case "treble":
        this.strategyInstance = new SingleStaffStrategy(this.svgRendererInstance, "treble");
        break;
      case "alto":
        this.strategyInstance = new SingleStaffStrategy(this.svgRendererInstance, "alto");
        break;
      default:
        throw new Error(`The staff type ${this.options.staffType} is not supported. Please use "treble", "bass", "alto", or "grand".`);
    };
    this.strategyInstance.drawStaff(this.options.width);

    // Create instance of NoteRenderer, with ref to svgRenderer and the strategy
    this.noteRendererInstance = new NoteRenderer(this.svgRendererInstance, this.strategyInstance);

    // Determine staff spacing positioning
    if (this.options.spaceAbove) {
      const yOffset = this.options.spaceAbove * (STAFF_LINE_SPACING);
      this.svgRendererInstance.addTotalRootSvgYOffset(yOffset);
    }
    if (this.options.spaceBelow) {
      let height = this.options.spaceBelow * (STAFF_LINE_SPACING);
      // Due to how different grand staff is setup, handle edge case of bottom spacing
      if (this.options.staffType === "grand") height -= (STAFF_LINE_SPACING / 2)
      this.svgRendererInstance.addTotalRootSvgHeight(height);
    }

    // Commit to DOM for one batch operation
    this.svgRendererInstance.applySizingToRootSvg();
    this.svgRendererInstance.commitElementsToDOM(rootSvgElement);
  }


  /**
   * Draws a note on the staff.
   * @param notes - A single string OR array of note strings in the format `[Root][Accidental?][Octave][Duration?]`.
   * If an array is passed, it will draw each individual note on the staff.
   *
   * * **Root**: (A-G)
   * * **Accidental** (Optional): `#` (sharp) `b` (flat) `n` (natural) `##` (double sharp) or `bb` (double flat).
   * * **Octave**: The octave number (e.g., `4`).
   * * **Duration** (Optional): `w` (whole) `h` (half) `q` (quarter) or `e` (eighth). Defaults to `w` if duration is omitted
   * @returns void
   * @throws {Error} If a note string is not correct format. If an array was passed, it will still draw whatever correctly formatted notes before it. 
   * 
   * * @example
   * // Draws the specified notes individually on the staff
   * drawNote(["D4w", "F4w", "A4w", "B#5q", "Ebb4e"]);
   * 
   * * @example
   * // Draws the specified single note on the staff
   * drawNote("D4w");
  */
  drawNote(notes: string | string[]) {
    // Normalizes input by converting a single string into an array
    const normalizedNotesArray = Array.isArray(notes) ? notes : [notes];
    const notesLayer = this.svgRendererInstance.getLayerByName("notes");

    const noteGroups: SVGGElement[] = [];
    for (const noteString of normalizedNotesArray) {
      let res: RenderNoteReturn | undefined;

      // If theres a failed render of a string entry, commit any remaining note groups
      try {
        res = this.noteRendererInstance.renderNote(noteString);
      }
      catch (error) {
        if (noteGroups.length > 0) this.svgRendererInstance.commitElementsToDOM(noteGroups, notesLayer);
        throw error;
      };

      res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX + res.accidentalOffset}, ${res.noteYPos})`);
      this.noteEntries.push({
        gElement: res.noteGroup,
        note: res.noteObj,
        xPos: this.noteCursorX + res.accidentalOffset,
        yPos: res.noteYPos,
        accidentalXOffset: res.accidentalOffset
      });

      this.noteCursorX += NOTE_SPACING + res.accidentalOffset;
      noteGroups.push(res.noteGroup);
    }

    // Commit the newly created note/notes element to the 'notes' layer
    this.svgRendererInstance.commitElementsToDOM(noteGroups, notesLayer);
  }

  /**
   * Draws a chord on the staff.
   * @param notes - An array of note strings in the format `[Root][Accidental?][Octave][Duration?]`.
   *
   * * **Root**: (A-G)
   * * **Accidental** (Optional): `#` (sharp) `b` (flat) `n` (natural) `##` (double sharp) or `bb` (double flat).
   * * **Octave**: The octave number (e.g., `4`).
   * * **Duration** (Optional): `w` (whole) `h` (half) `q` (quarter) or `e` (eighth). Defaults to `w` if duration is omitted
   * @returns void
   * @throws {Error} If a note string is not correct format OR if less than one note was provided.
   * 
   * * @example
   * // Draw a D minor chord starting on 4th octave
   * drawChord(["D4w", "F4w", "A4w"], 0);
  */
  drawChord(notes: string[]) {
    if (notes.length < 2) throw new Error("Provide more than one note for a chord.");
    const notesLayer = this.svgRendererInstance.getLayerByName("notes");

    const res = this.noteRendererInstance.renderChord(notes);

    // Apply XPos to chord parent
    res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX + res.accidentalOffset}, 0)`);

    this.noteEntries.push({
      gElement: res.noteGroup,
      note: parseNoteString(notes[0]),
      xPos: this.noteCursorX + res.accidentalOffset,
      yPos: 0,
      accidentalXOffset: res.accidentalOffset
    });

    // Increment note cursor due to renderNote function being overriden X pos
    this.noteCursorX += NOTE_SPACING + res.accidentalOffset + res.cursorOffset;

    // Commit the newly created note/notes element to the 'notes' layer
    this.svgRendererInstance.commitElementsToDOM(res.noteGroup, notesLayer);
  }

  /**
   * Evenly spaces out the notes on the staff.
   * @returns Returns early if no notes are on the staff
  */
  justifyNotes() {
    const containerWidth = this.options.width - NOTE_LAYER_START_X;
    const notesCount = this.noteEntries.length;
    if (notesCount <= 0 || containerWidth <= 0) return;
    const noteSpacing = Math.round(containerWidth / notesCount);

    // Get all calculations first (prevent layout thrashing by writing/reading in the same loop)
    const updates = this.noteEntries.map((e, i) => {
      const slotCenterX = (i + 0.5) * noteSpacing;
      const bbox = e.gElement.getBBox(); // Forces Style Recalc (Expensive)

      // Calculate the final visual position
      const rawPlacedX = slotCenterX - (bbox.width / 2) - bbox.x;
      const finalX = Math.round(rawPlacedX * 10) / 10;

      return {
        entry: e,
        newX: finalX,
        isChord: e.gElement.classList.contains("chord")
      };
    });

    // Write each update (not calling getBBox in this loops helps layout thrasing)
    updates.forEach((update) => {
      const { entry, newX, isChord } = update;

      if (isChord) {
        entry.gElement.setAttribute("transform", `translate(${newX}, 0)`);
      } else {
        entry.gElement.setAttribute("transform", `translate(${newX}, ${entry.yPos})`);
      }

      entry.xPos = newX;
    });
  }

  /**
   * Clears staff of notes and resets internal positioning.
   * @returns void
  */
  clearAllNotes() {
    this.noteCursorX = 0;

    this.svgRendererInstance.getLayerByName("notes").replaceChildren();
    this.noteEntries = [];
  }


  /**
   * Changes the note by index to the specified note.
   * @param notes - A note string in the format `[Root][Accidental?][Octave][Duration?]`.
   *
   * * **Root**: (A-G)
   * * **Accidental** (Optional): `#` (sharp) `b` (flat) `n` (natural) `##` (double sharp) or `bb` (double flat).
   * * **Octave**: The octave number (e.g., `4`).
   * * **Duration** (Optional): `w` (whole) `h` (half) `q` (quarter) or `e` (eighth). Defaults to `w` if duration is omitted
   * @param noteIndex The index of the note that will replaced by the specified note.
   * @returns void
   * @throws {Error} If the index provided is out of bounds, or if a note string is not correct format.
   * 
   * * @example
   * // Changes note at pos `0` to a B flat quarter note on the 3rd octave
   * changeNoteByIndex("Bb3q", 0);
  */
  changeNoteByIndex(note: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteEntry = this.noteEntries[noteIndex];

    const res = this.noteRendererInstance.renderNote(note);
    const normalizedOriginalXPos = noteEntry.xPos - noteEntry.accidentalXOffset;

    // Due to normalization of orignal note pos, this will only consider the newly caculated accidental X offset
    const newXPos = normalizedOriginalXPos + res.accidentalOffset;

    res.noteGroup.setAttribute("transform", `translate(${newXPos}, ${res.noteYPos})`);

    // Replace with new note
    this.svgRendererInstance.getLayerByName("notes").replaceChild(res.noteGroup, noteEntry.gElement);

    // Replace place in list with new note data
    this.noteEntries[noteIndex] = {
      gElement: res.noteGroup,
      note: res.noteObj,
      xPos: newXPos,
      yPos: res.noteYPos,
      accidentalXOffset: res.accidentalOffset
    };
  };

  /**
   * Changes the note by index to the specified chord.
   * @param notes - An array of note strings in the format `[Root][Accidental?][Octave][Duration?]`.
   *
   * * **Root**: (A-G)
   * * **Accidental** (Optional): `#` (sharp) `b` (flat) `n` (natural) `##` (double sharp) or `bb` (double flat).
   * * **Octave**: The octave number (e.g., `4`).
   * * **Duration** (Optional): `w` (whole) `h` (half) `q` (quarter) or `e` (eighth). Defaults to `w` if duration is omitted
   * @param noteIndex The index of the note that will replaced by the specified chord.
   * @returns void
   * @throws {Error} If the index provided is out of bounds, or if a note string is not correct format.
   * 
   * * @example
   * // Changes chord at pos `0` to a C Minor chord
   * changeChordByIndex(["C4w", "D#4w", "G4w"], 0);
  */
  changeChordByIndex(notes: string[], chordIndex: number) {
    if (chordIndex >= this.noteEntries.length) throw new Error("Chord index was out of bounds.");
    if (notes.length < 2) throw new Error("Notes provided need to be more than one to be considered a chord.");
    const chordEntry = this.noteEntries[chordIndex];

    const res = this.noteRendererInstance.renderChord(notes);

    const normalizedOriginalXPos = chordEntry.xPos - chordEntry.accidentalXOffset;
    // Due to normalization of orignal note pos, this will only consider the newly caculated X pos
    const newXPos = normalizedOriginalXPos + res.accidentalOffset;

    // Apply XPos to chord parent not sure how to handle xOffsets without them accumlating
    res.noteGroup.setAttribute("transform", `translate(${newXPos}, 0)`);

    // Replace with new note
    this.svgRendererInstance.getLayerByName("notes").replaceChild(res.noteGroup, chordEntry.gElement);

    // Replace place in list with new note data
    this.noteEntries[chordIndex] = {
      gElement: res.noteGroup,
      note: parseNoteString(notes[0]),
      xPos: newXPos,
      yPos: 0,
      accidentalXOffset: res.accidentalOffset
    };
  };

  /**
   * Adds a class to the note by the index provided.
   * @param className The name added to the note
   * @param noteIndex The index of the note that will have 'className' added to it.
   * @returns void
   * @throws {Error} If the index provided is out of bounds
  */
  addClassToNoteByIndex(className: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteEntry = this.noteEntries[noteIndex];

    noteEntry.gElement.classList.add(className);
  }

  /**
   * Removes a class to the note by the index provided.
   * @param className The name removed from the note
   * @param noteIndex The index of the note that will have 'className' removed from it.
   * @returns void
   * @throws {Error} If the index provided is out of bounds
  */
  removeClassToNoteByIndex(className: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteEntry = this.noteEntries[noteIndex];

    noteEntry.gElement.classList.remove(className);
  }

  /**
   * Removes the root svg element and cleans up arrays.
   * @returns void
  */
  destroy() {
    this.noteEntries = [];
    this.svgRendererInstance.destroy();
  }
}