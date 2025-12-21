import { ACCIDENTAL_OFFSET_X, CHORD_MAX_CONSECUTIVE_ACCIDENTALS, DOUBLE_FLAT_ACCIDENTAL_OFFSET_X, DOUBLE_SHARP_ACCIDENTAL_OFFSET_X, HALF_NOTEHEAD_WIDTH, NOTE_SPACING, NOTEHEAD_STEM_HEIGHT } from "../constants";
import { getNameOctaveIdx, parseNoteString } from "../helpers/notehelpers";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import type { NoteObj } from "../types";
import type SVGRenderer from "./SVGRenderer";

/**
 * @param {SVGGElement} noteGroup - The group that is returned from renderNote or renderGroup
 * @param {NoteObj} noteObj - The parse note string into NoteObj
 * @param {number} noteYPos - The Y pos of the notes group
 * @param {number} accidentalOffset - The total xOffset from any accidentals from a note. Chords could have a 1..3 of these offsets
 * @param {number} cursorOffset - The requested amount the cursor should be offset. Chords use this when a note is close and offsetted to the left.
*/
export type RenderNoteReturn = {
  noteGroup: SVGGElement;
  noteObj: NoteObj;
  noteYPos: number;
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

  private chordOffsetConsecutiveAccidentals(notes: RenderNoteReturn[]): number {
    let consecutiveXOffset = 0;
    let maxConsecutiveXOffset = 0;
    let currentAccidentalCount = 0;
    for (let i = 0; i < notes.length; i++) {
      const currNote = notes[i];

      if (currNote.noteObj.accidental && currentAccidentalCount < CHORD_MAX_CONSECUTIVE_ACCIDENTALS) {
        consecutiveXOffset += ACCIDENTAL_OFFSET_X;
        maxConsecutiveXOffset = Math.min(maxConsecutiveXOffset, consecutiveXOffset);
        currentAccidentalCount++;
      }
      else if (currNote.noteObj.accidental && currentAccidentalCount <= CHORD_MAX_CONSECUTIVE_ACCIDENTALS) {
        consecutiveXOffset = ACCIDENTAL_OFFSET_X
        currentAccidentalCount = 1;
      }
      else {
        consecutiveXOffset = 0
        currentAccidentalCount = 0;
      };

      if (consecutiveXOffset !== 0) {
        const useElements = Array.from(currNote.noteGroup.getElementsByTagName("use"));
        const accidentalElement = useElements.find(e => e.getAttribute("href")?.includes("ACCIDENTAL"));
        if (!accidentalElement) continue;
        // The additional accidental being added here is due to the offset being baked into the glyph, so the first accidental is applied
        accidentalElement.setAttribute("transform", `translate(${consecutiveXOffset + -ACCIDENTAL_OFFSET_X}, 0)`);
      }
    }

    return -maxConsecutiveXOffset;
  }

  private chordOffsetCloseNotes(notes: RenderNoteReturn[]): number {
    // Loop starts at index 1, due to the first note never being offset
    let prevNote: RenderNoteReturn = notes[0];
    let closeNotesXOffset = 0;
    for (let i = 1; i < notes.length; i++) {
      const currNote = notes[i];
      const nameDiff = getNameOctaveIdx(currNote.noteObj.name, currNote.noteObj.octave) - getNameOctaveIdx(prevNote.noteObj.name, prevNote.noteObj.octave);

      if (nameDiff === 1) {
        closeNotesXOffset = NOTE_SPACING / 2
        currNote.noteGroup.setAttribute("transform", `translate(${closeNotesXOffset}, ${currNote.noteYPos})`);

        // If accidental, offset it
        const useElements = Array.from(currNote.noteGroup.getElementsByTagName("use"));
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
  renderNote(noteString: string): RenderNoteReturn {
    const noteGroup = this.svgRendererInstance.createGroup("note");

    const noteObj = parseNoteString(noteString);
    const yPos = this.strategyInstance.calculateNoteYPos({
      name: noteObj.name,
      octave: noteObj.octave
    });
    let noteFlip = this.strategyInstance.shouldNoteFlip(yPos);

    switch (noteObj.duration) {
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
    switch (noteObj.accidental) {
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
    const ledgerLines = this.strategyInstance.getLedgerLinesX(noteObj, yPos);
    ledgerLines.forEach(e => {
      this.svgRendererInstance.drawLine(e.x1, e.yPos, e.x2, e.yPos, noteGroup);
    });

    return {
      noteGroup: noteGroup,
      noteObj: noteObj,
      noteYPos: yPos,
      accidentalOffset: xOffset,
      cursorOffset: 0
    };
  }

  renderChord(notes: string[]): RenderNoteReturn {
    const chordGroup = this.svgRendererInstance.createGroup("chord");
    const noteObjs: RenderNoteReturn[] = [];

    for (const noteString of notes) {
      const res = this.renderNote(noteString);
      res.noteGroup.setAttribute("transform", `translate(0, ${res.noteYPos})`);

      chordGroup.appendChild(res.noteGroup);
      noteObjs.push({
        noteGroup: res.noteGroup,
        noteObj: res.noteObj,
        noteYPos: res.noteYPos,
        cursorOffset: 0,
        accidentalOffset: 0
      });
    };

    // Chcek / apply offset from accidentals
    const accidentalXOffset = this.chordOffsetConsecutiveAccidentals(noteObjs);
    const closeNotesXOffset = this.chordOffsetCloseNotes(noteObjs);

    return {
      noteGroup: chordGroup,
      noteObj: noteObjs[0].noteObj,
      noteYPos: 0,
      accidentalOffset: accidentalXOffset,
      cursorOffset: closeNotesXOffset
    }
  }
}