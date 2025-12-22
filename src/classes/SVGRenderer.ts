import { NAMESPACE, NOTE_LAYER_START_X } from "../constants";
import { GLPYH_ENTRIES, type GlyphNames } from "../glyphs";

export const SVG_HREF = "http://www.w3.org/2000/svg";
const GLOBAL_SYMBOL_SCALE = 0.1;
const MAX_WIDTH_STAFF = 1200;

type SVGRendererOptions = {
  width: number;
  height: number;
  scale: number;
  staffColor: string;
  staffBackgroundColor: string;
  useGlyphs: GlyphNames[];
}

type LayerNames = 'staff' | 'notes' | 'ui';

type DrawGlyphOptions = {
  yOffset?: number;
  xOffset?: number;
}

type DrawRectOptions = {
  x?: number;
  y?: number;
  fill?: string;
}

export default class SVGRenderer {
  private rootElementRef: HTMLElement;
  private svgElementRef: SVGElement;

  // Layers
  private parentGroupContainer: SVGGElement;
  private musicStaffLayer: SVGGElement;
  private musicNotesLayer: SVGGElement
  private musicUILayer: SVGGElement;

  // Positioning variables
  private width: number;
  private scale: number;
  private totalYOffset: number = 0;
  private totalHeight: number = 0;

  // Setups root SVG element and layers, sets attributes for scaling, creates defs for glyphs
  // Does not append to DOM automatically, must be done manually with commitElementsToDOM and passing rootSvgElement
  // from get rootSvgElement().
  // HEIGHT and YOfsset should be set externally, values are calculated internally.
  constructor(rootElementCtx: HTMLElement, options: SVGRendererOptions) {
    this.rootElementRef = rootElementCtx;
    this.width = options.width;
    this.scale = options.scale;

    if (this.width > MAX_WIDTH_STAFF) {
      this.width = MAX_WIDTH_STAFF;
      console.warn(`Width provided for the staff ${this.width} exceeds the limit ${MAX_WIDTH_STAFF}. Please use this value to fix positioning issues.`);
    };

    this.svgElementRef = document.createElementNS(SVG_HREF, "svg");
    this.svgElementRef.classList.add(`${NAMESPACE}-svg-renderer-root`);

    // SET ROOT SVG ATTRIBUTES, WIDTH/HEIGHT * SCALE APPLIED AFTER STAFF IS DRAWN
    this.svgElementRef.style.maxWidth = `100%`;
    this.svgElementRef.style.height = `auto`;
    this.svgElementRef.style.display = "block";

    // Applies coloring to staff
    this.svgElementRef.setAttribute("color", options.staffColor);
    this.svgElementRef.style.backgroundColor = options.staffBackgroundColor;

    // CREATE DEFS THEN PARENT GROUP IN ORDER
    this.makeGlyphDefs(options.useGlyphs);
    this.parentGroupContainer = this.createGroup("svg-renderer-parent");
    this.svgElementRef.appendChild(this.parentGroupContainer);

    this.musicStaffLayer = this.createGroup("music-staff-layer");
    this.musicNotesLayer = this.createGroup("music-notes-layer");
    this.musicUILayer = this.createGroup("music-ui-layer");
    this.parentGroupContainer.appendChild(this.musicStaffLayer);
    this.parentGroupContainer.appendChild(this.musicNotesLayer);
    this.parentGroupContainer.appendChild(this.musicUILayer);

    // Apply Note Layer Offset
    this.musicNotesLayer.setAttribute("transform", `translate(${NOTE_LAYER_START_X}, 0)`);
  }

