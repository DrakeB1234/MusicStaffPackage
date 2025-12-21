import { NOTE_SPACING, STAFF_LINE_SPACING } from "../constants";
import type { GlyphNames } from "../glyphs";
import GrandStaffStrategy from "../strategies/GrandStaffStrategy";
import SingleStaffStrategy from "../strategies/SingleStaffStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { StaffTypes } from "../types";
import NoteRenderer from "./NoteRenderer";
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

export type NoteSequence = (string | string[])[];

type BufferedEntry = {
  type: "note" | "chord";
  notes: string[];
}

type ActiveEntry = {
  gElement: SVGGElement;
  xPos: number;
}

const SCROLLING_NOTE_SPACING = 40;

export default class ScrollingStaff {
  private svgRendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private noteRendererInstance: NoteRenderer;

  private options: Required<MusicStaffOptions>;

  private activeEntries: ActiveEntry[] = [];
  private noteBuffer: BufferedEntry[] = [];

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

  private renderFirstNoteGroups() {
    const noteLayer = this.svgRendererInstance.getLayerByName("notes");

    this.noteBuffer.forEach(e => {
      if (e.type === "chord") {
        const res = this.noteRendererInstance.renderChord(e.notes);
        res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);
        this.noteCursorX += SCROLLING_NOTE_SPACING + res.cursorOffset;

        this.activeEntries.push({
          gElement: res.noteGroup,
          xPos: this.noteCursorX,
        });
      }
      else {
        const res = this.noteRendererInstance.renderNote(e.notes[0]);
        res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX}, ${res.noteYPos})`);
        this.noteCursorX += SCROLLING_NOTE_SPACING;

        this.activeEntries.push({
          gElement: res.noteGroup,
          xPos: this.noteCursorX,
        });
      }
    });
    console.log(this.activeEntries)

    this.svgRendererInstance.commitElementsToDOM(this.activeEntries.map(e => e.gElement), noteLayer);
  }

  queueNotes(notes: NoteSequence) {
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

  clearAllNotes() {
    this.noteCursorX = 0;

    this.svgRendererInstance.getLayerByName("notes").replaceChildren();
    this.activeEntries = [];
    this.noteBuffer = [];
  }

  destroy() {
    this.svgRendererInstance.destroy();
  }
}