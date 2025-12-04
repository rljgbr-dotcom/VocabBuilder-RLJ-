
import React, { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';

const SetStackSizeModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { currentSize, maxSize, onSet } = modalState.props;
    const [size, setSize] = useState(currentSize || 10);

    useEffect(() => {
        if (modalState.type === 'setStackSize') {
            setSize(currentSize);
        }
    }, [modalState.type, currentSize]);

    if (modalState.type !== 'setStackSize') {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSet(Number(size));
        hideModal();
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-xs">
            <h3 className="text-lg font-bold mb-4">Set Active Deck Size</h3>
            <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label htmlFor="stack-size-input" className="text-sm">Enter number of cards:</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            id="stack-size-input"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            className="w-full p-2 bg-base-300 rounded-md text-center"
                            min="1"
                            max={maxSize}
                        />
                        <button
                            type="button"
                            onClick={() => setSize(maxSize)}
                            className="px-3 py-2 bg-secondary text-secondary-content rounded-md text-sm font-bold hover:bg-secondary-focus"
                        >
                            Max
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center">(Max: {maxSize})</p>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                    <button type="button" onClick={hideModal} className="px-4 py-2 bg-base-300 rounded-md hover:bg-opacity-80">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-accent text-accent-content rounded-md hover:bg-accent-focus">Set</button>
                </div>
            </form>
        </div>
    );
};

export default SetStackSizeModal;
