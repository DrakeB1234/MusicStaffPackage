import { durationBeatValueMap, HALF_NOTEHEAD_WIDTH, NOTE_LAYER_START_X, NOTEHEAD_STEM_HEIGHT, STAFF_LINE_SPACING } from "../constants";
import type { GlyphNames } from "../glyphs";
import { parseDurationNoteString } from "../helpers/notehelpers";
import type { Durations } from "../types";
import SVGRenderer from "./SVGRenderer";

export type RhythmStaffOptions = {
  width?: number;
  scale?: number;
  topNumber?: number;
  barsCount?: number;
  spaceAbove?: number;
  spaceBelow?: number;
  staffColor?: string;
  staffBackgroundColor?: string;
  currentBeatUIColor?: string;
};

// Applies to top and bottom
const STAFF_SPACING = 30;
const TIME_SIGNATURE_HEIGHT = 19;
const BAR_SPACING = 12;

const BEAM_LINE_HEIGHT = 4;
const BEAM_LINE_Y_OFFSET = 6;

// STAFF RIGHT SPACING TO PREVENT EIGTH NOTES FROM OVERFLOWING
const STAFF_RIGHT_PADDING = 1;

const CURRENT_BEAT_UI_START_X_POS = NOTE_LAYER_START_X;

const USE_GLPYHS: GlyphNames[] = [
  "TIME_4", "TIME_3",
  "NOTE_HEAD_WHOLE", "NOTE_HEAD_HALF", "NOTE_HEAD_QUARTER", "EIGHTH_NOTE",
  "REST_WHOLE", "REST_HALF", "REST_QUARTER", "REST_EIGHTH"
];

export default class RhythmStaff {
  private rendererInstance: SVGRenderer;
  private options: Required<RhythmStaffOptions>;

  private barSpacing: number;
  private quarterNoteSpacing: number;
  private noteCursorX: number = 0;
  private noteEntries: SVGGElement[] = [];

  private maxBeatCount: number;
  private currentBeatCount: number = 0;

  private currentBeatUICount: number = 0;
  private currentBeatUIElement: SVGRectElement | null = null;
  private currentBeatUIXPos: number = CURRENT_BEAT_UI_START_X_POS;

