import { NOTE_LAYER_START_X, NOTE_SPACING, STAFF_LINE_SPACING } from "../constants";
import type { GlyphNames } from "../glyphs";
import { parseNoteString } from "../helpers/notehelpers";
import GrandStaffStrategy from "../strategies/GrandStaffStrategy";
import SingleStaffStrategy from "../strategies/SingleStaffStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { NoteObj, StaffTypes } from "../types";
import NoteRenderer, { type NoteEntry } from "./NoteRenderer";
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

export default class MusicStaff {
  private svgRendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private noteRendererInstance: NoteRenderer;

  private options: Required<MusicStaffOptions>;

  private noteEntries: NoteEntry[] = [];
  private noteCursorX: number = 0;

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
   * @param {string | string[]} notes - The musical note to be drawn on the staff. Can pass an array for multiple notes at a time.
   * @description A string representing a single musical note, structured as:
   * `C#4w` == `<PITCH><OCTAVE><DURATION><MODIFIER>`
  */
  drawNote(notes: string | string[]) {
    // Normalizes input by converting a single string into an array
    const normalizedNotesArray = Array.isArray(notes) ? notes : [notes];
    const notesLayer = this.svgRendererInstance.getLayerByName("notes");

    const noteGroups: SVGGElement[] = [];
    for (const noteString of normalizedNotesArray) {
      let noteObj: NoteObj | undefined;
      try {
        noteObj = parseNoteString(noteString);
      }
      catch (error) {
        if (noteGroups.length > 0) this.svgRendererInstance.commitElementsToDOM(noteGroups, notesLayer);
        throw error;
      };

      const yPos = this.strategyInstance.calculateNoteYPos({
        name: noteObj.name,
        octave: noteObj.octave
      });

      // Handle note rendering
      const res = this.noteRendererInstance.renderNote(noteObj, yPos);

      res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX + res.accidentalOffset}, ${yPos})`);
      this.noteEntries.push({
        gElement: res.noteGroup,
        note: noteObj,
        xPos: this.noteCursorX + res.accidentalOffset,
        yPos: yPos,
        accidentalXOffset: res.accidentalOffset
      });

      this.noteCursorX += NOTE_SPACING + res.accidentalOffset;
      noteGroups.push(res.noteGroup);
    }

    // Commit the newly created note/notes element to the 'notes' layer
    this.svgRendererInstance.commitElementsToDOM(noteGroups, notesLayer);
  }

  // Bugs: JustifyNotes does not position chord group correctly. When stem note is used, the note can flip, causing weird looking chord
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

  // Gets all current notes on staff and evenly spaces them
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

  clearAllNotes() {
    this.noteCursorX = 0;

    this.svgRendererInstance.getLayerByName("notes").replaceChildren();
    this.noteEntries = [];
  }

  changeNoteByIndex(note: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteObj: NoteObj = parseNoteString(note);
    const noteEntry = this.noteEntries[noteIndex];
    const newNoteYPos = this.strategyInstance.calculateNoteYPos({
      name: noteObj.name,
      octave: noteObj.octave
    });

    const res = this.noteRendererInstance.renderNote(noteObj, newNoteYPos);
    const normalizedOriginalXPos = noteEntry.xPos - noteEntry.accidentalXOffset;

    // Due to normalization of orignal note pos, this will only consider the newly caculated accidental X offset
    const newXPos = normalizedOriginalXPos + res.accidentalOffset;

    res.noteGroup.setAttribute("transform", `translate(${newXPos}, ${newNoteYPos})`);

    // Replace with new note
    this.svgRendererInstance.getLayerByName("notes").replaceChild(res.noteGroup, noteEntry.gElement);

    // Replace place in list with new note data
    this.noteEntries[noteIndex] = {
      gElement: res.noteGroup,
      note: noteObj,
      xPos: newXPos,
      yPos: newNoteYPos,
      accidentalXOffset: res.accidentalOffset
    };
  };

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

  applyClassToNoteByIndex(className: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteEntry = this.noteEntries[noteIndex];

    noteEntry.gElement.classList.add(className);
  }

  removeClassToNoteByIndex(className: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteEntry = this.noteEntries[noteIndex];

    noteEntry.gElement.classList.remove(className);
  }

  destroy() {
    this.svgRendererInstance.destroy();
  }
}