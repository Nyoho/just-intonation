import { useState, useRef, useEffect } from 'react'

const pitchClasses = [
  { label: 'C', offset: -9 },
  { label: 'C#', offset: -8 },
  { label: 'D', offset: -7 },
  { label: 'D#', offset: -6 },
  { label: 'E', offset: -5 },
  { label: 'F', offset: -4 },
  { label: 'F#', offset: -3 },
  { label: 'G', offset: -2 },
  { label: 'G#', offset: -1 },
  { label: 'A', offset: 0 },
  { label: 'A#', offset: 1 },
  { label: 'B', offset: 2 },
]

// 和音の音名を取得する関数
function getChordNoteNames(selectedPitch: string, chordType: 'major' | 'minor'): string[] {
  const selectedIndex = pitchClasses.findIndex(p => p.label === selectedPitch)
  if (selectedIndex === -1) return ['?', '?', '?']
  const intervals = chordType === 'major' ? [0, 4, 7] : [0, 3, 7]
  return intervals.map(interval => {
    const targetIndex = (selectedIndex + interval) % 12
    return pitchClasses[targetIndex].label
  })
}

// chordType: 'major' = 長三和音、'minor' = 短三和音
// mode: 'equal' = 平均律、'just' = 純正律
export default function App() {
  const [aFrequency, setAFrequency] = useState(440)
  const [selectedPitch, setSelectedPitch] = useState('A')
  const [chordType, setChordType] = useState<'major' | 'minor'>('major')
  const [mode, setMode] = useState<'equal' | 'just'>('equal')
  const [playingNotes, setPlayingNotes] = useState<boolean[]>([false, false, false])
  const audioContextRef = useRef<AudioContext | null>(null)
  const chordOscillatorsRef = useRef<{ [index: number]: OscillatorNode }>({})

  // AudioContext の取得（存在しない場合は生成、サスペンド状態なら再開し完了を待つ）
  async function getAudioContext(): Promise<AudioContext> {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  // 指定した基準周波数と選択された音程オフセットから根音周波数を算出
  function getRootFrequency(): number {
    const pitch = pitchClasses.find(p => p.label === selectedPitch)
    if (!pitch) return aFrequency
    return aFrequency * Math.pow(2, pitch.offset / 12)
  }

  // chordType と mode により和音の各音の周波数配列を返す
  function getChordFrequencies(): number[] {
    const root = getRootFrequency()
    if (chordType === 'major') {
      if (mode === 'equal') {
        return [
          root,
          root * Math.pow(2, 4 / 12),
          root * Math.pow(2, 7 / 12),
        ]
      } else {
        return [
          root,
          root * (5 / 4),
          root * (3 / 2),
        ]
      }
    } else {
      if (mode === 'equal') {
        return [
          root,
          root * Math.pow(2, 3 / 12),
          root * Math.pow(2, 7 / 12),
        ]
      } else {
        return [
          root,
          root * (6 / 5),
          root * (3 / 2),
        ]
      }
    }
  }

  // 各和音ボタンのトグル処理
  async function toggleChordNote(index: number) {
    const freqs = getChordFrequencies()
    const freq = freqs[index]
    const context = await getAudioContext()
    if (playingNotes[index]) {
      if (chordOscillatorsRef.current[index]) {
        chordOscillatorsRef.current[index].stop()
        delete chordOscillatorsRef.current[index]
      }
      setPlayingNotes(prev => {
        const newState = [...prev]
        newState[index] = false
        return newState
      })
    } else {
      const oscillator = context.createOscillator()
      oscillator.frequency.value = freq
      oscillator.connect(context.destination)
      oscillator.start()
      chordOscillatorsRef.current[index] = oscillator
      setPlayingNotes(prev => {
        const newState = [...prev]
        newState[index] = true
        return newState
      })
    }
  }

  // 各レンダリング時に最新の音名を計算
  const chordNoteNames = getChordNoteNames(selectedPitch, chordType)

  useEffect(() => {
    const newFreqs = getChordFrequencies()
    if (!audioContextRef.current) return
    const now = audioContextRef.current.currentTime
    Object.entries(chordOscillatorsRef.current).forEach(([index, oscillator]) => {
      oscillator.frequency.cancelScheduledValues(now)
      oscillator.frequency.linearRampToValueAtTime(newFreqs[Number(index)], now + 0.05)
    })
  }, [aFrequency, selectedPitch, chordType, mode])

  return (
    <div style={{ padding: '1rem' }}>
      <h1>3和音の純正律</h1>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          A の周波数 (Hz):
          <input
            type="number"
            value={aFrequency}
            onChange={e => setAFrequency(Number(e.target.value))}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
      </div>

      {/* 根音選択：12音ピアノ風の横並びボタン */}
      <div style={{ marginBottom: '1rem' }}>
        <span>根音: </span>
        {pitchClasses.map(p => (
          <button
            key={p.label}
            onClick={() => setSelectedPitch(p.label)}
            style={{
              margin: '0 0.25rem',
              backgroundColor: selectedPitch === p.label ? '#4caf50' : '#e0e0e0',
              color: selectedPitch === p.label ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '0.25rem 0.5rem',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span>和音タイプ: </span>
        <label style={{ marginLeft: '0.5rem' }}>
          <input
            type="radio"
            name="chordType"
            value="major"
            checked={chordType === 'major'}
            onChange={() => setChordType('major')}
          />
          長三和音
        </label>
        <label style={{ marginLeft: '0.5rem' }}>
          <input
            type="radio"
            name="chordType"
            value="minor"
            checked={chordType === 'minor'}
            onChange={() => setChordType('minor')}
          />
          短三和音
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setMode(mode === 'equal' ? 'just' : 'equal')}>
          {mode === 'equal' ? '純正律に切替' : '平均律に切替'}
        </button>
        <span style={{ marginLeft: '1rem' }}>
          現在のモード: {mode === 'equal' ? '平均律' : '純正律'}
        </span>
      </div>

      {/* 各和音（根音・第3音・第5音）のトグルボタン */}
      <div style={{ marginBottom: '1rem' }}>
        <h2>和音コントロール</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => toggleChordNote(0)}
            style={{
              backgroundColor: playingNotes[0] ? '#f44336' : '#e0e0e0',
              color: playingNotes[0] ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '0.5rem 1rem',
              flex: 1,
            }}
          >
            根音 ({chordNoteNames[0]})
          </button>
          <button
            onClick={() => toggleChordNote(1)}
            style={{
              backgroundColor: playingNotes[1] ? '#f44336' : '#e0e0e0',
              color: playingNotes[1] ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '0.5rem 1rem',
              flex: 1,
            }}
          >
            第3音 ({chordNoteNames[1]})
          </button>
          <button
            onClick={() => toggleChordNote(2)}
            style={{
              backgroundColor: playingNotes[2] ? '#f44336' : '#e0e0e0',
              color: playingNotes[2] ? '#fff' : '#000',
              border: '1px solid #ccc',
              padding: '0.5rem 1rem',
              flex: 1,
            }}
          >
            第5音 ({chordNoteNames[2]})
          </button>
        </div>
      </div>
    </div>
  )
}