  /**
   * Creates an instance of a RhythmStaff, A single staff that will automatically apply positioning of elements based on the duration of a note.
   *
   * @param rootElementCtx - The element (div) reference that will append the music staff elements to.
   * @param options - Optional configuration settings. All config options are in the type RhythmStaffOptions
   * @throws {Error} - If top number is not 3 or 4 OR if bars count is not between 1 - 3. These are the currently only supported values.
  */
  constructor(rootElementCtx: HTMLElement, options?: RhythmStaffOptions) {
    this.options = {
      width: 300,
      scale: 1,
      topNumber: 4,
      barsCount: 2,
      spaceAbove: 0,
      spaceBelow: 0,
      staffColor: "black",
      staffBackgroundColor: "white",
      currentBeatUIColor: "#24ff7450",
      ...options
    } as Required<RhythmStaffOptions>;

    this.rendererInstance = new SVGRenderer(rootElementCtx, {
      width: this.options.width,
      height: 100,
      scale: this.options.scale,
      staffColor: this.options.staffColor,
      staffBackgroundColor: this.options.staffBackgroundColor,
      useGlyphs: USE_GLPYHS
    });
    const rootSvgElement = this.rendererInstance.rootSvgElement;

    // Determine the time signature, if top number isn't supported throw early
    let topNumberGlyphName: GlyphNames = "TIME_4";
    switch (this.options.topNumber) {
      case 3: topNumberGlyphName = "TIME_3"; break;
      case 4: topNumberGlyphName = "TIME_4"; break;
      default:
        throw new Error(`Time signature ${this.options.topNumber} not supported. Please use either 3 or 4.`);
    };

    if (this.options.barsCount < 1 || this.options.barsCount > 3) throw new Error(`Bars count ${this.options.barsCount} not supported. Please use 1 - 3`);

    // Determine spacing positioning
    if (this.options.spaceAbove) {
      const yOffset = this.options.spaceAbove * (STAFF_LINE_SPACING);
      this.rendererInstance.addTotalRootSvgYOffset(yOffset);
    }
    if (this.options.spaceBelow) {
      let height = this.options.spaceBelow * (STAFF_LINE_SPACING);
      this.rendererInstance.addTotalRootSvgHeight(height);
    }

    const staffLayer = this.rendererInstance.getLayerByName("staff");
    this.rendererInstance.addTotalRootSvgHeight(STAFF_SPACING * 2);

    // Draw time signature in its own group
    const timeSignatureGroup = this.rendererInstance.createGroup("time-signature");
    staffLayer.appendChild(timeSignatureGroup);
    const groupYPos = STAFF_SPACING - TIME_SIGNATURE_HEIGHT;
    this.rendererInstance.drawGlyph(topNumberGlyphName, timeSignatureGroup);
    this.rendererInstance.drawGlyph("TIME_4", timeSignatureGroup, { yOffset: TIME_SIGNATURE_HEIGHT });
    timeSignatureGroup.setAttribute("transform", `translate(0, ${groupYPos})`);

    // Total width minus starting size of the notes (distance from time signature)
    let notesLayerWidth = this.options.width - NOTE_LAYER_START_X;
    // For each bar, remove the padding they take up from the overall width of the staff.
    if (this.options.barsCount > 1) notesLayerWidth -= (this.options.barsCount - 1) * BAR_SPACING;
    // Add padding to the right of the staff
    notesLayerWidth -= STAFF_RIGHT_PADDING;

    // Draw single staff line and time signature
    this.rendererInstance.drawLine(0, STAFF_SPACING, this.options.width - STAFF_RIGHT_PADDING, STAFF_SPACING, staffLayer);

    // Calculates internal positioning props for ensuring correctly spaced notes based on duration
    this.barSpacing = notesLayerWidth / this.options.barsCount;
    this.quarterNoteSpacing = Math.round(this.barSpacing / this.options.topNumber);
    this.maxBeatCount = this.options.barsCount * this.options.topNumber;

    // Draw bar lines
    let barLineX = this.barSpacing + NOTE_LAYER_START_X;
    const barLineStartY = STAFF_SPACING / 2;
    const barLineEndY = STAFF_SPACING + barLineStartY;
    for (let i = 0; i < this.options.barsCount - 1; i++) {
      this.rendererInstance.drawLine(barLineX, barLineStartY, barLineX, barLineEndY, staffLayer);
      barLineX += this.barSpacing;
    };

    // Translate entire notes layer to match single line on staff
    this.rendererInstance.getLayerByName("notes").setAttribute("transform", `translate(${NOTE_LAYER_START_X}, ${STAFF_SPACING})`);

    // Commit to DOM for one batch operation
    this.rendererInstance.applySizingToRootSvg();
    this.rendererInstance.commitElementsToDOM(rootSvgElement);
  };

  private createBeatUIElement() {
    const uiLayer = this.rendererInstance.getLayerByName("ui");

    this.currentBeatUIElement = this.rendererInstance.drawRect(
      this.quarterNoteSpacing / 2,
      STAFF_SPACING * 2,
      uiLayer,
      {
        x: CURRENT_BEAT_UI_START_X_POS,
        fill: this.options.currentBeatUIColor
      }
    );
  }

  private handleNewBar() {
    this.noteCursorX += BAR_SPACING;
  }

  // Translates group, returns cursor increment amount
  private translateGroupByDuration(beatValue: number, noteGroup: SVGGElement): number {
    noteGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);

