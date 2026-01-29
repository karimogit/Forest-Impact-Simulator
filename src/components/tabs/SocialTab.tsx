import React from 'react';
import { TreeType } from '@/types/treeTypes';
import { calculateRegionArea } from '@/utils/treePlanting';
import { SOCIAL_IMPACT } from '@/utils/constants';

interface SocialTabProps {
  simulationMode: 'planting' | 'clear-cutting';
  years: number;
  selectedTrees: TreeType[] | undefined;
  selectedRegion: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null | undefined;
  socialImpact: number;
}

export const SocialTab: React.FC<SocialTabProps> = ({
  simulationMode,
  years,
  selectedTrees,
  selectedRegion,
  socialImpact
}) => {
  const treeDiversityBonus = selectedTrees && selectedTrees.length > 1 
    ? Math.min(selectedTrees.length * SOCIAL_IMPACT.TREE_DIVERSITY_MULTIPLIER, SOCIAL_IMPACT.MAX_DIVERSITY_BONUS) 
    : 0;
  const timeBonus = Math.min(years * SOCIAL_IMPACT.TIME_MULTIPLIER_PLANTING, SOCIAL_IMPACT.MAX_TIME_BONUS);
  const areaBonus = selectedRegion 
    ? Math.min(calculateRegionArea(selectedRegion) * SOCIAL_IMPACT.AREA_MULTIPLIER_PLANTING, SOCIAL_IMPACT.MAX_AREA_BONUS) 
    : 0;

  return (
    <div className="space-y-3" role="tabpanel" id="social-panel" aria-labelledby="social-tab">
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Community Benefits' : 'Social Impact Assessment'}
        </h5>
        <div className="space-y-3 text-xs text-primary">
          <div className="flex justify-between">
            <span>Social Impact Score:</span>
            <span className="font-medium">
              {socialImpact.toFixed(1)}/5
            </span>
          </div>
          <div className="flex justify-between">
            <span>{simulationMode === 'planting' ? 'Tree Diversity Bonus:' : 'Forest Diversity Factor:'}</span>
            <span className="font-medium">
              {selectedTrees && selectedTrees.length > 1 ? `+${treeDiversityBonus.toFixed(1)}` : '+0.0'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{simulationMode === 'planting' ? 'Time Investment Bonus:' : 'Duration Impact:'}</span>
            <span className="font-medium">
              +{timeBonus.toFixed(1)}
            </span>
          </div>
          {selectedRegion && (
            <div className="flex justify-between">
              <span>{simulationMode === 'planting' ? 'Area Scale Bonus:' : 'Area Impact Factor:'}</span>
              <span className="font-medium">
                +{areaBonus.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <h5 className="font-semibold text-green-800 mb-2 flex items-center">
          {simulationMode === 'planting' ? 'Social Benefits' : 'Social Considerations'}
        </h5>
        <ul className="text-xs text-primary space-y-2">
          {simulationMode === 'planting' ? (
            <>
              <li>• Recreational opportunities and outdoor activities</li>
              <li>• Educational value for environmental learning</li>
              <li>• Community engagement and volunteer opportunities</li>
              <li>• Mental health benefits from green spaces</li>
              <li>• Cultural and spiritual significance</li>
              <li>• Social cohesion and community building</li>
            </>
          ) : (
            <>
              <li>• Community concerns about forest loss</li>
              <li>• Impact on recreational and aesthetic value</li>
              <li>• Cultural and spiritual significance of forests</li>
              <li>• Public health implications of deforestation</li>
              <li>• Educational opportunities about forest conservation</li>
              <li>• Long-term community environmental awareness</li>
            </>
          )}
        </ul>
      </div>
      
      <div className="text-xs text-gray-600 italic">
        {simulationMode === 'planting' 
          ? 'Social impact increases with tree diversity, time investment, and project scale'
          : 'Social impact assessment considers community concerns, cultural values, and long-term environmental awareness'
        }
      </div>
    </div>
  );
};
