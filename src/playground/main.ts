import MusicStaff from '../classes/MusicStaff';
import './style.css'

const grandRoot = document.getElementById("staff-root-grand");
const trebleRoot = document.getElementById("staff-root-treble");
const bassRoot = document.getElementById("staff-root-bass");
const altoRoot = document.getElementById("staff-root-alto");

if (!trebleRoot || !bassRoot || !grandRoot || !altoRoot) {
  throw new Error("Required DOM elements not found.");
}

// Class Testing

const musicStaffGrand = new MusicStaff(grandRoot, {
  staffType: "grand",
  width: 400,
  scale: 1.2,
  // staffColor: "#f2f4ff",
  // staffBackgroundColor: "#2f3040",
  spaceAbove: 0,
  spaceBelow: 3
});

const musicStaffTreble = new MusicStaff(trebleRoot, {
  width: 400,
  scale: 1.2,
  staffType: "treble",
  spaceBelow: 1
});

const musicStaffBass = new MusicStaff(bassRoot, {
  width: 400,
  scale: 1.2,
  staffType: "bass",
  spaceAbove: 2,
  spaceBelow: 0,
});

const musicStaffAlto = new MusicStaff(altoRoot, {
  width: 400,
  scale: 1.2,
  staffType: "alto",
  spaceAbove: 1,
  spaceBelow: 1,
});

musicStaffGrand.drawNote(["c#5w", "b#4e", "a#4e", "c#4e", "a#3e", "d#3e", "c#3e"]);
musicStaffTreble.drawNote(["c4e", "b4e", "a5e"]);
musicStaffBass.drawNote(["C4w", "D3w", "C3w"]);
musicStaffAlto.drawNote(["C4w", "G4w", "F3w"]);

function addErrorClassToNote() {
  musicStaffGrand.applyClassToNoteByIndex("error-note", 0);

  setTimeout(() => {
    musicStaffGrand.removeClassToNoteByIndex("error-note", 1);
  }, 1000);
};

function toggleWrongNoteUI(note: string, index: number) {
  musicStaffGrand.showWrongNoteUIByNoteIndex(note, index);

  setTimeout(() => {
    musicStaffGrand.hideWrongNoteUI();
  }, 1000);
};

// Index Elements
const elements = {
  testButtonGrand: document.getElementById("test-button-grand"),
  testButtonTreble: document.getElementById("test-button-treble"),
  testButtonBass: document.getElementById("test-button-bass"),
  testButtonAlto: document.getElementById("test-button-alto"),
}

// Event Listeners
elements.testButtonGrand?.addEventListener("click", () => {
  toggleWrongNoteUI("D4", 0);
});
elements.testButtonTreble?.addEventListener("click", () => {
  musicStaffTreble.justifyNotes();
});
elements.testButtonBass?.addEventListener("click", () => {
  musicStaffBass.justifyNotes();
});
elements.testButtonAlto?.addEventListener("click", () => {
  musicStaffAlto.justifyNotes();
});