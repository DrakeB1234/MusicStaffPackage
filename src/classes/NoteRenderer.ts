import { ACCIDENTAL_OFFSET_X, CHORD_MAX_CONSECUTIVE_ACCIDENTALS, DOUBLE_FLAT_ACCIDENTAL_OFFSET_X, DOUBLE_SHARP_ACCIDENTAL_OFFSET_X, HALF_NOTEHEAD_WIDTH, NOTE_SPACING, NOTEHEAD_STEM_HEIGHT } from "../constants";
import { getNameOctaveIdx, parseNoteString } from "../helpers/notehelpers";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { NoteObj } from "../types";
import type SVGRenderer from "./SVGRenderer";

export type NoteEntry = {
  gElement: SVGGElement;
  note: NoteObj;
  xPos: number;
  yPos: number;
  accidentalXOffset: number;
};

/**
 * @param {SVGGElement} noteGroup - The group that is returned from renderNote or renderGroup
 * @param {number} accidentalOffset - The total xOffset from any accidentals from a note. Chords could have a 1..3 of these offsets
 * @param {number} cursorOffset - The requested amount the cursor should be offset. Chords use this when a note is close and offsetted to the left.
*/
type RenderNoteReturn = {
  noteGroup: SVGGElement;
  accidentalOffset: number;
  cursorOffset: number;
}

// This class handles drawing the notes, has a ref to the active strategy (single staffs position notes different than double staff (grand))
export default class NoteRenderer {
  private svgRendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;

  constructor(svgRenderer: SVGRenderer, strategy: StaffStrategy) {
    this.svgRendererInstance = svgRenderer;
    this.strategyInstance = strategy;
  }

  private drawStem(noteGroup: SVGGElement, noteFlip: boolean) {
    if (noteFlip) {
      this.svgRendererInstance.drawLine(0, 0, 0, NOTEHEAD_STEM_HEIGHT, noteGroup);
    }
    else {
      this.svgRendererInstance.drawLine(HALF_NOTEHEAD_WIDTH, 0, HALF_NOTEHEAD_WIDTH, -NOTEHEAD_STEM_HEIGHT, noteGroup);
    }
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

  // Handles drawing the glyphs to internal group, applies the xPositioning to note Cursor X
  renderNote(note: NoteObj, ySpacing: number): RenderNoteReturn {
    const noteGroup = this.svgRendererInstance.createGroup("note");
    let noteFlip = this.strategyInstance.shouldNoteFlip(ySpacing);

    switch (note.duration) {
      case "h":
        this.svgRendererInstance.drawGlyph("NOTE_HEAD_HALF", noteGroup);
        this.drawStem(noteGroup, noteFlip);
        break;
      case "q":
        this.svgRendererInstance.drawGlyph("NOTE_HEAD_QUARTER", noteGroup);
        this.drawStem(noteGroup, noteFlip);
        break;
      case "e":
        if (noteFlip) this.svgRendererInstance.drawGlyph("EIGHTH_NOTE_FLIPPED", noteGroup);
        else this.svgRendererInstance.drawGlyph("EIGHTH_NOTE", noteGroup);
        break;
      default:
        this.svgRendererInstance.drawGlyph("NOTE_HEAD_WHOLE", noteGroup);
    };

    // Draw accidental, add its offset
    let xOffset = 0;
    switch (note.accidental) {
      case "#":
        this.svgRendererInstance.drawGlyph("ACCIDENTAL_SHARP", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X;
        break;
      case "b":
        this.svgRendererInstance.drawGlyph("ACCIDENTAL_FLAT", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X;
        break;
      case "n":
        this.svgRendererInstance.drawGlyph("ACCIDENTAL_NATURAL", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X;
        break;
      case "##":
        this.svgRendererInstance.drawGlyph("ACCIDENTAL_DOUBLE_SHARP", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X + DOUBLE_SHARP_ACCIDENTAL_OFFSET_X;
        break;
      case "bb":
        this.svgRendererInstance.drawGlyph("ACCIDENTAL_DOUBLE_FLAT", noteGroup);
        xOffset -= ACCIDENTAL_OFFSET_X + DOUBLE_FLAT_ACCIDENTAL_OFFSET_X;
        break;
    }

    // Strategy returns coords of expected ledger lines, this class will handle drawing them.
    const ledgerLines = this.strategyInstance.getLedgerLinesX({
      name: note.name,
      octave: note.octave,
      duration: note.duration
    }, ySpacing);
    ledgerLines.forEach(e => {
      this.svgRendererInstance.drawLine(e.x1, e.yPos, e.x2, e.yPos, noteGroup);
    });

    return {
      noteGroup: noteGroup,
      accidentalOffset: xOffset,
      cursorOffset: 0
    };
  }

  // Applies Y pos to notes in a single chord group
  renderChord(notes: string[]): RenderNoteReturn {
    const chordGroup = this.svgRendererInstance.createGroup("chord");
    const noteObjs: NoteEntry[] = [];

    for (const noteString of notes) {
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
        xPos: 0,
        yPos: yPos,
        accidentalXOffset: 0
      });
    };

    // Chcek / apply offset from accidentals
    const accidentalXOffset = this.chordOffsetConsecutiveAccidentals(noteObjs);
    const closeNotesXOffset = this.chordOffsetCloseNotes(noteObjs);

    return {
      noteGroup: chordGroup,
      accidentalOffset: accidentalXOffset,
      cursorOffset: closeNotesXOffset
    }
  }
}