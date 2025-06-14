interface NumericStepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  showSign?: boolean;
}

const NumericStepper = ({
  value,
  onValueChange,
  min = -2,
  max = 2,
  label,
  showSign = true
}: NumericStepperProps) => {
  const handleDecrement = () => {
    if (value > min) onValueChange(value - 1);
  };
  const handleIncrement = () => {
    if (value < max) onValueChange(value + 1);
  };

  const displayValue = showSign && value > 0 ? `+${value}` : value;

  return (
    <div className="flex flex-col items-center @container">
      {label && (
        <p className="text-[#a0a0a0] text-xs h-5 flex items-start justify-center text-center leading-tight [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
          {label}
        </p>
      )}
      <div className="w-full h-12 flex items-stretch justify-between rounded-md overflow-hidden border border-solid border-[#6a6a6a]" style={{ background: 'linear-gradient(145deg, #484848, #303030)', boxShadow: '0 3px 5px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.2)' }}>
        <button
          onClick={handleDecrement}
          disabled={value === min}
          className="h-full px-[clamp(2px,10cqi,20px)] font-bold text-lg text-[clamp(0.75rem,10cqi+0.5rem,1.5rem)] text-white/80 disabled:opacity-30 hover:bg-white/10 transition-colors flex items-center justify-center flex-shrink-0"
        >
          -
        </button>
        <div className="font-bold text-[clamp(0.25rem,18cqi,2rem)] text-white text-center flex-grow flex items-center justify-center truncate">{displayValue}</div>
        <button
          onClick={handleIncrement}
          disabled={value === max}
          className="h-full px-[clamp(2px,10cqi,20px)] font-bold text-lg text-[clamp(0.75rem,10cqi+0.5rem,1.5rem)] text-white/80 disabled:opacity-30 hover:bg-white/10 transition-colors flex items-center justify-center flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default NumericStepper;
