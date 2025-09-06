This folder is for instrument sample packs used by the app's Tone.Sampler mapping.

To make the guitar sampler play realistic sounds, add at least one sample file named `A4.mp3` under `public/samples/guitar/`.

Example structure:

public/
  samples/
    guitar/
      A4.mp3

Notes:
- Place short, single-note samples (wav or mp3) named for the note, e.g. `A4.mp3`, `C4.mp3`.
- Ensure you have the rights to distribute/use the samples (royalty-free or your own recordings).
- The app will fall back to a synthesized `PluckSynth` if samples are not present.
