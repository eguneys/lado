import fetch from 'node-fetch'
import fs from 'fs'

const scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const scaleIndexToNoteFlats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const scaleIndexToNoteSharps = scaleIndexToNote.map(_ => _.replace('#', 's'))

const octaves = ['3', '4', '5', '6']

const flat_names = octaves.flatMap(octave => scaleIndexToNoteFlats.map(_ => _ + octave))

let out_base = 'assets/audio/'

let fatboy_base = 'https://github.com/gleitz/midi-js-soundfonts/raw/gh-pages/FatBoy/acoustic_grand_piano-mp3/'
async function main() {


  await Promise.all(flat_names.map(_ => 
    fetch(fatboy_base + `${_}.mp3`).then(res => {
      let dest = fs.createWriteStream(out_base + `${_}.mp3`)
      res.body.pipe(dest)
    })
  ))

  console.log('done')
}

await main()
