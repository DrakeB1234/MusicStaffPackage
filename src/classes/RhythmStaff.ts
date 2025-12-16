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

// STAFF RIGHT SPACING TO PREVENT EIGTH NOTES FROM OVERFLOWING
const STAFF_RIGHT_PADDING = 1;

const CURRENT_BEAT_UI_START_X_POS = NOTE_LAYER_START_X;

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
      staffBackgroundColor: this.options.staffBackgroundColor
    });
    const rootSvgElement = this.rendererInstance.rootSvgElement;

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

    let topNumberGlyphName: GlyphNames = "TIME_4";
    switch (this.options.topNumber) {
      case 3:
        topNumberGlyphName = "TIME_3";
        break;
      default:
        topNumberGlyphName = "TIME_4";
    };

    this.rendererInstance.drawGlyph(topNumberGlyphName, timeSignatureGroup);
    this.rendererInstance.drawGlyph("TIME_4", timeSignatureGroup, { yOffset: TIME_SIGNATURE_HEIGHT });
    timeSignatureGroup.setAttribute("transform", `translate(0, ${groupYPos})`);

    // Total width minus starting size of the notes (distance from time signature)
    let notesLayerWidth = this.options.width - NOTE_LAYER_START_X;
    // Subtract size of bar spacing
    if (this.options.barsCount > 1) notesLayerWidth -= (this.options.barsCount - 1) * BAR_SPACING;
    // Add padding to the right of the staff
    notesLayerWidth -= STAFF_RIGHT_PADDING;

    // Draw single staff line and time signature
    this.rendererInstance.drawLine(0, STAFF_SPACING, this.options.width - STAFF_RIGHT_PADDING, STAFF_SPACING, staffLayer);

    this.barSpacing = notesLayerWidth / this.options.barsCount;
    this.quarterNoteSpacing = Math.round(this.barSpacing / this.options.topNumber);

    this.maxBeatCount = this.options.barsCount * this.options.topNumber;

    // Draw bar line
    const barLineStartX = this.barSpacing + NOTE_LAYER_START_X;
    const barLineStartY = STAFF_SPACING / 2;
    const barLineEndY = STAFF_SPACING + barLineStartY;
    this.rendererInstance.drawLine(barLineStartX, barLineStartY, barLineStartX, barLineEndY, staffLayer);

    // Translate entire notes layer to match single line on staff
    this.rendererInstance.getLayerByName("notes").setAttribute("transform", `translate(${NOTE_LAYER_START_X}, ${STAFF_SPACING})`);

    // Commit to DOM for one batch operation
    this.rendererInstance.applySizingToRootSvg();
    this.rendererInstance.commitElementsToDOM(rootSvgElement);
  };

  private createBeatUIElement() {
    const uiLayer = this.rendererInstance.getLayerByName("ui");
    const element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    element.setAttribute("fill", this.options.currentBeatUIColor);
    element.setAttribute("width", (this.quarterNoteSpacing / 2).toString());
    element.setAttribute("height", (STAFF_SPACING * 2).toString());
    element.setAttribute("x", CURRENT_BEAT_UI_START_X_POS.toString());

    this.currentBeatUIElement = element;
    this.rendererInstance.commitElementsToDOM(element, uiLayer);
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

  private renderBeamRect(localX: number, spacingAmount: number, yOffset?: number): SVGRectElement {
    const beamRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    beamRect.setAttribute("height", "4");
    beamRect.setAttribute("width", `${localX - spacingAmount}`);
    beamRect.setAttribute("x", `${HALF_NOTEHEAD_WIDTH}`);
    beamRect.setAttribute("y", `${-NOTEHEAD_STEM_HEIGHT + (yOffset ?? 0)}`);
    beamRect.setAttribute("fill", this.options.staffColor);
    return beamRect;
  }

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

      this.renderRest(durationString, restGroup);
      restGroup.setAttribute("transform", `translate(${this.noteCursorX}, 0)`);

      this.noteCursorX += spacing;
      this.currentBeatCount += beatValue;
      restGroups.push(restGroup);
      this.noteEntries.push(restGroup);
    }

    this.rendererInstance.commitElementsToDOM(restGroups, notesLayer);
  }

  // Will stop beam early if bar line is reached / if beat count is over max limit
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
    const beamRect = this.renderBeamRect(localX, spacingAmount);
    beamedGroup.appendChild(beamRect);

    if (note === "s") {
      const secondBeamRect = this.renderBeamRect(localX, spacingAmount, 6);
      beamedGroup.appendChild(secondBeamRect);
    }

    this.noteCursorX += localX;
    this.noteEntries.push(beamedGroup);

    this.rendererInstance.commitElementsToDOM(beamedGroup, notesLayer);
  }

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

  resetCurrentBeatUI() {
    this.currentBeatUICount = 0;
    this.currentBeatUIXPos = CURRENT_BEAT_UI_START_X_POS;

    if (this.currentBeatUIElement) {
      this.currentBeatUIElement.setAttribute("display", "none");
      this.currentBeatUIElement.setAttribute("x", this.currentBeatUIXPos.toString());
    }
  };

  clearAllNotes() {
    this.noteCursorX = 0;
    this.currentBeatCount = 0;

    this.rendererInstance.getLayerByName("notes").replaceChildren();
    this.noteEntries = [];
  }
}