import MusicStaff from '../classes/MusicStaff';
import RhythmStaff from '../classes/RhythmStaff';
import './style.css';

const grandRoot = document.getElementById("staff-root-grand");
const trebleRoot = document.getElementById("staff-root-treble");
const bassRoot = document.getElementById("staff-root-bass");
const altoRoot = document.getElementById("staff-root-alto");

const rhythmRoot = document.getElementById("staff-root-rhythm");

if (!trebleRoot || !bassRoot || !grandRoot || !altoRoot || !rhythmRoot) {
  throw new Error("Required DOM elements not found.");
};

type SelectedStaff = {
  element: HTMLElement;
  staff: MusicStaff | RhythmStaff;
}

// Class Testing

const musicStaffGrand = new MusicStaff(grandRoot, {
  staffType: "grand",
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  spaceAbove: 0,
  spaceBelow: 3
});

const musicStaffTreble = new MusicStaff(trebleRoot, {
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  staffType: "treble",
  spaceBelow: 1
});

const musicStaffBass = new MusicStaff(bassRoot, {
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  staffType: "bass",
  spaceAbove: 2,
  spaceBelow: 0,
});

const musicStaffAlto = new MusicStaff(altoRoot, {
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  staffType: "alto",
  spaceAbove: 1,
  spaceBelow: 1,
});

const rhythmStaff = new RhythmStaff(rhythmRoot, {
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  topNumber: 4,
  spaceAbove: 0,
  spaceBelow: 0,
});

let selectedStaff: SelectedStaff = {
  element: grandRoot,
  staff: musicStaffGrand
};

selectedStaff.element.classList.add("show");

musicStaffGrand.drawNote(["c#5w", "b#4e", "a#4e", "c#4e", "a#3e", "d#3e", "c#3e"]);
musicStaffTreble.drawNote(["c4e", "b4e", "a5e"]);
musicStaffBass.drawNote(["C4w", "D3w", "C3w"]);
musicStaffAlto.drawNote(["C4w", "G4w", "F3w"]);

// Index Elements
const elements = {
  buttonDrawNotes: document.getElementById("button-draw") as HTMLButtonElement,
  buttonDrawBeamNotes: document.getElementById("button-draw-beam") as HTMLButtonElement,
  buttonDrawRests: document.getElementById("button-draw-rest") as HTMLButtonElement,
  buttonChangeNote: document.getElementById("button-change-note") as HTMLButtonElement,
  buttonJustifyNotes: document.getElementById("button-justify") as HTMLButtonElement,
  buttonErrorNote: document.getElementById("button-error") as HTMLButtonElement,
  buttonClearNotes: document.getElementById("button-clear") as HTMLButtonElement,

  buttonThemeToggle: document.getElementById("button-theme-toggle") as HTMLButtonElement,

  inputStaff: document.getElementById("input-select-staff") as HTMLSelectElement,
  inputNoteIndex: document.getElementById("input-number-index") as HTMLInputElement,
  inputNotes: document.getElementById("input-text-notes") as HTMLInputElement,
}

// Event Listeners
elements.buttonThemeToggle?.addEventListener("click", () => {
  const root = document.documentElement;
  const theme = root.getAttribute("data-theme");

  if (theme === "dark") {
    root.setAttribute("data-theme", "light");
  }
  else {
    root.setAttribute("data-theme", "dark");
  }
});

elements.buttonChangeNote.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff) return;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number") return;
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.changeNoteByIndex(noteParts[0], noteIndex);
})

elements.buttonDrawNotes?.addEventListener("click", () => {
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.drawNote(noteParts);
});

elements.buttonDrawBeamNotes.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff) return;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number" || noteIndex < 1) return;
  rhythmStaff.drawBeamedNotes("e", noteIndex);
});

elements.buttonDrawRests.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff) return;

  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  rhythmStaff.drawRest(noteParts);
});

elements.buttonJustifyNotes?.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff) return;

  selectedStaff.staff.justifyNotes();
});

elements.buttonErrorNote?.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff) return;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number") return;
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.showWrongNoteUIByNoteIndex(noteParts[0], noteIndex);

  setTimeout(() => {
    if (selectedStaff.staff instanceof RhythmStaff) return;
    selectedStaff.staff.hideWrongNoteUI();
  }, 1000);
});

elements.buttonClearNotes?.addEventListener("click", () => {
  selectedStaff.staff.clearAllNotes();
});

elements.inputStaff.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLSelectElement;
  const value = target.value;
  selectedStaff.element.classList.remove('show');

  switch (value) {
    case "grand":
      selectedStaff = {
        element: grandRoot,
        staff: musicStaffGrand
      }
      break;
    case "treble":
      selectedStaff = {
        element: trebleRoot,
        staff: musicStaffTreble
      }
      break;
    case "bass":
      selectedStaff = {
        element: bassRoot,
        staff: musicStaffBass
      }
      break;
    case "alto":
      selectedStaff = {
        element: altoRoot,
        staff: musicStaffAlto
      }
      break;
    case "rhythm":
      selectedStaff = {
        element: rhythmRoot,
        staff: rhythmStaff
      }
      break;
  };

  selectedStaff.element.classList.add("show");
});