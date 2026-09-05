import React from 'react';
import { TreeType } from '@/types/treeTypes';
import { calculateRegionArea } from '@/utils/treePlanting';
import { SOCIAL_IMPACT } from '@/utils/constants';
import { UsersIcon } from '../ui/Icons';

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
  const isPlanting = simulationMode === 'planting';
  const treeDiversityBonus = selectedTrees && selectedTrees.length > 1 
    ? Math.min(selectedTrees.length * SOCIAL_IMPACT.TREE_DIVERSITY_MULTIPLIER, SOCIAL_IMPACT.MAX_DIVERSITY_BONUS) 
    : 0;
  const timeBonus = Math.min(
    years * (isPlanting ? SOCIAL_IMPACT.TIME_MULTIPLIER_PLANTING : SOCIAL_IMPACT.TIME_MULTIPLIER_CLEARING),
    SOCIAL_IMPACT.MAX_TIME_BONUS
  );
  const areaBonus = selectedRegion 
    ? Math.min(calculateRegionArea(selectedRegion) * SOCIAL_IMPACT.AREA_MULTIPLIER_PLANTING, SOCIAL_IMPACT.MAX_AREA_BONUS) 
    : 0;

  return (
    <div className="space-y-4" role="tabpanel" id="social-panel" aria-labelledby="social-tab">
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <UsersIcon size={16} className="text-accent" />
          {isPlanting ? 'Community benefits' : 'Social impact assessment'}
        </h5>
        <dl className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-ink-500">Social impact score</dt>
            <dd className="text-lg font-semibold text-accent-strong tnum">{socialImpact.toFixed(1)}/5</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-ink-500">{isPlanting ? 'Tree diversity bonus' : 'Forest diversity factor'}</dt>
            <dd className="text-sm font-medium text-ink-900 tnum">
              {selectedTrees && selectedTrees.length > 1 ? `+${treeDiversityBonus.toFixed(1)}` : '+0.0'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-ink-500">{isPlanting ? 'Time investment bonus' : 'Duration impact'}</dt>
            <dd className="text-sm font-medium text-ink-900 tnum">+{timeBonus.toFixed(2)}</dd>
          </div>
          {selectedRegion && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-ink-500">{isPlanting ? 'Area scale bonus' : 'Area impact factor'}</dt>
              <dd className="text-sm font-medium text-ink-900 tnum">+{areaBonus.toFixed(1)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <h5 className="mb-3 text-sm font-semibold text-ink-900">
          {isPlanting ? 'Social benefits' : 'Social considerations'}
        </h5>
        <ul className="space-y-2 text-sm text-ink-600">
          {isPlanting ? (
            <>
              <li>Recreational opportunities and outdoor activities</li>
              <li>Educational value for environmental learning</li>
              <li>Community engagement and volunteer opportunities</li>
              <li>Mental health benefits from green spaces</li>
              <li>Cultural and spiritual significance</li>
              <li>Social cohesion and community building</li>
            </>
          ) : (
            <>
              <li>Community concerns about forest loss</li>
              <li>Impact on recreational and aesthetic value</li>
              <li>Cultural and spiritual significance of forests</li>
              <li>Public health implications of deforestation</li>
              <li>Educational opportunities about forest conservation</li>
              <li>Long-term community environmental awareness</li>
            </>
          )}
        </ul>
      </div>

      <p className="text-xs italic text-ink-400">
        {isPlanting
          ? 'Social impact increases with tree diversity, time investment, and project scale.'
          : 'Social impact assessment considers community concerns, cultural values, and long-term environmental awareness.'}
      </p>
    </div>
  );
};
