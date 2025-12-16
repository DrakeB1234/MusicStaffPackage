import { ACCIDENTAL_OFFSET_X, HALF_NOTEHEAD_WIDTH, NOTE_LAYER_START_X, NOTEHEAD_STEM_HEIGHT, STAFF_LINE_SPACING } from "../constants";
import { getNameOctaveIdx, parseNoteString } from "../helpers/notehelpers";
import GrandStaffStrategy from "../strategies/GrandStaffStrategy";
import SingleStaffStrategy from "../strategies/SingleStaffStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { NoteObj, StaffTypes } from "../types";
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

type NoteEntry = {
  gElement: SVGGElement;
  note: NoteObj;
  xPos: number;
  yPos: number;
}

const NOTE_SPACING = 28;
const CHORD_MAX_CONSECUTIVE_ACCIDENTALS = 3;

export default class MusicStaff {
  private rendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private options: Required<MusicStaffOptions>;

  private noteEntries: NoteEntry[] = [];
  private noteCursorX: number = 0;

  private wrongNoteGroupUi: SVGGElement | null = null;

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

    this.rendererInstance = new SVGRenderer(rootElementCtx, {
      width: this.options.width,
      height: 100,
      scale: this.options.scale,
      staffColor: this.options.staffColor,
      staffBackgroundColor: this.options.staffBackgroundColor
    });
    const rootSvgElement = this.rendererInstance.rootSvgElement;

    switch (this.options.staffType) {
      case "grand":
        this.strategyInstance = new GrandStaffStrategy(this.rendererInstance, "grand");
        break;
      case "bass":
        this.strategyInstance = new SingleStaffStrategy(this.rendererInstance, "bass");
        break;
      case "treble":
        this.strategyInstance = new SingleStaffStrategy(this.rendererInstance, "treble");
        break;
      case "alto":
        this.strategyInstance = new SingleStaffStrategy(this.rendererInstance, "alto");
        break;
      default:
        throw new Error(`The staff type ${this.options.staffType} is not supported. Please use "treble", "bass", "alto", or "grand".`);
    };
    this.strategyInstance.drawStaff(this.options.width);

    // Determine spacing positioning
    if (this.options.spaceAbove) {
      const yOffset = this.options.spaceAbove * (STAFF_LINE_SPACING);
      this.rendererInstance.addTotalRootSvgYOffset(yOffset);
    }
    if (this.options.spaceBelow) {
      let height = this.options.spaceBelow * (STAFF_LINE_SPACING);
      // Due to how different grand staff is setup, handle edge case of bottom spacing
      if (this.options.staffType === "grand") height -= (STAFF_LINE_SPACING / 2)
      this.rendererInstance.addTotalRootSvgHeight(height);
    }

