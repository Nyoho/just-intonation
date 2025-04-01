import { useState, useRef, useEffect } from 'react'

const pitchClasses = [
  { label: 'C', offset: -9 },
  { label: 'C♯/D♭', offset: -8 },
  { label: 'D', offset: -7 },
  { label: 'D♯/E♭', offset: -6 },
  { label: 'E', offset: -5 },
  { label: 'F', offset: -4 },
  { label: 'F♯/G♭', offset: -3 },
  { label: 'G', offset: -2 },
  { label: 'G♯/A♭', offset: -1 },
  { label: 'A', offset: 0 },
  { label: 'A♯/B♭', offset: 1 },
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
  const [aFrequency, setAFrequency] = useState(442)
  const [selectedPitch, setSelectedPitch] = useState('A♯/B♭')
  const [chordType, setChordType] = useState<'major' | 'minor'>('major')
  const [mode, setMode] = useState<'equal' | 'just'>('equal')
  const [playingNotes, setPlayingNotes] = useState<boolean[]>([false, false, false])
  const audioContextRef = useRef<AudioContext | null>(null)
  const chordOscillatorsRef = useRef<{ [index: number]: OscillatorNode }>({})
  // 最後にタッチした音のインデックスを追跡
  const lastTouchedNoteRef = useRef<number | null>(null)
  // オーディオコンテキストが初期化されたかどうかのフラグ
  const [audioInitialized, setAudioInitialized] = useState(false)
  // ダイアログのrefを追加
  const startDialogRef = useRef<HTMLDialogElement>(null)

  // コンポーネントマウント時にダイアログを表示
  useEffect(() => {
    // 少し遅延させてダイアログを表示（レンダリング完了後に実行するため）
    const timer = setTimeout(() => {
      if (startDialogRef.current && !audioInitialized) {
        startDialogRef.current.showModal();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // AudioContext の直接的な初期化（ユーザージェスチャーに紐づけるため）
  function initAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setAudioInitialized(true);

    // ダイアログを閉じる
    if (startDialogRef.current && startDialogRef.current.open) {
      startDialogRef.current.close();
    }

    return audioContextRef.current;
  }

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

    try {
      if (playingNotes[index]) {
        if (chordOscillatorsRef.current[index]) {
          try {
            chordOscillatorsRef.current[index].stop()
          } catch (e) {
            console.error('オシレーターの停止中にエラーが発生しました:', e)
          }
          delete chordOscillatorsRef.current[index]
        }

        setPlayingNotes(prev => {
          const newState = [...prev]
          newState[index] = false
          return newState
        })
      } else {
        // 既存のオシレーターが残っていないか確認（念のため）
        if (chordOscillatorsRef.current[index]) {
          try {
            chordOscillatorsRef.current[index].stop()
          } catch (e) {
            // 既に停止している可能性があるため、エラーを無視
          }
          delete chordOscillatorsRef.current[index]
        }

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
    } catch (error) {
      console.error('音の制御中にエラーが発生しました:', error)
      // エラー発生時は状態を一致させる
      if (chordOscillatorsRef.current[index]) {
        try {
          chordOscillatorsRef.current[index].stop()
        } catch (e) {
          // 既に停止している可能性があるため、エラーを無視
        }
        delete chordOscillatorsRef.current[index]
      }

      setPlayingNotes(prev => {
        const newState = [...prev]
        newState[index] = false
        return newState
      })
    }
  }

  // 各レンダリング時に最新の音名を計算
  const chordNoteNames = getChordNoteNames(selectedPitch, chordType)

  // 全ての音を停止する関数
  function stopAllNotes() {
    Object.values(chordOscillatorsRef.current).forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // 既に停止している場合などのエラーを無視
      }
    });
    chordOscillatorsRef.current = {};
    setPlayingNotes([false, false, false]);
  }

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        Object.values(chordOscillatorsRef.current).forEach(osc => {
          try {
            osc.stop();
          } catch (e) {
            // 既に停止している場合などのエラーを無視
          }
        });
      }
    };
  }, []);

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
      {/* タップトゥースタートのダイアログ */}
      <dialog
        ref={startDialogRef}
        onClick={initAudioContext}
        style={{
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          width: '80%',
          maxWidth: '400px',
          cursor: 'pointer'
        }}
      >
        <h2>3和音の純正律</h2>
        <p>タップして音の出力開始</p>
        <button
          onClick={(e) => {
            e.stopPropagation(); // ダイアログのクリックイベントとの重複を防止
            initAudioContext();
          }}
          style={{
            backgroundColor: '#4caf50',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '4px',
            border: 'none',
            fontSize: '1.2rem',
            marginTop: '1rem',
            cursor: 'pointer'
          }}
        >
          音声の再生を開始する
        </button>
      </dialog>

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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'flex',
            border: '1px solid #ccc',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setMode('equal')}
              style={{
                padding: '0.5rem 2rem',
                backgroundColor: mode === 'equal' ? '#4caf50' : 'transparent',
                color: mode === 'equal' ? '#fff' : '#000',
                border: 'none',
                borderRight: '1px solid #ccc',
                borderRadius: '0',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              平均律
            </button>
            <button
              onClick={() => setMode('just')}
              style={{
                padding: '0.5rem 2rem',
                backgroundColor: mode === 'just' ? '#4caf50' : 'transparent',
                color: mode === 'just' ? '#fff' : '#000',
                border: 'none',
                borderRadius: '0',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              純正律
            </button>
          </div>
        </div>
      </div>

      {/* 各和音（根音・第3音・第5音）のトグルボタン */}
      <div style={{ marginBottom: '1rem' }}>
        <h2>和音コントロール</h2>
        <div
          style={{
            display: 'flex',
            height: '120px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'hidden',
            touchAction: 'none' // タッチイベントをブラウザの標準動作から切り離す
          }}
        >
          {chordNoteNames.map((note, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                backgroundColor: playingNotes[index] ? '#f44336' : '#e0e0e0',
                color: playingNotes[index] ? '#fff' : '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                position: 'relative'
              }}
              onPointerDown={(e) => {
                // モバイルの場合はonTouchStartで処理するため、ポインターイベントを無視
                if (e.pointerType === 'touch') return;

                e.preventDefault();
                initAudioContext();
                toggleChordNote(index);
                lastTouchedNoteRef.current = index;
              }}
              onPointerEnter={(e) => {
                // モバイルの場合はonTouchMoveで処理するため、ポインターイベントを無視
                if (e.pointerType === 'touch') return;

                // ポインターが押されている状態でエリアに入ってきた場合のみtoggle
                if (e.buttons > 0 && lastTouchedNoteRef.current !== index) {
                  e.preventDefault();
                  toggleChordNote(index);
                  lastTouchedNoteRef.current = index;
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                // タッチ時にAudioContextを直接初期化
                initAudioContext();
                toggleChordNote(index);
                lastTouchedNoteRef.current = index;
              }}
              onTouchMove={(e) => {
                // タッチ移動時のイベント処理
                e.preventDefault();

                try {
                  // タッチ位置から要素を取得
                  const touch = e.touches[0];
                  if (!touch) return; // タッチが存在しない場合は何もしない

                  const element = document.elementFromPoint(touch.clientX, touch.clientY);

                  // 要素が見つからない場合は何もしない
                  if (!element) return;

                  // 要素がこの音のセルを表す場合は何もしない（既にポインターダウンで処理済み）
                  if (element === e.currentTarget) return;

                  // 親要素を確認して別の音のセルに移動したかどうかを判定
                  const parentElements = chordNoteNames.map((_, i) => {
                    return document.querySelector(`[data-note-index="${i}"]`);
                  });

                  // どの音のセルに移動したか判定
                  for (let i = 0; i < parentElements.length; i++) {
                    if (parentElements[i] &&
                      (element === parentElements[i] || parentElements[i].contains(element)) &&
                      i !== lastTouchedNoteRef.current) {
                      // 別の音のセルに移動した場合、その音をトグル
                      toggleChordNote(i);
                      lastTouchedNoteRef.current = i;
                      break;
                    }
                  }
                } catch (error) {
                  console.error('タッチ処理中にエラーが発生しました:', error);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
              }}
              data-note-index={index}
            >
              <div>
                <div>{index === 0 ? '根音' : index === 1 ? '第3音' : '第5音'}</div>
                <div>({note})</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
