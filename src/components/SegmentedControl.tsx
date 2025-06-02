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
  columns?: number;
}

const SegmentedControl = ({
  options,
  selectedValue,
  onValueChange,
  label,
  showSign = false,
  columns
}: SegmentedControlProps) => {
  const getOptionStyle = (value: string | number): React.CSSProperties => {
    let style: React.CSSProperties = {
      textShadow: '0 -1px 0 rgba(0,0,0,0.3)',
      transition: 'all 0.2s ease-out'
    };
    if (value === selectedValue) {
      style.color = '#433417';
      style.backgroundImage = 'linear-gradient(145deg, #ffde7a, #ff9a00)';
      style.textShadow = '0 1px 1px rgba(255,255,255,0.5)';
      style.borderColor = '#ffc107';
      style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.3), 0 0 10px 2px rgba(255, 200, 100, 0.5)';
    } else {
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

  const gridCols = columns ? `repeat(${columns}, 1fr)` : undefined;

  return (
    <div className="flex flex-col items-center">
      {label && (
        <p className="text-[#a0a0a0] text-xs h-8 flex items-start justify-center text-center leading-tight [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
          {label}
        </p>
      )}
      <div
        className="w-full flex flex-wrap rounded-md overflow-hidden border border-solid border-[#6a6a6a]"
        style={{
          boxShadow: '0 3px 5px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.2)',
          display: columns ? 'grid' : 'flex',
          gridTemplateColumns: gridCols
        }}
      >
        {options.map((option, i) => (
          <div
            key={option.value}
            className={`flex-1 py-3 text-center font-bold cursor-pointer min-h-[50px] flex justify-center items-center select-none ${i < options.length - 1 && !columns ? 'border-r border-solid border-[#555]' : ''}`}
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
