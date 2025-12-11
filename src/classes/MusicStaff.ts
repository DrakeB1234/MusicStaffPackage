import BassStrategy from "../strategies/BassStrategy";
import type { StaffStrategy } from "../strategies/StrategyInterface";
import TrebleStrategy from "../strategies/TrebleStrategy";
import type { StaffTypes } from "../types";
import SVGRenderer from "./SVGRenderer";

export type MusicStaffOptions = {
  width?: number;
  scale?: number;
  staffType?: StaffTypes;
  spaceAbove?: number;
  spaceBelow?: number;
};

export default class MusicStaff {
  private rendererInstance: SVGRenderer;
  private strategyInstance: StaffStrategy;
  private options: Required<MusicStaffOptions>;

  constructor(rootElementCtx: HTMLElement, options?: MusicStaffOptions) {
    this.options = {
      width: 300,
      scale: 1,
      staffType: "treble",
      spaceAbove: 0,
      spaceBelow: 0,
      ...options
    } as Required<MusicStaffOptions>;

    this.rendererInstance = new SVGRenderer(rootElementCtx, {
      width: this.options.width,
      height: 100,
      scale: this.options.scale
    });
    const rootSvgElement = this.rendererInstance.rootSvgElement;

    switch (this.options.staffType) {
      case "bass":
        this.strategyInstance = new BassStrategy(this.rendererInstance);
        break;
      case "treble":
        this.strategyInstance = new TrebleStrategy(this.rendererInstance);
        break;
      default:
        throw new Error(`The staff type ${this.options.staffType} is not supported. Please use "treble", "bass", or "grand".`);
    };

    this.strategyInstance.drawStaff(this.options.width);

    // Commit to DOM for one batch operation
    this.rendererInstance.applySizingToRootSvg();
    this.rendererInstance.commitElementsToDOM(rootSvgElement);
  }
}