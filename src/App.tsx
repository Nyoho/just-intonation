import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import LcdScreen from './components/LcdScreen';
import NumericStepper from './components/NumericStepper';

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

// 波形の種類
const waveforms: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

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
  const { t } = useTranslation(); // i18n翻訳用フック

  // ローカルストレージから設定を読み込む
  const loadInitialValues = () => {
    const savedFreq = localStorage.getItem('aFrequency');
    const savedPitch = localStorage.getItem('selectedPitch');
    return {
      freq: savedFreq ? Number(savedFreq) : 442,
      pitch: savedPitch || 'A♯/B♭'
    };
  };

  const initialValues = loadInitialValues();

  const [aFrequency, setAFrequency] = useState(initialValues.freq)
  const [selectedPitch, setSelectedPitch] = useState(initialValues.pitch)
  const [chordType, setChordType] = useState<'major' | 'minor'>('major')
  const [mode, setMode] = useState<'equal' | 'just'>('equal')
  const [octave, setOctave] = useState<number>(0) // オクターブ調整（-2～+2）
  const [waveform, setWaveform] = useState<OscillatorType>('sine') // 波形タイプ
  const [playingNotes, setPlayingNotes] = useState<boolean[]>([false, false, false])
  const audioContextRef = useRef<AudioContext | null>(null)
  const chordOscillatorsRef = useRef<{ [index: number]: OscillatorNode }>({})
  const gainNodesRef = useRef<{ [index: number]: GainNode }>({})
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

  // 設定変更時にローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('aFrequency', String(aFrequency));
    localStorage.setItem('selectedPitch', selectedPitch);
  }, [aFrequency, selectedPitch]);

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
    // オクターブ調整を加える
    return aFrequency * Math.pow(2, pitch.offset / 12) * Math.pow(2, octave)
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
          delete gainNodesRef.current[index]
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
          delete gainNodesRef.current[index]
        }

        // GainNodeを作成して音量を調整
        const gainNode = context.createGain();
        gainNode.gain.value = 0.7; // 音量を0.7（最大1.0）に設定

        const oscillator = context.createOscillator()
        oscillator.type = waveform;
        oscillator.frequency.value = freq

        // オシレーターをGainNodeに接続し、GainNodeを出力先に接続
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start()
        chordOscillatorsRef.current[index] = oscillator
        gainNodesRef.current[index] = gainNode

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
        delete gainNodesRef.current[index]
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
    gainNodesRef.current = {};
    setPlayingNotes([false, false, false]);
  }

  useEffect(() => {
    return () => {
      stopAllNotes();
    };
  }, []);

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
        chordOscillatorsRef.current = {};
        gainNodesRef.current = {};
      }
    };
  }, []);

  useEffect(() => {
    const newFreqs = getChordFrequencies()
    if (!audioContextRef.current) return
    const now = audioContextRef.current.currentTime
    Object.entries(chordOscillatorsRef.current).forEach(([index, oscillator]) => {
      // 波形も更新
      oscillator.type = waveform;
      oscillator.frequency.cancelScheduledValues(now)
      oscillator.frequency.linearRampToValueAtTime(newFreqs[Number(index)], now + 0.05)
    })
  }, [aFrequency, selectedPitch, chordType, mode, octave, waveform])

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#1a1a1a] p-5 box-border font-sans">
      <div
        className="rounded-xl p-6 w-full max-w-md"
        style={{
          color: '#ddd',
          backgroundImage: 'linear-gradient(145deg, #4a4a4a, #2c2c2c)',
          boxShadow: '0 15px 25px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.5)',
          border: '1px solid #555',
          borderTopColor: '#666'
        }}
      >
        {/* タップトゥースタートのダイアログ */}
        <dialog
          ref={startDialogRef}
          onClick={initAudioContext}
          className="m-auto p-8 rounded-lg border border-gray-300 shadow-md text-center w-4/5 max-w-md cursor-pointer"
        >
          <h2>{t('title')}</h2>
          <p>{t('startPrompt')}</p>
          <button
            onClick={(e) => {
              e.stopPropagation(); // ダイアログのクリックイベントとの重複を防止
              initAudioContext();
            }}
            className="bg-accent text-black px-8 py-4 rounded border-none text-xl mt-4 cursor-pointer"
          >
            {t('startButton')}
          </button>
        </dialog>

        <LcdScreen displayText={`${selectedPitch} ${chordType} / ${mode} / A4 = ${aFrequency} Hz`} />

        <h1>{t('title')}</h1>
        <div className="mb-4">
          <label>
            {t('aFrequency')}:
            <input
              type="number"
              value={aFrequency}
              onChange={e => setAFrequency(Number(e.target.value))}
              className="ml-2"
            />
          </label>
        </div>

        {/* 根音選択：12音ピアノ風の横並びボタン */}
        <div className="mb-4">
          <span>{t('rootNote')}: </span>
          {pitchClasses.map(p => (
            <button
              key={p.label}
              onClick={() => setSelectedPitch(p.label)}
              className={`m-1 px-2 py-1 border border-gray-300 ${selectedPitch === p.label ? 'bg-accent text-white' : 'bg-gray-200 text-black'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <span>{t('chordType')}: </span>
          <label className="ml-2">
            <input
              type="radio"
              name="chordType"
              value="major"
              checked={chordType === 'major'}
              onChange={() => setChordType('major')}
            />
            {t('majorChord')}
          </label>
          <label className="ml-2">
            <input
              type="radio"
              name="chordType"
              value="minor"
              checked={chordType === 'minor'}
              onChange={() => setChordType('minor')}
            />
            {t('minorChord')}
          </label>
        </div>

        {/* オクターブ選択 */}
        <div className="mb-4">
          <span>{t('octave')}: </span>
          <NumericStepper
            value={octave}
            onValueChange={setOctave}
            min={-2}
            max={2}
            label="OCTAVE (+/-)"
            showSign={true}
          />
        </div>

        {/* 波形選択 */}
        <div className="mb-4">
          <span>{t('waveform')}: </span>
          <div className="border border-gray-300 rounded-md overflow-hidden inline-flex ml-2">
            {waveforms.map((wave, index) => (
              <button
                key={wave}
                onClick={() => setWaveform(wave)}
                className={`px-3 py-2 ${waveform === wave ? 'bg-accent text-white' : 'bg-transparent text-black'} border-none ${index !== waveforms.length - 1 ? 'border-r border-gray-300' : ''} cursor-pointer transition-all duration-200 ease-in-out`}
              >
                {t(wave)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm">平均律と純正律を切り替えて、聞き比べてみよう。特に第3音を。</p>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-grow border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setMode('equal')}
                className={`flex-1 px-4 py-2 ${mode === 'equal' ? 'bg-accent text-white' : 'bg-transparent text-black'} border-none border-r border-gray-300 cursor-pointer transition-all duration-200 ease-in-out`}
              >
                {t('equalTemperament')}
              </button>
              <button
                onClick={() => setMode('just')}
                className={`flex-1 px-4 py-2 ${mode === 'just' ? 'bg-accent text-white' : 'bg-transparent text-black'} border-none cursor-pointer transition-all duration-200 ease-in-out`}
              >
                {t('justIntonation')}
              </button>
            </div>
          </div>
        </div>

        {/* 各和音（根音・第3音・第5音）のトグルボタン */}
        <div className="mb-4">
          <div
            className="flex h-32 border border-gray-300 rounded overflow-hidden touch-none"
          >
            {chordNoteNames.map((note, index) => (
              <div
                key={index}
                className={`flex-1 ${playingNotes[index] ? 'bg-red-500 text-white' : 'bg-gray-200 text-black'} flex items-center justify-center select-none relative`}
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
                      if (parentElements && parentElements[i] && // null チェックを追加
                        (element === parentElements[i] || parentElements[i]?.contains(element)) &&
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
                <div className="text-center">
                  <div>{index === 0 ? t('rootText') : index === 1 ? t('thirdText') : t('fifthText')}</div>
                  <div className="text-lg">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
