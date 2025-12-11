import MusicStaff from '../classes/MusicStaff';
import './style.css'

const element = document.getElementById("staff-root");

if (!element) {
  throw new Error("Required DOM element with ID 'staff-root' not found.");
}

const musicStaff = new MusicStaff(element, {
  width: 300,
  scale: 2,
  staffType: "treble"
});

console.log(musicStaff);