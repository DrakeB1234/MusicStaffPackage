import { NAMESPACE, NOTE_LAYER_START_X, STAFF_LINE_SPACING } from "../constants";
import type { GlyphNames } from "../glyphs";
import GrandStaffStrategy from "../strategies/GrandStaffStrategy";
import SingleStaffStrategy from "../strategies/SingleStaffStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { StaffTypes } from "../types";
import NoteRenderer from "./NoteRenderer";
import SVGRenderer from "./SVGRenderer";

export type ScrollingStaffOptions = {
  width?: number;
  scale?: number;
  staffType?: StaffTypes;
  spaceAbove?: number;
  spaceBelow?: number;
  staffColor?: string;
  staffBackgroundColor?: string;
  onNotesOut?: () => void;
};

const USE_GLPYHS: GlyphNames[] = [
  "CLEF_TREBLE", "CLEF_BASS", "CLEF_ALTO",
  "NOTE_HEAD_WHOLE", "NOTE_HEAD_HALF", "NOTE_HEAD_QUARTER", "EIGHTH_NOTE", "EIGHTH_NOTE_FLIPPED",
  "ACCIDENTAL_SHARP", "ACCIDENTAL_FLAT", "ACCIDENTAL_NATURAL", "ACCIDENTAL_DOUBLE_SHARP", "ACCIDENTAL_DOUBLE_FLAT"
];

export type NoteSequence = (string | string[])[];

type BufferedEntry = {
  type: "note" | "chord";
  notes: string[];
}

type ActiveEntry = {
  noteWrapper: SVGGElement;
  xPos: number;
}

const SCROLLING_NOTE_SPACING = 60;
const SPAWN_X_OFFSET = SCROLLING_NOTE_SPACING;

export default class ScrollingStaff {
  private svgRendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private noteRendererInstance: NoteRenderer;

  private options: Required<ScrollingStaffOptions>;

  private activeEntries: ActiveEntry[] = [];
  private noteBuffer: BufferedEntry[] = [];

  private notesLayer: SVGGElement;

  private noteCursorX: number = 0;

  /**
   * Creates an instance of a ScrollingStaff, A single staff that takes in a queue of notes that can be advanced with in a 'endless' style of staff.
   *
   * @param rootElementCtx - The element (div) reference that will append the music staff elements to.
   * @param options - Optional configuration settings. All config options are in the type ScrollingStaffOptions
  */
  constructor(rootElementCtx: HTMLElement, options?: ScrollingStaffOptions) {
    this.options = {
      width: 300,
      scale: 1,
      staffType: "treble",
      spaceAbove: 0,
      spaceBelow: 0,
      staffColor: "black",
      staffBackgroundColor: "transparent",
      ...options
    } as Required<ScrollingStaffOptions>;

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

    // Add class for transition css animation IF provided
    this.notesLayer = this.svgRendererInstance.getLayerByName("notes");
    this.notesLayer.classList.add(`${NAMESPACE}-scrolling-notes-layer`);

    // Commit to DOM for one batch operation
    this.svgRendererInstance.applySizingToRootSvg();
    this.svgRendererInstance.commitElementsToDOM(rootSvgElement);
  }

  private renderFirstNoteGroups() {
    // Calculate the cutoff point for visible notes, keep rendering notes until the cursor overreaches bounds + offset
    const maxVisibleX = (this.options.width - NOTE_LAYER_START_X) + SPAWN_X_OFFSET;

    while (this.noteBuffer.length > 0 && this.noteCursorX < maxVisibleX) {
      this.renderNextNote();

      this.noteCursorX += SCROLLING_NOTE_SPACING;
    }

    // Removed the lastly applied noteCurorX increment, due to the final op in while loop incrementing cursor
    if (this.activeEntries.length > 1) this.noteCursorX -= SCROLLING_NOTE_SPACING;
  }

