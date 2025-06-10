// PopupContent.tsx
import React, { useState } from 'react';
import { invoke } from "@tauri-apps/api/core";
import {AcData} from "./interfaces/acdata.tsx";

interface PopupContentProps {
    selected: AcData;
}

export function PopupContent({ selected }: PopupContentProps) {
    const [hasControl, setHasControl] = useState(false);
    const [altitude, setAltitude]     = useState<string>('');
    const [heading, setHeading]       = useState<string>('');
    const [speed, setSpeed]           = useState<string>('');
    const [vsp, setVsp]               = useState<string>('');

    // generic helper to build <option> lists
    const makeOptions = (step: number, min: number, max: number) => {
        const opts = [];
        for (let v = min; v <= max; v += step) {
            opts.push(
                <option key={v} value={v}>
                    {v}
                </option>
            );
        }
        return opts;
    };

    const toggleControl = async () => {
        if (!hasControl) {
            // Take control
            await invoke('assume_control', { id: selected.id });
        } else {
            // Release control
            await invoke('relinquish_control', { id: selected.id });
        }
        setHasControl(!hasControl);
    };

    const controlBtnStyle: React.CSSProperties = {
        backgroundColor: hasControl ? '#900' : '#333',
        color:           '#fff',
        border:          'none',
        borderRadius:    4,
        padding:         '8px 12px',
        cursor:          'pointer',
        textTransform:   'uppercase',
        fontWeight:      'bold',
    };

    const fieldLabelStyle: React.CSSProperties = {
        fontSize:   '0.75rem',
        fontWeight: 600,
        marginBottom: 4,
    };

    const selectStyle: React.CSSProperties = {
        width:       120,
        padding:     '4px',
        borderRadius: 4,
        border:      '1px solid #ccc',
    };

    return (
        <div style={{ display: 'flex', alignItems: 'start', gap: 16 }}>
            {/* TCTRL / RCTRL */}
            <button onClick={toggleControl} style={controlBtnStyle}>
                {hasControl ? 'RCTRL' : 'TCTRL'}
            </button>

            {/* parameter fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* ALT */}
                <div>
                    <div style={fieldLabelStyle}>ALT</div>
                    <select
                        disabled={!hasControl}
                        value={altitude}
                        onChange={(e) => {setAltitude(e.target.value); invoke('set_altitude', {id: selected.id, altitude: e.target.value});}}
                        style={selectStyle}
                    >
                        <option value="">Value</option>
                        {makeOptions(1000, 0, 40000)}
                    </select>
                </div>

                {/* HDG */}
                <div>
                    <div style={fieldLabelStyle}>HDG</div>
                    <select
                        disabled={!hasControl}
                        value={heading}
                        onChange={(e) => {setHeading(e.target.value); invoke('set_heading', {id: selected.id, heading: e.target.value});}}
                        style={selectStyle}
                    >
                        <option value="">Value</option>
                        {makeOptions(10, 0, 350)}
                    </select>
                </div>

                {/* SP */}
                <div>
                    <div style={fieldLabelStyle}>SP</div>
                    <select
                        disabled={!hasControl}
                        value={speed}
                        onChange={(e) => {setSpeed(e.target.value); invoke('set_speed', {id: selected.id, speed: e.target.value});}}
                        style={selectStyle}
                    >
                        <option value="">Value</option>
                        {makeOptions(10, 0, 600)}
                    </select>
                </div>

                {/* VSP */}
                <div>
                    <div style={fieldLabelStyle}>VSP</div>
                    <select
                        disabled={!hasControl}
                        value={vsp}
                        onChange={(e) => {setVsp(e.target.value); invoke('set_vspeed', {id: selected.id, vspeed: e.target.value});}}
                        style={selectStyle}
                    >
                        <option value="">Value</option>
                        {/* from -6000 to +6000 ft/min in 1000-ft steps */}
                        {makeOptions(1000, -6000, 6000)}
                    </select>
                </div>
            </div>
        </div>
    );
}
