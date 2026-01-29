"use client";

import React from 'react';

interface ResultsDisplayProps {
  carbonSequestration: number;
  biodiversityImpact: number;
  forestResilience: number;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  carbonSequestration,
  biodiversityImpact,
  forestResilience,
}) => {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-md space-y-4 text-foreground">
      <h3 className="text-lg font-semibold">Forest Performance Metrics</h3>
      <div>
        <h4 className="font-semibold">Carbon Sequestration</h4>
        <p className="text-primary font-bold text-base">{carbonSequestration.toFixed(2)} kg CO2</p>
      </div>
      <div>
        <h4 className="font-semibold">Biodiversity Impact</h4>
        <p className="text-primary font-bold text-xl">{biodiversityImpact.toFixed(2)} / 5</p>
      </div>
      <div>
        <h4 className="font-semibold">Forest Resilience</h4>
        <p className="text-primary font-bold text-xl">{forestResilience.toFixed(2)} / 5</p>
      </div>
    </div>
  );
};

export default ResultsDisplay;
