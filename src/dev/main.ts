import MusicStaff from '../classes/MusicStaff';
import RhythmStaff from '../classes/RhythmStaff';
import ScrollingStaff from '../classes/ScrollingStaff';
import './style.css';
import '../staff.css';

const grandRoot = document.getElementById("staff-root-grand");
const trebleRoot = document.getElementById("staff-root-treble");
const bassRoot = document.getElementById("staff-root-bass");
const altoRoot = document.getElementById("staff-root-alto");
const scrollingRoot = document.getElementById("staff-root-scrolling");

const rhythmRoot = document.getElementById("staff-root-rhythm");

if (!trebleRoot || !bassRoot || !grandRoot || !altoRoot || !rhythmRoot || !scrollingRoot) {
  throw new Error("Required DOM elements not found.");
};

type SelectedStaff = {
  element: HTMLElement;
  staff: MusicStaff | RhythmStaff | ScrollingStaff;
  name: string;
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
  spaceBelow: 2,
  spaceAbove: 4
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

const scrollingStaff = new ScrollingStaff(scrollingRoot, {
  width: 350,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  staffType: "treble",
  spaceAbove: 1,
  spaceBelow: 1,
});

const rhythmStaff = new RhythmStaff(rhythmRoot, {
  width: 400,
  scale: 1.2,
  staffColor: "var(--font-color)",
  staffBackgroundColor: "var(--bg-color)",
  currentBeatUIColor: "#24ff7450",
  topNumber: 4,
  spaceAbove: 0,
  spaceBelow: 0,
});

// Index Elements
const elements = {
  buttonDrawNotes: document.getElementById("button-draw") as HTMLButtonElement,
  buttonDrawChord: document.getElementById("button-draw-chord") as HTMLButtonElement,
  buttonDrawBeamNotes: document.getElementById("button-draw-beam") as HTMLButtonElement,
  buttonDrawRests: document.getElementById("button-draw-rest") as HTMLButtonElement,
  buttonChangeNote: document.getElementById("button-change-note") as HTMLButtonElement,
  buttonChangeChord: document.getElementById("button-change-chord") as HTMLButtonElement,
  buttonJustifyNotes: document.getElementById("button-justify") as HTMLButtonElement,
  buttonErrorNote: document.getElementById("button-error") as HTMLButtonElement,
  buttonClearNotes: document.getElementById("button-clear") as HTMLButtonElement,
  buttonIncrementBeat: document.getElementById("button-increment-beat") as HTMLButtonElement,
  buttonResetBeat: document.getElementById("button-reset-beat") as HTMLButtonElement,
  buttonCompare: document.getElementById("button-compare") as HTMLButtonElement,
  buttonResetCompare: document.getElementById("button-reset-compare") as HTMLButtonElement,
  buttonTest: document.getElementById("button-test") as HTMLButtonElement,
  buttonAdvance: document.getElementById("button-advance") as HTMLButtonElement,

  buttonThemeToggle: document.getElementById("button-theme-toggle") as HTMLButtonElement,

  inputStaff: document.getElementById("input-select-staff") as HTMLSelectElement,
  inputNoteIndex: document.getElementById("input-number-index") as HTMLInputElement,
  inputNotes: document.getElementById("input-text-notes") as HTMLInputElement,
}

let selectedStaff: SelectedStaff = {
  element: grandRoot,
  staff: musicStaffGrand,
  name: "grand"
};

changeStaff("scrolling");

if (selectedStaff.staff instanceof MusicStaff) {
  // selectedStaff.staff.drawChord(["F#4", "A#4", "C5", "E#5", "G#5", "B#5", "D#6"]);
  // selectedStaff.staff.drawChord(["B#3", "Cb4", "D#4", "Eb4", "F#4", "Gb4", "A#4", "B#4"]);
  // selectedStaff.staff.drawNote(["F#4", "Fb4", "Fn4", "F##4", "Fbb4"]);
  // selectedStaff.staff.drawChord(["C4", "E4", "G4"]);
}

elements.inputNotes.value = "C4/E#4/G4";

function changeStaff(name: string) {
  selectedStaff.element.classList.remove('show');

  switch (name) {
    case "grand":
      selectedStaff = {
        element: grandRoot!,
        staff: musicStaffGrand,
        name: "grand"
      }
      break;
    case "treble":
      selectedStaff = {
        element: trebleRoot!,
        staff: musicStaffTreble,
        name: "treble"
      }
      break;
    case "bass":
      selectedStaff = {
        element: bassRoot!,
        staff: musicStaffBass,
        name: "bass"
      }
      break;
    case "alto":
      selectedStaff = {
        element: altoRoot!,
        staff: musicStaffAlto,
        name: "alto"
      }
      break;
    case "scrolling":
      selectedStaff = {
        element: scrollingRoot!,
        staff: scrollingStaff,
        name: "scrolling"
      }
      break;
    case "rhythm":
      selectedStaff = {
        element: rhythmRoot!,
        staff: rhythmStaff,
        name: "rhythm"
      }
      break;
  };

  selectedStaff.element.classList.add("show");
  elements.inputStaff.value = selectedStaff.name;
};

// Event Listeners
elements.buttonTest?.addEventListener("click", () => {
  scrollingStaff.queueNotes(["C4", "D4", ["C4", "E#4", "F4"], "A4", "B4", "C4", "C4", ["C4", "E#4", "G#4"], "A4", "B4", "C4", "C4", ["C4", "E#4", "G#4"]]);
})
elements.buttonAdvance?.addEventListener("click", () => {
  scrollingStaff.advanceNotes();
})

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
  if (selectedStaff.staff instanceof RhythmStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number") return;
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.changeNoteByIndex(noteParts[0], noteIndex);
})

elements.buttonChangeChord.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number") return;
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.changeChordByIndex(noteParts, noteIndex);
})

elements.buttonDrawNotes?.addEventListener("click", () => {
  if (selectedStaff.staff instanceof ScrollingStaff) return;

  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.drawNote(noteParts);
});

elements.buttonDrawChord?.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  selectedStaff.staff.drawChord(noteParts);
});

elements.buttonDrawBeamNotes.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff) return;
  const notesRawString = elements.inputNotes.value;

  const noteIndexRawValue = elements.inputNoteIndex.value;
  const noteIndex = Number(noteIndexRawValue);
  if (typeof noteIndex !== "number" || noteIndex < 1) return;
  rhythmStaff.drawBeamedNotes(notesRawString as "e" | "s", noteIndex);
});

elements.buttonDrawRests.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff) return;

  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

  rhythmStaff.drawRest(noteParts);
});

elements.buttonJustifyNotes?.addEventListener("click", () => {
  if (selectedStaff.staff instanceof RhythmStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  selectedStaff.staff.justifyNotes();
});

elements.buttonErrorNote?.addEventListener("click", () => {

});

elements.buttonClearNotes?.addEventListener("click", () => {
  selectedStaff.staff.clearAllNotes();
});

elements.inputStaff.addEventListener("change", (e: Event) => {
  const target = e.target as HTMLSelectElement;
  const value = target.value;

  changeStaff(value);
});

elements.buttonIncrementBeat.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  selectedStaff.staff.incrementCurrentBeatUI();
});

elements.buttonResetBeat.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff || selectedStaff.staff instanceof ScrollingStaff) return;

  selectedStaff.staff.resetCurrentBeatUI();
});

elements.buttonCompare.addEventListener("click", () => {
  if (selectedStaff.staff instanceof MusicStaff) return;
  const notesRawString = elements.inputNotes.value;
  if (!notesRawString) return;
  const noteParts = notesRawString.split("/");

})