    // Commit to DOM for one batch operation
    this.rendererInstance.applySizingToRootSvg();
    this.rendererInstance.commitElementsToDOM(rootSvgElement);
  }

  private drawStem(noteGroup: SVGGElement, noteFlip: boolean) {
    if (noteFlip) {
      this.rendererInstance.drawLine(0, 0, 0, NOTEHEAD_STEM_HEIGHT, noteGroup);
    }
    else {
      this.rendererInstance.drawLine(HALF_NOTEHEAD_WIDTH, 0, HALF_NOTEHEAD_WIDTH, -NOTEHEAD_STEM_HEIGHT, noteGroup);
    }
  }

  // Handles drawing the glyphs to internal group, applies the xPositioning to note Cursor X
  private renderNote(note: NoteObj, ySpacing: number): {
    noteGroup: SVGGElement;
    xOffset: number;
  } {
    const noteGroup = this.rendererInstance.createGroup("note");
    let noteFlip = false;

    switch (note.duration) {
      case "h":
        this.rendererInstance.drawGlyph("NOTE_HEAD_HALF", noteGroup);
        noteFlip = this.strategyInstance.shouldNoteFlip(ySpacing);
        this.drawStem(noteGroup, noteFlip);
        break;
      case "q":
        this.rendererInstance.drawGlyph("NOTE_HEAD_QUARTER", noteGroup);
        noteFlip = this.strategyInstance.shouldNoteFlip(ySpacing);
        this.drawStem(noteGroup, noteFlip);
        break;
      case "e":
        noteFlip = this.strategyInstance.shouldNoteFlip(ySpacing);
        if (noteFlip) this.rendererInstance.drawGlyph("EIGHTH_NOTE_FLIPPED", noteGroup);
        else this.rendererInstance.drawGlyph("EIGHTH_NOTE", noteGroup);
        break;
      default:
        this.rendererInstance.drawGlyph("NOTE_HEAD_WHOLE", noteGroup);
    };

    // Draw accidental, add its offset
    let xOffset = 0;
    switch (note.accidental) {
      case "#":
        this.rendererInstance.drawGlyph("ACCIDENTAL_SHARP", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X;
        break;
      case "b":
        this.rendererInstance.drawGlyph("ACCIDENTAL_FLAT", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X;
        break;
    }

    // Strategy returns coords of expected ledger lines, this class will handle drawing them.
    const ledgerLines = this.strategyInstance.getLedgerLinesX({
      name: note.name,
      octave: note.octave,
      duration: note.duration
    }, ySpacing);
    ledgerLines.forEach(e => {
      this.rendererInstance.drawLine(e.x1, e.yPos, e.x2, e.yPos, noteGroup);
    });

    return {
      noteGroup: noteGroup,
      xOffset: xOffset
    };
  }

  private chordOffsetConsecutiveAccidentals(notes: NoteEntry[]): number {
    let consecutiveXOffset = 0;
    let maxConsecutiveXOffset = 0;
    let currentAccidentalCount = 0;
    for (let i = 0; i < notes.length; i++) {
      const currNote = notes[i];

      if (currNote.note.accidental && currentAccidentalCount < CHORD_MAX_CONSECUTIVE_ACCIDENTALS) {
        consecutiveXOffset += ACCIDENTAL_OFFSET_X;
        maxConsecutiveXOffset = Math.min(maxConsecutiveXOffset, consecutiveXOffset);
        currentAccidentalCount++;
      }
      else if (currNote.note.accidental && currentAccidentalCount <= CHORD_MAX_CONSECUTIVE_ACCIDENTALS) {
        consecutiveXOffset = ACCIDENTAL_OFFSET_X
        currentAccidentalCount = 1;
      }
      else {
        consecutiveXOffset = 0
        currentAccidentalCount = 0;
      };

      if (consecutiveXOffset !== 0) {
        const useElements = Array.from(currNote.gElement.getElementsByTagName("use"));
        const accidentalElement = useElements.find(e => e.getAttribute("href")?.includes("ACCIDENTAL"));
        if (!accidentalElement) continue;
        // The additional accidental being added here is due to the offset being baked into the glyph, so the first accidental is applied
        accidentalElement.setAttribute("transform", `translate(${consecutiveXOffset + -ACCIDENTAL_OFFSET_X}, 0)`);
      }
    }

    return -maxConsecutiveXOffset;
  }

  private chordOffsetCloseNotes(notes: NoteEntry[]): number {
    // Loop starts at index 1, due to the first note never being offset
    let prevNote: NoteEntry = notes[0];
    let closeNotesXOffset = 0;
    for (let i = 1; i < notes.length; i++) {
      const currNote = notes[i];
      const nameDiff = getNameOctaveIdx(currNote.note.name, currNote.note.octave) - getNameOctaveIdx(prevNote.note.name, prevNote.note.octave);

      if (nameDiff === 1) {
        closeNotesXOffset = NOTE_SPACING / 2
        currNote.gElement.setAttribute("transform", `translate(${closeNotesXOffset}, ${currNote.yPos})`);

        // If accidental, offset it
        const useElements = Array.from(currNote.gElement.getElementsByTagName("use"));
        const accidentalElement = useElements.find(e => e.getAttribute("href")?.includes("ACCIDENTAL"));
        if (accidentalElement) {
          const matches = accidentalElement.getAttribute("transform")?.match(/([-]?\d+)/);
          const currentXOffset = matches && matches[0];
          let newXPos = -closeNotesXOffset;
          if (currentXOffset) newXPos += Number(currentXOffset);
          accidentalElement.setAttribute("transform", `translate(${newXPos}, 0)`);
        }

        i++;
        prevNote = notes[i];
        continue;
      }

      prevNote = currNote;
    }

    return closeNotesXOffset;
  }

  /**
   * @param {string | string[]} notes - The musical note to be drawn on the staff. Can pass an array for multiple notes at a time.
   * @description A string representing a single musical note, structured as:
   * `C#4w` == `<PITCH><OCTAVE><DURATION><MODIFIER>`
  */
  drawNote(notes: string | string[]) {
    // Normalizes input by converting a single string into an array
    const normalizedNotesArray = Array.isArray(notes) ? notes : [notes];
    const notesLayer = this.rendererInstance.getLayerByName("notes");

    const noteGroups: SVGGElement[] = [];
    for (const noteString of normalizedNotesArray) {
      let noteObj: NoteObj | undefined;
      try {
        noteObj = parseNoteString(noteString);
      }
      catch (error) {
        if (noteGroups.length > 0) this.rendererInstance.commitElementsToDOM(noteGroups, notesLayer);
        throw error;
      };

      const yPos = this.strategyInstance.calculateNoteYPos({
        name: noteObj.name,
        octave: noteObj.octave
      });
      // Handle note rendering
      const res = this.renderNote(noteObj, yPos);
      res.noteGroup.setAttribute("transform", `translate(${this.noteCursorX + res.xOffset}, ${yPos})`);
      this.noteEntries.push({
        gElement: res.noteGroup,
        note: noteObj,
        xPos: this.noteCursorX + res.xOffset,
        yPos: yPos
      });

      this.noteCursorX += NOTE_SPACING + res.xOffset;
      noteGroups.push(res.noteGroup);
    }

    // Commit the newly created note/notes element to the 'notes' layer
    this.rendererInstance.commitElementsToDOM(noteGroups, notesLayer);
  }

  // Bugs: JustifyNotes does not position chord group correctly. When stem note is used, the note can flip, causing weird looking chord
  drawChord(notes: string | string[]) {
    const normalizedNotesArray = Array.isArray(notes) ? notes : [notes];
    if (normalizedNotesArray.length < 2) throw new Error("Provide more than one note for a chord.");

    const notesLayer = this.rendererInstance.getLayerByName("notes");
    const noteObjs: NoteEntry[] = [];

    const chordGroup = this.rendererInstance.createGroup("chord");
    for (const noteString of normalizedNotesArray) {
      const noteObj: NoteObj = parseNoteString(noteString);

      const yPos = this.strategyInstance.calculateNoteYPos({
        name: noteObj.name,
        octave: noteObj.octave
      });
      const res = this.renderNote(noteObj, yPos);
      res.noteGroup.setAttribute("transform", `translate(0, ${yPos})`);

      chordGroup.appendChild(res.noteGroup);
      noteObjs.push({
        gElement: res.noteGroup,
        note: noteObj,
        yPos: yPos,
        xPos: 0
      });
    };

    // Chcek / apply offset from accidentals
    const accidentalXOffset = this.chordOffsetConsecutiveAccidentals(noteObjs);
    const closeNotesXOffset = this.chordOffsetCloseNotes(noteObjs);

    // Apply XPos to chord parent
    chordGroup.setAttribute("transform", `translate(${this.noteCursorX + accidentalXOffset}, 0)`);

    this.noteEntries.push({
      gElement: chordGroup,
      note: parseNoteString(normalizedNotesArray[0]),
      xPos: this.noteCursorX,
      yPos: 0
    });

    // Increment note cursor due to renderNote function being overriden X pos
    this.noteCursorX += NOTE_SPACING + accidentalXOffset + closeNotesXOffset;

    // Commit the newly created note/notes element to the 'notes' layer
    this.rendererInstance.commitElementsToDOM(chordGroup, notesLayer);
  }

  // Gets all current notes on staff and evenly spaces them
  justifyNotes() {
    const containerWidth = this.options.width - NOTE_LAYER_START_X;
    const notesCount = this.noteEntries.length;
    if (notesCount <= 0 || containerWidth <= 0) return;
    const noteSpacing = Math.round(containerWidth / notesCount);

    let cursorX = 0;
    if (notesCount === 1) {
      this.noteEntries[0].gElement.setAttribute("transform", `translate(${containerWidth / 2 - NOTE_LAYER_START_X}, ${this.noteEntries[0].yPos})`);
      return;
    }
    this.noteEntries.forEach((e) => {
      // Chord parent is not translated, therefore don't adjust its Y pos
      // X POS IS OFF, FIX
      if (e.gElement.classList.contains("chord")) {
        e.gElement.setAttribute("transform", `translate(${cursorX}, 0)`);
      }
      else {
        e.gElement.setAttribute("transform", `translate(${cursorX}, ${e.yPos})`);
      }
      cursorX += noteSpacing;
    });
  }

  clearAllNotes() {
    this.noteCursorX = 0;

    this.rendererInstance.getLayerByName("notes").replaceChildren();
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

    // Determermines new offset based off the previous note diff in accidental to the new note
    let accidentalXPosOffset = 0;
    if (noteEntry.note.accidental && !noteObj.accidental) {
      accidentalXPosOffset = ACCIDENTAL_OFFSET_X;
    }
    else if (!noteEntry.note.accidental && noteObj.accidental) {
      accidentalXPosOffset = -ACCIDENTAL_OFFSET_X;
    }

    // Remove previous note elements then render new one in same x positioning
    noteEntry.gElement.remove();
    const res = this.renderNote(noteObj, newNoteYPos);
    res.noteGroup.setAttribute("transform", `translate(${noteEntry.xPos + accidentalXPosOffset}, ${newNoteYPos})`);

    // Replace in place old entry with new
    this.noteEntries[noteIndex] = {
      gElement: res.noteGroup,
      note: noteObj,
      xPos: noteEntry.xPos + accidentalXPosOffset,
      yPos: newNoteYPos
    };

    this.rendererInstance.commitElementsToDOM(res.noteGroup, this.rendererInstance.getLayerByName("notes"));
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

  // Class applied is wrong-note, which can be css selected
  showWrongNoteUIByNoteIndex(note: string, noteIndex: number) {
    if (noteIndex >= this.noteEntries.length) throw new Error("Note index was out of bounds.");
    const noteObj = parseNoteString(note);
    const ySpacing = this.strategyInstance.calculateNoteYPos({
      name: noteObj.name,
      octave: noteObj.octave
    });

    const noteEntry = this.noteEntries[noteIndex];
    const uiLayer = this.rendererInstance.getLayerByName("ui");

    // If wrong note g doesn't exist, then create it
    if (!this.wrongNoteGroupUi) {
      const group = this.rendererInstance.createGroup("wrong-note-ui");
      this.rendererInstance.drawGlyph("NOTE_HEAD_QUARTER", group);
      group.setAttribute("transform", `translate(${noteEntry.xPos + NOTE_LAYER_START_X}, ${ySpacing})`);
      this.wrongNoteGroupUi = group;

      this.wrongNoteGroupUi.classList.add("show");
      this.rendererInstance.commitElementsToDOM(group, uiLayer);
    }
    else {
      this.wrongNoteGroupUi.classList.add("show");
      this.wrongNoteGroupUi.setAttribute("transform", `translate(${noteEntry.xPos + NOTE_LAYER_START_X}, ${ySpacing})`);
    }
  };

  hideWrongNoteUI() {
    if (!this.wrongNoteGroupUi) throw new Error("Wrong note UI was never created, so it cannot be hidden.");

    this.wrongNoteGroupUi.classList.remove("show");
  }
}