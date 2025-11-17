
import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useSwipeSettings } from '../../contexts/SwipeSettingsContext';
import { SwipeDirection, SwipeAction } from '../../types';
import { SWIPE_ACTIONS } from '../../constants';

const SwipeSettingsModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { swipeSettings, setSwipeSetting } = useSwipeSettings();

    if (modalState.type !== 'swipeSettings') {
        return null;
    }

    const handleSettingChange = (direction: SwipeDirection, action: SwipeAction) => {
        setSwipeSetting(direction, action);
    };

    const renderSelect = (direction: SwipeDirection) => (
        <div key={direction} className="flex items-center justify-between">
            <label htmlFor={`swipe-${direction}`} className="font-bold capitalize text-lg flex items-center gap-2">
                {direction === 'up' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>}
                {direction === 'down' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                {direction === 'left' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>}
                {direction === 'right' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
                <span>{direction}</span>
            </label>
            <select
                id={`swipe-${direction}`}
                value={swipeSettings[direction]}
                onChange={(e) => handleSettingChange(direction, e.target.value as SwipeAction)}
                className="p-2 bg-base-300 rounded-md text-base-content border border-base-300 focus:ring-primary focus:border-primary"
            >
                {SWIPE_ACTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-md">
            <h3 className="text-xl font-bold mb-4">Configure Swipe Actions</h3>
            <div className="space-y-4">
                {renderSelect('up')}
                {renderSelect('down')}
                {renderSelect('left')}
                {renderSelect('right')}
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary-focus">Done</button>
            </div>
        </div>
    );
};

export default SwipeSettingsModal;