    return this.quarterNoteSpacing * beatValue;
  }

  private drawStem(noteGroup: SVGGElement, xOffset?: number) {
    this.rendererInstance.drawLine(HALF_NOTEHEAD_WIDTH + (xOffset ?? 0), 0, HALF_NOTEHEAD_WIDTH + (xOffset ?? 0), -NOTEHEAD_STEM_HEIGHT, noteGroup);
  }

  private renderNote(duration: Durations, noteGroup: SVGGElement) {
    switch (duration) {
      case "w":
        this.rendererInstance.drawGlyph("NOTE_HEAD_WHOLE", noteGroup);
        break;
      case "h":
        this.rendererInstance.drawGlyph("NOTE_HEAD_HALF", noteGroup);
        this.drawStem(noteGroup);
        break;
      case "q":
        this.rendererInstance.drawGlyph("NOTE_HEAD_QUARTER", noteGroup);
        this.drawStem(noteGroup);
        break;
      case "e":
        this.rendererInstance.drawGlyph("EIGHTH_NOTE", noteGroup);
        this.drawStem(noteGroup);
        break;
    }
  }

  private renderRest(duration: Durations, restGroup: SVGGElement) {
    switch (duration) {
      case "w":
        this.rendererInstance.drawGlyph("REST_WHOLE", restGroup);
        break;
      case "h":
        this.rendererInstance.drawGlyph("REST_HALF", restGroup);
        break;
      case "q":
        this.rendererInstance.drawGlyph("REST_QUARTER", restGroup);
        break;
      case "e":
        this.rendererInstance.drawGlyph("REST_EIGHTH", restGroup);
        break;
    };
  }

  private checkAndCreateNewBar() {
    const isBarFull = this.currentBeatCount > 0 && (this.currentBeatCount % this.options.topNumber === 0);
    const isNotLastBar = this.currentBeatCount < this.maxBeatCount;

    if (isBarFull && isNotLastBar) {
      this.handleNewBar();
    };
  }

  private checkAndFillBarWithRests(beatValue: number): SVGGElement[] | null {
    const remainingBeatsInBar = this.options.topNumber - (this.currentBeatCount % this.options.topNumber);
    if (beatValue > remainingBeatsInBar) {
      const restGroups = this.createRemainingRests(remainingBeatsInBar);
      this.handleNewBar();
      return restGroups;
    };
    return null;
  };

  // If the last beat exceeded the remaining value in bar, fill the space with approiate rests
  private createRemainingRests(remainingBeatsInBar: number): SVGGElement[] {
    const restGroups: SVGGElement[] = [];
    let beatsLeft = remainingBeatsInBar;

    while (beatsLeft > 0) {
      const newGroup = this.rendererInstance.createGroup("rest");
      let beatValue = 0;

      // Try adding the biggest rest first
      if (beatsLeft - durationBeatValueMap["h"] >= 0) {
        this.rendererInstance.drawGlyph("REST_HALF", newGroup);
        beatValue = durationBeatValueMap["h"];
      }
      else if (beatsLeft - durationBeatValueMap["q"] >= 0) {
        this.rendererInstance.drawGlyph("REST_QUARTER", newGroup);
        beatValue = durationBeatValueMap["q"];
      }
      else {
        this.rendererInstance.drawGlyph("REST_EIGHTH", newGroup);
        beatValue = durationBeatValueMap["e"];
      }
      beatsLeft -= beatValue;
      this.currentBeatCount += beatValue;
      newGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);

      this.noteCursorX += beatValue * this.quarterNoteSpacing;
      restGroups.push(newGroup);
    }

    return restGroups;
  }

  private renderBeamRect(localX: number, spacingAmount: number, parentGroup: SVGGElement, yOffset?: number) {
    this.rendererInstance.drawRect(
      localX - spacingAmount,
      BEAM_LINE_HEIGHT,
      parentGroup,
      {
        x: HALF_NOTEHEAD_WIDTH,
        y: -NOTEHEAD_STEM_HEIGHT + (yOffset ?? 0),
        fill: this.options.staffColor
      }
    );
  }

  /**
   * Draws a note duration on the staff.
   * @param notes - A single string OR array of note strings in the format `[Duration]`.
   * If an array is passed, it will draw each individual note duration on the staff.
   * If a duration exceeds the remaining value on the bar, rests will fill the empty space.
   *
   * * **Duration**: `w` (whole) `h` (half) `q` (quarter) `e` (eighth)
   * @returns void
   * @throws {Error} If a note string is not correct format. If an array was passed, it will still draw whatever correctly formatted notes before it. 
   * 
   * * @example
   * // Draws the specified note durations individually on the staff
   * drawNote(["q", "q", "q", "q", "w"]);
   * 
   * * @example
   * // Draws the specified single note duration on the staff
   * drawNote("w");
  */
  drawNote(notes: string | string[]) {
    const normalizedNotesArray = Array.isArray(notes) ? notes : [notes];
    const notesLayer = this.rendererInstance.getLayerByName("notes");

    const noteGroups: SVGGElement[] = [];
    for (const noteString of normalizedNotesArray) {
      let durationString: Durations = "w";
      try {
        durationString = parseDurationNoteString(noteString);
      }
      catch (error) {
        if (noteGroups.length > 0) this.rendererInstance.commitElementsToDOM(noteGroups, notesLayer);
        throw error;
      }
      const beatValue = durationBeatValueMap[durationString];

      if (this.currentBeatCount >= this.maxBeatCount) {
        if (noteGroups.length > 0) this.rendererInstance.commitElementsToDOM(noteGroups, notesLayer);
        throw new Error("Max beat count reached. Can't add additional notes.");
      };

      this.checkAndCreateNewBar();

      const restGroups = this.checkAndFillBarWithRests(beatValue);
      if (restGroups) restGroups.forEach(e => {
        noteGroups.push(e);
        this.noteEntries.push(e);
      });

      const noteGroup = this.rendererInstance.createGroup("note");
      const cursorXIncrement = this.translateGroupByDuration(beatValue, noteGroup);

      // Apply cursor increment
      this.noteCursorX += cursorXIncrement;
      this.currentBeatCount += beatValue;

      this.renderNote(durationString, noteGroup);

      noteGroups.push(noteGroup);
      this.noteEntries.push(noteGroup);
    }

    // Commit the newly created note/notes element to the 'notes' layer
    this.rendererInstance.commitElementsToDOM(noteGroups, notesLayer);
  }

  /**
   * Draws a rest duration on the staff.
   * @param rests - A single string OR array of rest strings in the format `[Duration]`.
   * If an array is passed, it will draw each individual rest duration on the staff.
   * If a duration exceeds the remaining value on the bar, rests will fill the empty space.
   *
   * * **Duration**: `w` (whole) `h` (half) `q` (quarter) `e` (eighth)
   * @returns void
   * @throws {Error} If a rest string is not correct format. If an array was passed, it will still draw whatever correctly formatted rests before it. 
   * 
   * * @example
   * // Draws the specified rest durations individually on the staff
   * drawRest(["q", "q", "q", "q", "w"]);
   * 
   * * @example
   * // Draws the specified single rest duration on the staff
   * drawRest("w");
  */
  drawRest(rests: string | string[]) {
    const normalizedNotesArray = Array.isArray(rests) ? rests : [rests];
    const notesLayer = this.rendererInstance.getLayerByName("notes");

    const restGroups: SVGGElement[] = [];
    for (const restString of normalizedNotesArray) {
      let durationString: Durations = "w";
      try {
        durationString = parseDurationNoteString(restString);
      }
      catch (error) {
        if (restGroups.length > 0) this.rendererInstance.commitElementsToDOM(restGroups, notesLayer);
        throw error;
      }

      const restGroup = this.rendererInstance.createGroup("rest");
      const beatValue = durationBeatValueMap[durationString];
      const spacing = beatValue * this.quarterNoteSpacing;

      if (this.currentBeatCount >= this.maxBeatCount) {
        if (restGroups.length > 0) this.rendererInstance.commitElementsToDOM(restGroups, notesLayer);
        throw new Error("Max beat count reached. Can't add additional notes.");
      };

      this.checkAndCreateNewBar();

      const remainingGroups = this.checkAndFillBarWithRests(beatValue);
      if (remainingGroups) remainingGroups.forEach(e => {
        restGroups.push(e);
        this.noteEntries.push(e);
      });

      this.renderRest(durationString, restGroup);
      restGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);

      this.noteCursorX += spacing;
      this.currentBeatCount += beatValue;
      restGroups.push(restGroup);
      this.noteEntries.push(restGroup);
    }

    this.rendererInstance.commitElementsToDOM(restGroups, notesLayer);
  }

  /**
   * Draws a beamed note of specified duration/count on the staff.
   * Will stop beam early if bar line is reached / if beat count is over max limit
   * @param note - A duration string of either 'e' (eighth) or 's' (sixth).
   * @param noteCount - The amount of notes in the beam
   *
   * @returns void
   * @throws {Error} If a rest string is not correct format. If an array was passed, it will still draw whatever correctly formatted rests before it. 
   * 
   * * @example
   * // Draws a 4 beamed eighth note
   * drawBeamedNotes("e", 4);
   * 
   * * @example
   * // Draws a 8 beamed sixth note
   * drawBeamedNotes("s", 8);
  */
  drawBeamedNotes(note: "e" | "s", noteCount: number) {
    if (noteCount < 2) {
      throw new Error("Must provide a value greater than 2 for beamed note.");
    }

    if (this.currentBeatCount >= this.maxBeatCount) {
      throw new Error("Max beat count reached. Can't add additional beamed note.");
    }
    let durationString: Durations = "s";
    if (note === "s") {
      durationString = "s";
    }
    else {
      durationString = parseDurationNoteString(note);
    }

    this.checkAndCreateNewBar();

    const notesLayer = this.rendererInstance.getLayerByName("notes");
    const beatValue = durationBeatValueMap[durationString];
    const spacingAmount = beatValue * this.quarterNoteSpacing;

    // Forces number to be less if it reaches the bar line
    const remainingBeatsInBar = this.options.topNumber - (this.currentBeatCount % this.options.topNumber);
    const fixedNoteCount = Math.min(noteCount, remainingBeatsInBar / beatValue);

    const beamedGroup = this.rendererInstance.createGroup("beamed-note");
    beamedGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);
    let localX = 0;

    for (let i = 0; i < fixedNoteCount; i++) {
      this.rendererInstance.drawGlyph("NOTE_HEAD_QUARTER", beamedGroup, { xOffset: localX });
      this.drawStem(beamedGroup, localX);

      localX += spacingAmount;
      this.currentBeatCount += beatValue;
    };

    // Render beam line
    this.renderBeamRect(localX, spacingAmount, beamedGroup);

    // If sixteenth notes, add a second beam line
    if (note === "s") {
      this.renderBeamRect(localX, spacingAmount, beamedGroup, BEAM_LINE_Y_OFFSET);
    }

    this.noteCursorX += localX;
    this.noteEntries.push(beamedGroup);

    this.rendererInstance.commitElementsToDOM(beamedGroup, notesLayer);
  }

  /**
   * Will increment the UI showing the current beat in quarters. Once exceeded, must be reset with `resetCurrentBeatUI()`
   * @returns void
  */
  incrementCurrentBeatUI() {
    if (!this.currentBeatUIElement) this.createBeatUIElement();

    if (this.currentBeatUICount >= this.maxBeatCount) {
      this.currentBeatUIElement!.setAttribute("display", "none");
      return;
    };

    if (this.currentBeatUIElement?.getAttribute("display") === "none") this.currentBeatUIElement.removeAttribute("display");

    this.currentBeatUICount++;

    // Calls per bar, ignores first occurence
    if (this.currentBeatUICount > this.options.topNumber && this.currentBeatUICount % this.options.topNumber === 1) {
      this.currentBeatUIXPos += BAR_SPACING;
    };

    if (this.currentBeatUICount > 1) this.currentBeatUIXPos += this.quarterNoteSpacing;

    this.currentBeatUIElement!.setAttribute("x", this.currentBeatUIXPos.toString());
  }

  /**
   * Resets the ui showing the current beat value.
   * @returns void
  */
  resetCurrentBeatUI() {
    this.currentBeatUICount = 0;
    this.currentBeatUIXPos = CURRENT_BEAT_UI_START_X_POS;

    if (this.currentBeatUIElement) {
      this.currentBeatUIElement.setAttribute("display", "none");
      this.currentBeatUIElement.setAttribute("x", this.currentBeatUIXPos.toString());
    }
  };

  /**
   * Clears staff of notes and resets internal positioning.
   * @returns void
  */
  clearAllNotes() {
    this.noteCursorX = 0;
    this.currentBeatCount = 0;

    this.rendererInstance.getLayerByName("notes").replaceChildren();
    this.noteEntries = [];
  }

  /**
   * Removes the root svg element and cleans up arrays.
   * @returns void
  */
  destroy() {
    this.noteEntries = [];
    this.rendererInstance.destroy();
  }
}