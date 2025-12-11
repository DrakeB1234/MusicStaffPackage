import type SVGRenderer from "../classes/SVGRenderer";
import { STAFF_LINE_COUNT, STAFF_LINE_SPACING } from "../constants";
import type { ClefParams } from "../types";
import type { StaffStrategy } from "./StrategyInterface";

export default class BassStrategy implements StaffStrategy {
  private params: ClefParams = {
    clefGlyph: "CLEF_BASS",
    paddingTop: 0,
    paddingBottom: 0
  }
  private rendererRef: SVGRenderer;

  constructor(rendererRef: SVGRenderer) {
    this.rendererRef = rendererRef;
  }

  drawStaff = (width: number) => {
    const musicStaffLayer = this.rendererRef.getLayerByName('staff');
    let yCurrent = 0;

    for (let i = 0; i < STAFF_LINE_COUNT; i++) {
      this.rendererRef.drawLine(0, yCurrent, width, yCurrent, musicStaffLayer);
      yCurrent += STAFF_LINE_SPACING;
    }
    this.rendererRef.drawLine(0, 0, 0, yCurrent - STAFF_LINE_SPACING, musicStaffLayer);
    this.rendererRef.drawLine(width, 0, width, yCurrent - STAFF_LINE_SPACING, musicStaffLayer);

    // Add height from staff lines, One added for line thickness compensation
    let newHeight = yCurrent - STAFF_LINE_SPACING + 1;
    let newYOffset = 1;

    this.rendererRef.drawGlyph(this.params.clefGlyph, musicStaffLayer);

    newHeight += this.params.paddingTop + this.params.paddingBottom;
    newYOffset += this.params.paddingTop;

    this.rendererRef.addTotalRootSvgHeight(newHeight);
    this.rendererRef.addTotalRootSvgYOffset(newYOffset);
  }
}