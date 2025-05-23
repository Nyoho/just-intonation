interface LcdScreenProps {
    displayText: string;
}

const LcdScreen = ({ displayText }: LcdScreenProps) => {
    return (
        <div
            className="font-lcd bg-[#9fbf9f] text-[#0f3f0f] border-2 border-solid border-[#101010] border-t-[#0a0a0a] border-l-[#0a0a0a] rounded-md p-4 h-24 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] overflow-y-auto flex items-center justify-center text-center"
        >
            {displayText}
        </div>
    )
}

export default LcdScreen;
