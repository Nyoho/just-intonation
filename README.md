# Just Intonation Chord Player

https://nyoho.github.io/just-intonation/

This is a web application that allows you to play major and minor chords in both equal temperament and just intonation. You can adjust the base frequency of A4, select the root note, choose the chord type (major/minor), switch between equal temperament and just intonation, adjust the octave, and select the waveform (sine, square, sawtooth, triangle).

## Features

*   **Play Chords:** Click or tap the buttons for the root, third, and fifth notes to play the chord components.
*   **Select Root Note:** Choose the root note of the chord from C to B using the piano-style buttons.
*   **Choose Chord Type:** Select between major and minor chords.
*   **Switch Tuning:** Toggle between Equal Temperament and Just Intonation.
*   **Adjust A4 Frequency:** Set the reference frequency for A4 (default is 442 Hz).
*   **Octave Adjustment:** Shift the octave of the chord up or down (-2 to +2).
*   **Waveform Selection:** Choose the sound wave type (sine, square, sawtooth, triangle).
*   **Responsive Design:** Buttons are designed to be easily clickable/tappable on various devices.
*   **Audio Initialization:** Requires user interaction (click/tap) to start the audio context for browser compatibility.
*   **Localization:** Supports English and Japanese (based on i18next setup).
*   **Settings Persistence:** Saves A4 frequency and selected root note to local storage.

## How to Use

1.  **Start Audio:** Click the "Start" button or anywhere on the initial dialog to enable audio.
2.  **Set Parameters:**
    *   Adjust the "A4 Frequency" if needed.
    *   Select the desired "Root Note".
    *   Choose "Major" or "Minor" for the "Chord Type".
    *   Select the "Octave" shift.
    *   Choose the desired "Waveform".
    *   Switch between "Equal Temperament" and "Just Intonation".
3.  **Play Notes:** Click or tap on the large buttons labeled "Root", "Third", and "Fifth" to play/stop the individual notes of the chord. You can play multiple notes simultaneously.

## Technologies Used

*   React
*   TypeScript
*   Vite
*   Web Audio API
*   i18next (for localization)

## Development

To run this project locally:

1.  Clone the repository.
2.  Install dependencies: `pnpm install` (or `npm install` / `yarn install`)
3.  Start the development server: `pnpm dev` (or `npm run dev` / `yarn dev`)
