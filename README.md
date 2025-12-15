<div style="background-color:white; display:flex; justify-content: center; margin-bottom:3rem;">
<img src="public/vector-score-icon.svg" alt="VectorScore Logo" width="150" height="150" margin-inline="auto" />
</div>

# Vector Score

A lightweight, SVG-based TypeScript library for rendering musical staves, notes, and rhythm patterns in the browser.

## Features

* **Multiple Staff Types**: Supports Treble, Bass, Alto, and Grand staves.
* **Rhythm Staff**: Dedicated staff for rhythm exercises with customizable time signatures and bar handling.
* **SVG Rendering**: Crisp, scalable vector graphics suitable for any screen size.
* **Flexible Note Input**: Simple string-based syntax for defining notes, chords, and rests.
* **Interactive Features**: Includes methods for error feedback (highlighting wrong notes) and note justification.

## Installation

```bash
npm install DrakeB1234/MusicStaffPackage
```

## Development

To start the development server with a playground:

```bash
npm run dev
```

To build the library for production:

```bash
npm run build
```

## Usage

### 1. Setup HTML

Create a container element in your HTML where the staff will be rendered.

```html
<div id="staff-container"></div>
```

### 2. Import and Initialize

#### Standard Music Staff (Treble, Bass, Alto)

```typescript
import { MusicStaff } from 'vector-score';

const container = document.getElementById('staff-container');

const staff = new MusicStaff(container, {
  staffType: 'treble', // 'treble', 'bass', 'alto', or 'grand'
  width: 400,
  scale: 1.2,
  staffColor: 'black',
  spaceBelow: 1
});

// Draw a C Minor scale (quarter notes)
// Format: NoteName + Accidental(optional) + Octave + Duration
staff.drawNote(['C4q', 'D4q', 'Eb4q', 'F4q', 'G4q', 'Ab4q', 'Bb4q', 'C5q']);
```

#### Grand Staff

```typescript
import { MusicStaff } from 'vector-score';

const grandStaff = new MusicStaff(container, {
  staffType: 'grand',
  width: 500,
  spaceBelow: 2
});

// Notes are automatically positioned on the correct stave based on pitch
grandStaff.drawNote(['C4w', 'A2h', 'F5q']);
```

#### Rhythm Staff

```typescript
import { RhythmStaff } from 'vector-score';

const rhythmContainer = document.getElementById('rhythm-container');

const rhythm = new RhythmStaff(rhythmContainer, {
  width: 400,
  topNumber: 4, // Time signature numerator (e.g., 4/4 time)
  barsCount: 2
});

// Draw notes and rests
rhythm.drawNote(['q', 'q']); // Duration only
rhythm.drawRest(['h']);

// Draw beamed note
rhythm.drawBeamedNote("e", 4); // Draws a beamed note of 4 eighth notes
```

## Note String Syntax

Notes are defined using a specific string format parsed by the library:

`[Name][Accidental?][Octave][Duration]`

* **Name**: `A` - `G` (Case insensitive)
* **Accidental**: `#` (Sharp) or `b` (Flat). Optional.
* **Octave**: `0` - `9`
* **Duration**:
    * `w`: Whole
    * `h`: Half
    * `q`: Quarter
    * `e`: Eighth

**Examples:**
* `C4w`: C, Octave 4, Whole note
* `F#5q`: F Sharp, Octave 5, Quarter note
* `Bb3e`: B Flat, Octave 3, Eighth note

## API Reference

### MusicStaff Class

| Method | Description |
| :--- | :--- |
| `drawNote(notes: string \| string[])` | Draws one or multiple notes sequentially. |
| `drawChord(notes: string \| string[])` | Draws multiple notes stacked as a chord at the current cursor position. |
| `justifyNotes()` | Evenly spaces all currently drawn notes across the staff width. |
| `clearAllNotes()` | Removes all notes from the staff and resets the cursor. |
| `changeNoteByIndex(note: string, index: number)` | Replaces a note at a specific index with a new note. |
| `showWrongNoteUIByNoteIndex(note, index)` | Highlights a specific note position to indicate an error (useful for quizzes). |
| `hideWrongNoteUI()` | Hides error UI. |

### RhythmStaff Class

| Method | Description |
| :--- | :--- |
| `drawNote(notes: string \| string[])` | Draws rhythm notes (neutral pitch). |
| `drawRest(rests: string \| string[])` | Draws rests. |
| `drawBeamedNotes(type: 'e'\|'s', count: number)` | Draws a group of beamed eighth or sixteenth notes. |
| `clearAllNotes()` | Removes all items from the staff. |

## Configuration Options

### MusicStaffOptions
* `width`: Total width of the SVG in pixels.
* `scale`: Zoom factor (default: 1).
* `staffType`: `'treble' | 'bass' | 'alto' | 'grand'`.
* `spaceAbove`: Padding units above the staff (in staff line spaces).
* `spaceBelow`: Padding units below the staff (in staff line spaces).
* `staffColor`: CSS color string for lines and notes.
* `staffBackgroundColor`: CSS color string for background.

### RhythmStaffOptions
* `topNumber`: The top number of the time signature (e.g., 4 for 4/4 time).
* `barsCount`: Number of measures to draw.
* *Inherits sizing and color options from MusicStaffOptions.*
