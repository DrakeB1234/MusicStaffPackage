import type { GlyphNames } from "./glyphs";

export type StaffTypes = 'treble' | 'bass' | 'alto' | 'grand';

export type ClefParams = {
  clefGlyph: GlyphNames;
  paddingTop: number;
  paddingBottom: number;
}