  private renderNextNote() {
    if (this.noteBuffer.length < 1) return;

    const nextNoteInBuffer = this.noteBuffer[0];
    const noteWrapper = this.svgRendererInstance.createGroup("note-wrapper");

    if (nextNoteInBuffer.type === "chord") {
      const res = this.noteRendererInstance.renderChord(nextNoteInBuffer.notes);
      res.noteGroup.setAttribute("transform", `translate(0, ${res.noteYPos})`);
      noteWrapper.appendChild(res.noteGroup);

    } else {
      const res = this.noteRendererInstance.renderNote(nextNoteInBuffer.notes[0]);
      res.noteGroup.setAttribute("transform", `translate(0, ${res.noteYPos})`);
      noteWrapper.appendChild(res.noteGroup);
    };

    // The note cursor at this stage will be placed at the last spawned position
    noteWrapper.style.transform = `translate(${this.noteCursorX}px, 0px)`;

    // Add current rendered note to active drawn notes, remove from buffer
    this.activeEntries.push({
      noteWrapper: noteWrapper,
      xPos: this.noteCursorX,
    });
    this.noteBuffer.shift();

    this.notesLayer.appendChild(noteWrapper);
  }

  /**
   * Adds notes to the queue for scrolling staff. Clears any previously added notes.
   * @param notes - A array of note strings or sub-arrays of strings.
   * * A single string will draw a single note `C#4w`
   * * A sub-array will draw a chord `["C4w", "E4w", "G4w"]`
   * 
   * Note string format
   * * **Root**: (A-G)
   * * **Accidental** (Optional): `#` (sharp) `b` (flat) `n` (natural) `##` (double sharp) or `bb` (double flat).
   * * **Octave**: The octave number (e.g., `4`).
   * * **Duration** (Optional): `w` (whole) `h` (half) `q` (quarter) or `e` (eighth). Defaults to `w` if duration is omitted
   * @param noteIndex The index of the note that will replaced by the specified note.
   * @returns void
   * @throws {Error} If the index provided is out of bounds, or if a note string is not correct format.
   * 
   * * @example
   * // Queues a few single notes, followed by a C chord
   * queueNotes("Bb3q", "C4w", "G4q", ["C4w", "E4w", "G4w"]);
  */
  queueNotes(notes: NoteSequence) {
    this.clearAllNotes();
    for (const entry of notes) {
      if (Array.isArray(entry)) {
        this.noteBuffer.push({
          type: "chord",
          notes: entry
        });
      } else {
        this.noteBuffer.push({
          type: "note",
          notes: [entry]
        });
      }
    }

    this.renderFirstNoteGroups();
  }

  /**
   * Advances to the next note in sequence, if theres any remaining notes left.
   * @returns void
   * @callback onNotesOut passed in from the constructor options once notes are out.
  */
  advanceNotes() {
    if (this.activeEntries.length <= 0) {
      this.clearAllNotes();
      if (this.options.onNotesOut) this.options.onNotesOut();
      return;
    };

    this.activeEntries.forEach(e => {
      e.xPos -= SCROLLING_NOTE_SPACING;
      e.noteWrapper.style.transform = `translate(${e.xPos}px, 0px)`;
    });

    const firstActiveNote = this.activeEntries[0];
    if (firstActiveNote.xPos <= 0) {
      this.notesLayer.removeChild(firstActiveNote.noteWrapper);
      this.activeEntries.shift();
    }
    this.renderNextNote();
  }

  /**
   * Clears staff of notes and resets internal positioning.
   * @returns void
  */
  clearAllNotes() {
    this.noteCursorX = 0;

    this.notesLayer.replaceChildren();
    this.activeEntries = [];
    this.noteBuffer = [];
  }

  /**
   * Removes the root svg element and cleans up arrays.
   * @returns void
  */
  destroy() {
    this.svgRendererInstance.destroy();
    this.activeEntries = [];
    this.noteBuffer = [];
  }
}