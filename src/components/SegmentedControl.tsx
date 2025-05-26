interface SegmentedControlOption {
  value: string | number;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  label?: string;
  showSign?: boolean;
}

const SegmentedControl = ({
  options,
  selectedValue,
  onValueChange,
  label,
  showSign = false
}: SegmentedControlProps) => {
  const getOptionStyle = (value: string | number): React.CSSProperties => {
    let style: React.CSSProperties = {
      textShadow: '0 -1px 0 rgba(0,0,0,0.3)',
      transition: 'all 0.2s ease-out' // スタイル変化を滑らかに
    };
    if (value === selectedValue) {
      // 選択されているボタンのスタイル（オレンジがかった黄色の光）
      style.color = '#433417'; // 暗い文字色で可読性を確保
      style.backgroundImage = 'linear-gradient(145deg, #ffde7a, #ff9a00)'; // オレンジがかった黄色のグラデーション
      style.textShadow = '0 1px 1px rgba(255,255,255,0.5)';
      style.borderColor = '#ffc107';
      // 内側の影と、外側のぼやっとした光を組み合わせる
      style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.3), 0 0 10px 2px rgba(255, 200, 100, 0.5)';
    } else {
      // 非選択のボタンのスタイル
      style.color = '#a0a0a0';
      style.backgroundImage = 'linear-gradient(145deg, #484848, #303030)';
    }
    return style;
  };

  const formatLabel = (option: SegmentedControlOption) => {
    if (showSign && typeof option.value === 'number' && option.value > 0) {
      return `+${option.value}`;
    }
    return option.label;
  };

  return (
    <div className="col-span-4 flex flex-col items-center">
      {label && (
        <p className="text-[#a0a0a0] text-xs -mb-1 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
          {label}
        </p>
      )}
      <div className="w-full flex rounded-md overflow-hidden border border-solid border-[#6a6a6a]" style={{ boxShadow: '0 3px 5px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.2)' }}>
        {options.map((option, i) => (
          <div
            key={option.value}
            className={`flex-1 py-3 text-center font-bold cursor-pointer min-h-[50px] flex justify-center items-center select-none ${i < options.length - 1 ? 'border-r border-solid border-[#555]' : ''}`}
            style={getOptionStyle(option.value)}
            onClick={() => onValueChange(option.value)}
          >
            {formatLabel(option)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SegmentedControl;
