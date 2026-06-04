import React from 'react';
import { useNavigate } from 'react-router-dom';
import PenaltyGame from './PenaltyGame';

export default function PenaltyGameRoute() {
    const navigate = useNavigate();
    return <PenaltyGame onBack={() => navigate(-1)} />;
}