  // Creates SVG defs for all glyphs in GLYPH_ENTRIES, applies global scale and offsets, appends to root SVG
  private makeGlyphDefs(useGlyphs: GlyphNames[]) {
    const defsElement = document.createElementNS(SVG_HREF, "defs");
    // Only get the glyphs specified in the constructor
    const activeGlyphs = Object.entries(GLPYH_ENTRIES)
      .filter(([key]) => useGlyphs.includes(key as GlyphNames));

    activeGlyphs.forEach(([name, data]) => {
      const path = document.createElementNS(SVG_HREF, "path");
      path.setAttribute("id", `glyph-${name}`);
      path.setAttribute("d", data.path);
      path.setAttribute("fill", "currentColor");

      // BAKE SCALE AND OFFSETS INTO SYMBOL
      path.setAttribute("transform", `translate(${data.xOffset}, ${data.yOffset}) scale(${GLOBAL_SYMBOL_SCALE})`);

      defsElement.appendChild(path);
    });

    this.rootSvgElement.appendChild(defsElement);
  }

  createGroup(className?: string): SVGGElement {
    const g = document.createElementNS(SVG_HREF, "g");
    if (className) g.classList.add(`${NAMESPACE}-${className}`);
    return g;
  }

  commitElementsToDOM(elements: SVGElement[] | SVGElement, parent: HTMLElement | SVGElement = this.rootElementRef) {
    const fragment = document.createDocumentFragment();

    if (Array.isArray(elements)) {
      elements.forEach(element => {
        fragment.appendChild(element);
      });
    }
    else {
      fragment.appendChild(elements);
    }

    parent.appendChild(fragment);
  }

  getLayerByName(name: LayerNames): SVGGElement {
    switch (name) {
      case 'staff': return this.musicStaffLayer;
      case 'notes': return this.musicNotesLayer;
      case 'ui': return this.musicUILayer;
      default: throw new Error(`Layer with name '${name}' does not exist.`);
    }
  }

  addTotalRootSvgHeight(amount: number) {
    this.totalHeight += amount;
  }

  addTotalRootSvgYOffset(amount: number) {
    this.totalYOffset += amount;
  }

  applySizingToRootSvg() {
    this.parentGroupContainer.setAttribute("transform", `translate(0, ${this.totalYOffset})`);

    let newWidth = this.width * this.scale;
    const newHeight = (this.totalHeight + this.totalYOffset) * this.scale;

    // Apply padding to sides to prevent clipping of staff end lines
    newWidth += 2;

    this.svgElementRef.setAttribute("width", newWidth.toString());
    this.svgElementRef.setAttribute("height", newHeight.toString());

    this.svgElementRef.setAttribute("viewBox", `0 0 ${this.width} ${this.totalHeight + this.totalYOffset}`);
  }

  get rootSvgElement(): SVGElement { return this.svgElementRef; }
  get parentGroupElement(): SVGElement { return this.parentGroupContainer; }


  // Drawing Methods
  drawLine(x1: number, y1: number, x2: number, y2: number, parent: SVGElement) {
    const line = document.createElementNS(SVG_HREF, "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "1");

    parent.appendChild(line);
  }

  drawRect(width: number, height: number, parent: SVGElement, options?: DrawRectOptions): SVGRectElement {
    const rect = document.createElementNS(SVG_HREF, "rect");

    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());

    // Default to 0 if not provided
    rect.setAttribute("x", (options?.x ?? 0).toString());
    rect.setAttribute("y", (options?.y ?? 0).toString());

    if (options?.fill) rect.setAttribute("fill", options.fill);
    else rect.setAttribute("fill", "currentColor");

    parent.appendChild(rect);
    return rect;
  }

  drawGlyph(glyphName: GlyphNames, parent: SVGElement, options?: DrawGlyphOptions) {
    options = {
      xOffset: 0,
      yOffset: 0,
      ...options
    };

    const useElement = document.createElementNS(SVG_HREF, "use");
    useElement.setAttribute("href", `#glyph-${glyphName}`);

    if (options.xOffset || options.yOffset) useElement.setAttribute("transform", `translate(${options.xOffset}, ${options.yOffset})`);

    parent.appendChild(useElement);
  }

  destroy() {
    if (this.rootElementRef && this.svgElementRef) {
      if (this.rootElementRef.contains(this.svgElementRef)) {
        this.rootElementRef.removeChild(this.svgElementRef);
      }
    }
  }
}