"use client";

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TreeType, TREE_TYPES } from '@/types/treeTypes';
import { ExportData } from '@/utils/exportUtils';
import { generateShareableUrl, getShareParameterFromUrl, decodeUrlToState, copyToClipboard, ShareableState } from '@/utils/shareableLink';

// Lazy load components for better performance
const LocationMap = lazy(() => import('@/components/LocationMap'));
const ForestImpactCalculator = lazy(() => import('@/components/ForestImpactCalculator'));
const TreeTypeSelector = lazy(() => import('@/components/TreeTypeSelector'));
const TreePlantingCalculator = lazy(() => import('@/components/TreePlantingCalculator'));
const ExportResults = lazy(() => import('@/components/ExportResults'));

export default function Home() {
  const [simulationMode, setSimulationMode] = useState<'planting' | 'clear-cutting'>('planting');
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [years, setYears] = useState<number>(50);
  const [calculationMode, setCalculationMode] = useState<'perTree' | 'perArea'>('perArea');
  const [averageTreeAge, setAverageTreeAge] = useState<number>(20);
  const [selectedTrees, setSelectedTrees] = useState<TreeType[]>([]);
  const [treePercentages, setTreePercentages] = useState<{ [key: string]: number }>({});
  const [plantingData, setPlantingData] = useState<{
    area: number;
    totalTrees: number;
    spacing: number;
    density: number;
  } | null>(null);
  
  // Soil and climate data state
  const [soilData, setSoilData] = useState<{ carbon: number | null; ph: number | null } | null>(null);
  const [climateData, setClimateData] = useState<{ temperature: number | null; precipitation: number | null; historicalData?: { temperatures: number[]; precipitations: number[] } } | null>(null);

  const [faqOpen, setFaqOpen] = useState<{ [key: string]: boolean }>({});
  const [faqSearch, setFaqSearch] = useState<string>('');
  const [faqShowAll, setFaqShowAll] = useState<boolean>(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [shareNotification, setShareNotification] = useState<string | null>(null);

  const faqs = [
    {
      id: 1,
      title: 'Who made this tool and how can I contribute?',
      searchText: 'who made this tool contribute open source github creator karim osman typeScript python r simulator',
      content: (
        <p className="text-gray-900 mb-3">
          The Forest Impact Simulator was created by{' '}
          <a
            href="https://kar.im"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            Karim Osman
          </a>{' '}
          to simulate and analyze the environmental impact of forest planting and clear-cutting operations. This tool is completely
          open-source and available on GitHub. The simulator is available as a{' '}
          <a
            href="https://github.com/KarimOsmanGH/forest-impact-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            TypeScript (web)
          </a>
          ,{' '}
          <a
            href="https://github.com/KarimOsmanGH/forest-impact-simulator-python"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            Python notebook
          </a>
          , and{' '}
          <a
            href="https://github.com/KarimOsmanGH/forest-impact-simulator-r"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            R notebook
          </a>
          . We welcome contributions from the community! Whether you&apos;re a developer, environmental scientist, or forestry expert, there
          are many ways to help improve this simulator.
        </p>
      ),
    },
    {
      id: 2,
      title: 'What is planting mode and how does it work?',
      searchText: 'planting mode how it works carbon sequestration reforestation carbon offset biodiversity restoration environmental planning',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            Planting mode allows you to analyze the environmental benefits of forest restoration and tree planting operations. This mode is
            useful for:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-2">
            <li>
              <strong>Reforestation Projects:</strong> Planning and quantifying the benefits of tree planting initiatives
            </li>
            <li>
              <strong>Carbon Offset Planning:</strong> Calculating potential carbon sequestration from new forests
            </li>
            <li>
              <strong>Biodiversity Restoration:</strong> Understanding how tree planting can enhance local ecosystems
            </li>
            <li>
              <strong>Environmental Planning:</strong> Evaluating the long-term environmental benefits of forest restoration
            </li>
          </ul>
          <p className="text-gray-900 mb-3">
            In planting mode, the simulator shows carbon sequestration (positive values) representing the carbon that would be absorbed from
            the atmosphere as trees grow and mature. The interface shows &quot;recommended species for this region&quot; and displays
            planting configurations with timelines for project completion.
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-primary">
              <strong>Note:</strong> This tool is for educational and planning purposes. Always consult with forestry professionals and
              environmental experts before making real-world decisions about forest management.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 3,
      title: 'What is clear-cutting mode and how does it work?',
      searchText: 'clear cutting mode how it works carbon emissions deforestation removal impacts policy analysis educational',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            Clear-cutting mode allows you to analyze the environmental impacts of forest removal operations. This mode is useful for:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-2">
            <li>
              <strong>Environmental Impact Assessment:</strong> Understanding the carbon emissions and biodiversity loss from forest removal
            </li>
            <li>
              <strong>Land Use Planning:</strong> Evaluating the trade-offs of converting forested areas to other uses
            </li>
            <li>
              <strong>Policy Analysis:</strong> Quantifying the environmental costs of deforestation
            </li>
            <li>
              <strong>Educational Purposes:</strong> Demonstrating the value of existing forests
            </li>
          </ul>
          <p className="text-gray-900 mb-3">
            In clear-cutting mode, the simulator shows carbon emissions (positive values) representing the carbon that would be released
            into the atmosphere, including both immediate emissions from tree removal and the lost future sequestration capacity. You can
            specify the average age of trees in the forest area to get more accurate calculations. The interface adapts to show &quot;forest
            types present in this region&quot; instead of &quot;recommended species&quot; and displays removal configurations with tree age
            settings.
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-primary">
              <strong>Note:</strong> This tool is for educational and planning purposes. Always consult with forestry professionals and
              environmental experts before making real-world decisions about forest management.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 4,
      title: 'What do the different impact analysis tabs show?',
      searchText: 'impact analysis tabs environment economic social land use what do they show',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            The impact analysis is organized into four comprehensive tabs, each focusing on different aspects of forest impact:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-2">
            <li>
              <strong>Environment Tab:</strong> Core environmental metrics including soil data, climate information, carbon
              sequestration/emissions, biodiversity impact, forest resilience, water retention, and air quality improvement. This is the most
              detailed tab with real-time environmental data integration.
            </li>
            <li>
              <strong>Economic Tab:</strong> Economic benefits such as job creation estimates, conservation value, and economic impact
              calculations based on forest size and type.
            </li>
            <li>
              <strong>Social Tab:</strong> Community benefits, social impact scores, and societal value of forest restoration or the social
              costs of forest removal.
            </li>
            <li>
              <strong>Land Use Tab:</strong> Land management impacts including erosion reduction, soil improvement, habitat creation, and
              land use change effects.
            </li>
          </ul>
          <p className="text-gray-900 mb-3">
            Each tab provides detailed metrics, real-world comparisons, and context-specific information to help you understand the full
            scope of forest impact in your selected region.
          </p>
        </>
      ),
    },
    {
      id: 5,
      title: 'How accurate are the carbon sequestration estimates?',
      searchText: 'how accurate carbon sequestration estimates ipcc growth model clear cutting calculations',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            Our estimates are based on{' '}
            <a
              href="https://www.ipcc.ch/report/ar4/wg1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              IPCC Fourth Assessment Report
            </a>{' '}
            data, with species-specific rates ranging from 15-30 kg CO₂/year for mature trees. We apply realistic growth curves that account
            for the fact that young trees sequester much less carbon than mature ones.
          </p>
          <p className="text-gray-900 mb-3">
            <strong>Growth Model:</strong> Trees don&apos;t reach full capacity immediately. Our realistic model shows: Year 1-3 (5-15% of
            mature rate), Year 4-10 (15-80% of mature rate), Year 11-20 (80-95% of mature rate), and Year 20+ (95-100% of mature rate). This
            reflects real-world tree growth patterns and provides more accurate long-term projections.
          </p>
          <p className="text-gray-900 mb-3">
            <strong>Clear-cutting Carbon Calculations:</strong> In clear-cutting mode, the simulator calculates immediate carbon release as
            the tree&apos;s current annual sequestration rate (representing carbon released when the tree is cut down) plus lost future
            sequestration (carbon that would have been absorbed over the simulation period). This provides realistic emission estimates
            based on the actual age of trees being removed.
          </p>
          <p className="text-gray-900 mb-3">The simulator also factors in local soil conditions and climate data for more accurate predictions.</p>
        </>
      ),
    },
    {
      id: 6,
      title: "What's the difference between single and multiple tree selection?",
      searchText: 'difference between single and multiple tree selection forest mix equal split percentages',
      content: (
        <p className="text-gray-900 mb-3">
          Single tree selection uses the specific carbon sequestration rate of that species. Multiple tree selection allows you to create a
          mixed forest with custom percentage distributions. You can either use the &quot;Equal Split&quot; option for balanced distribution
          or manually set percentages for each species to reflect your forest management strategy.
        </p>
      ),
    },
    {
      id: 7,
      title: 'How are environmental factors calculated and what benefits do they provide?',
      searchText: 'environmental factors calculated benefits soilgrids open meteo biodiversity resilience water retention air quality',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            <strong>Environmental Data Sources:</strong> The simulator uses real-time data from multiple sources: Soil carbon content from{' '}
            <a
              href="https://soilgrids.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              ISRIC SoilGrids
            </a>{' '}
            (adds 0.1 kg CO₂/year per g/kg of soil carbon) and climate data from{' '}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              Open-Meteo
            </a>{' '}
            (precipitation affects forest resilience). Biodiversity values are based on scientific literature and species-specific
            ecological characteristics. When environmental data is unavailable, the simulator uses climate-zone based estimates to ensure
            calculations remain accurate.
          </p>
          <p className="text-gray-900 mb-3">
            <strong>Environmental Benefits Calculated:</strong> Beyond carbon sequestration, the simulator calculates biodiversity impact
            (how well the forest supports wildlife), forest resilience (ability to withstand climate stresses), water retention (improved
            soil moisture and reduced runoff), and air quality improvement (pollution filtration). In planting mode, these metrics improve
            over time and scale with forest size. In clear-cutting mode, these metrics degrade over time and scale with the extent of forest
            removal. These metrics provide a comprehensive view of the forest&apos;s environmental contribution or impact.
          </p>
        </>
      ),
    },
    {
      id: 8,
      title: 'Why should I simulate different time periods?',
      searchText: 'why simulate different time periods years long term short term',
      content: (
        <p className="text-gray-900 mb-3">
          Different time periods show how forest impact compounds over time. Short-term simulations (1-5 years) show immediate benefits like
          soil stabilization and initial carbon capture. Long-term simulations (10-100 years) reveal the full potential for carbon
          sequestration, biodiversity enhancement, and ecosystem restoration. This helps in planning both immediate and long-term
          environmental strategies.
        </p>
      ),
    },
    {
      id: 9,
      title: 'How can I use this simulator for real-world projects?',
      searchText: 'use simulator for real world projects reforestation urban tree planting carbon offset impact assessment',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            The simulator is perfect for planning reforestation projects, urban tree planting initiatives, carbon offset programs, and
            environmental impact assessments. Use it to compare different tree species for your climate zone, estimate long-term
            environmental benefits, analyze the impacts of forest removal, and communicate the impact of your projects to stakeholders. The
            region-specific data ensures your calculations are relevant to your actual forest management area.
          </p>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-3">
            <p className="text-sm text-primary font-medium">
              &#9888;&#65039; <strong>Disclaimer:</strong> This simulator is for educational and planning purposes only. Use at your own risk.
              Always consult with forestry professionals, environmental experts, and local authorities before implementing any real-world
              projects.
            </p>
          </div>
        </>
      ),
    },
    {
      id: 10,
      title: 'What formulas and calculations does the simulator use?',
      searchText: 'formulas calculations simulator weighted average growth model climate prediction biodiversity resilience water retention air quality',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-black mb-2">Carbon Sequestration</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Weighted Average Formula:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2">Carbon = Σ(Treeᵢ × Percentageᵢ) / 100</code>
              <p className="mb-2">
                <strong>Environmental Modifiers:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2">Soil Bonus = Soil Carbon (g/kg) × 0.1 kg CO₂/year</code>
              <code className="block bg-white p-2 rounded mb-2">Final Carbon = Base Carbon + Soil Bonus</code>
              <p className="mt-2 text-sm text-black">
                <strong>Display Values:</strong>
              </p>
              <code className="block bg-white p-2 rounded text-black">Annual Carbon = Yearly sequestration rate</code>
              <code className="block bg-white p-2 rounded text-black">Total Carbon = Cumulative over entire simulation period</code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Tree Growth Model</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>4-Phase Growth Model:</strong>
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-black">
                <div>
                  <strong>Years 1-3:</strong> Establishment phase (5-15% of mature rate)
                </div>
                <div>
                  <strong>Years 4-10:</strong> Rapid growth phase (15-80% of mature rate)
                </div>
                <div>
                  <strong>Years 11-20:</strong> Maturation phase (80-95% of mature rate)
                </div>
                <div>
                  <strong>Years 20+:</strong> Mature phase (95-100% of mature rate)
                </div>
              </div>
              <p className="mt-2 text-sm text-black">
                <strong>Annual Carbon Calculation:</strong>
              </p>
              <code className="block bg-white p-2 rounded text-black">Annual Carbon = Mature Rate × Growth Factor (based on year)</code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Climate Prediction</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Temperature Trend Analysis:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Historical Data = 11 years of temperature records</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Linear Regression = Calculate temperature trend (°C/year)</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Future Temperature = Current + (Trend × Years)</code>
              <p className="mt-2 mb-2 text-sm text-black">
                <strong>Growth Modifier:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Temperature Change = Future Temp - Current Temp</code>
              <code className="block bg-white p-2 rounded text-black">Growth Modifier = 1 + (Temperature Change × 0.02)</code>
              <p className="mt-2 text-sm text-black">
                <strong>Regional Estimates (fallback):</strong>
              </p>
              <code className="block bg-white p-2 rounded text-black">
                Tropical: 25°C, Temperate: 15°C, Boreal: 5°C, Arctic: -5°C
              </code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Biodiversity Impact</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Species Diversity Score:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Base Score = Average biodiversity value (1-5)</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Multiplier = 1 + (Number of species - 1) × 0.1</code>
              <code className="block bg-white p-2 rounded text-black">Final Score = min(Base Score × Multiplier, 5)</code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Forest Resilience</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Resilience Calculation:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Base Resilience = Average resilience score (1-5)</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Climate Bonus = Precipitation (mm) × 0.001</code>
              <code className="block bg-white p-2 rounded text-black">Final Resilience = min(Base + Climate Bonus, 5)</code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Water Retention</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Progressive Enhancement:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Base Retention = 70-85% (based on latitude)</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Annual Improvement = 0.3% per year</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Precipitation Bonus = Annual Precipitation (mm) × 0.01</code>
              <code className="block bg-white p-2 rounded text-black">
                Water Retention = min(Base + (Years × 0.3) + Bonus, 95%)
              </code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Air Quality Improvement</h4>
            <div className="bg-gray-50 p-3 rounded text-sm text-black">
              <p className="mb-2">
                <strong>Progressive Enhancement:</strong>
              </p>
              <code className="block bg-white p-2 rounded mb-2 text-black">Base Quality = 60%</code>
              <code className="block bg-white p-2 rounded mb-2 text-black">Annual Improvement = 0.7% per year</code>
              <code className="block bg-white p-2 rounded text-black">Air Quality = min(Base + (Years × 0.7), 95%)</code>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-black mb-2">Mathematical Notation</h4>
            <div className="bg-gray-50 p-3 rounded text-base text-black">
              <ul className="space-y-2">
                <li>
                  <strong>Σ:</strong> Summation across all selected tree species
                </li>
                <li>
                  <strong>Treeᵢ:</strong> Carbon sequestration rate of tree species i
                </li>
                <li>
                  <strong>Percentageᵢ:</strong> User-specified percentage for tree species i
                </li>
                <li>
                  <strong>n:</strong> Number of selected tree species
                </li>
                <li>
                  <strong>Years:</strong> Simulation duration in years
                </li>
                <li>
                  <strong>min():</strong> Function returning the minimum value (capping at maximum)
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 11,
      title: 'What tree species are included in the database?',
      searchText: 'what tree species are included database temperate tropical boreal arid subtropical',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            Our comprehensive tree database includes 80 species from around the world, covering diverse ecosystems and 7 major climate
            zones:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-1">
            <li>
              <strong>Temperate Trees:</strong> Oak, Beech, Ash, Maple, Birch, and European/North American species
            </li>
            <li>
              <strong>Coniferous Trees:</strong> Pine, Spruce, Cedar, Redwood, and other evergreens
            </li>
            <li>
              <strong>Tropical Trees:</strong> Mahogany, Teak, Mango, Mangrove, and tropical hardwoods
            </li>
            <li>
              <strong>Mediterranean Trees:</strong> Olive, Cork Oak, Aleppo Pine, and Mediterranean climate species
            </li>
            <li>
              <strong>Boreal Trees:</strong> Black Spruce, White Spruce, Balsam Fir, Tamarack, Jack Pine, and northern forest species
            </li>
            <li>
              <strong>Arid Zone Trees:</strong> Mesquite, Palo Verde, Desert Ironwood, Joshua Tree, and drought-resistant species
            </li>
            <li>
              <strong>Subtropical Trees:</strong> Live Oak, Bald Cypress, Southern Magnolia, Pecan, and warm climate species
            </li>
          </ul>
          <p className="text-gray-900 mb-3">
            Each tree species includes detailed data on carbon sequestration rates, growth characteristics, biodiversity value, climate
            preferences, and environmental impact factors. The database is continuously updated with new species and improved data.
          </p>
        </>
      ),
    },
    {
      id: 12,
      title: 'What export formats are available and how can I use them?',
      searchText: 'export formats available pdf geojson json csv share link how to use',
      content: (
        <>
          <p className="text-gray-900 mb-3">The simulator offers multiple export and sharing options to suit different use cases:</p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-2">
            <li>
              <strong>PDF Report:</strong> Professional formatted report with all analysis results, charts, and metrics. Perfect for
              presentations, reports, and documentation.
            </li>
            <li>
              <strong>GeoJSON:</strong> Geographic data format for GIS professionals and mapping tools. Includes point features (analysis
              location) and polygon features (forest region) with all environmental metrics as properties.
            </li>
            <li>
              <strong>JSON:</strong> Complete structured data export for developers and data analysis. Contains all simulation parameters,
              environmental data, impact results, and forest management specifications.
            </li>
            <li>
              <strong>CSV:</strong> Spreadsheet-friendly format organized by sections (metadata, trees, environmental data, results, forest
              data) for use in Excel, R, Python, and other data analysis tools.
            </li>
            <li>
              <strong>Share Link:</strong> Generate a shareable URL that preserves your entire analysis configuration. Others can view your
              exact analysis by opening the link, with all settings, species selections, and region data preserved.
            </li>
          </ul>
          <p className="text-gray-900 mb-3">
            All exports include timestamps and are automatically generated once you complete your analysis. Files are downloaded directly to
            your browser with descriptive filenames.
          </p>
        </>
      ),
    },
    {
      id: 13,
      title: 'Why does environmental data sometimes show as "Estimated"?',
      searchText: 'why environmental data sometimes show estimated fallback climate zone api soilgrids open meteo cache',
      content: (
        <>
          <p className="text-gray-900 mb-3">
            The Forest Impact Simulator fetches real-time environmental data from two scientific sources:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-1">
            <li>
              <strong>Soil data:</strong>{' '}
              <a
                href="https://soilgrids.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                ISRIC SoilGrids
              </a>{' '}
              (global soil property database)
            </li>
            <li>
              <strong>Climate data:</strong>{' '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                Open-Meteo
              </a>{' '}
              (weather and climate API)
            </li>
          </ul>
          <p className="text-gray-900 mb-3">Sometimes this data cannot be fetched because:</p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-1">
            <li>The APIs may be temporarily unavailable or experiencing high latency</li>
            <li>Your selected location may not have data coverage in these databases</li>
            <li>Network connectivity issues or firewall/ad-blocker restrictions</li>
            <li>API rate limits may be reached during high traffic periods</li>
          </ul>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
            <p className="text-sm text-primary">
              <strong>Don&apos;t worry!</strong> When real-time data is unavailable, the simulator automatically uses{' '}
              <strong>scientifically-based estimates</strong> derived from:
            </p>
            <ul className="list-disc pl-6 text-sm text-primary mt-2 space-y-1">
              <li>Climate zone analysis (based on latitude)</li>
              <li>Regional climate patterns</li>
              <li>Established environmental science models</li>
            </ul>
          </div>
          <p className="text-gray-900 mb-3">
            These estimates are reliable and the calculations remain accurate. You&apos;ll see an &quot;(Estimated)&quot; indicator when
            fallback data is used. Additionally:
          </p>
          <ul className="list-disc pl-6 text-gray-900 mb-3 space-y-1">
            <li>
              Data is <strong>cached locally</strong> for 1 hour to reduce API calls
            </li>
            <li>The simulator tries 3 times with different timeouts before using estimates</li>
            <li>Estimated values are based on peer-reviewed climate zone classifications</li>
          </ul>
        </>
      ),
    },
  ];

  // Load state from URL on mount
  useEffect(() => {
    const shareParam = getShareParameterFromUrl();
    if (shareParam) {
      const state = decodeUrlToState(shareParam);
      if (state) {
        console.log('Loading shared analysis:', state);
        setSimulationMode(state.mode);
        setYears(state.years);
        setCalculationMode(state.calculationMode);
        if (state.averageTreeAge) setAverageTreeAge(state.averageTreeAge);
        if (state.latitude && state.longitude) {
          setSelectedLatitude(state.latitude);
          setSelectedLongitude(state.longitude);
        }
        if (state.region) {
          setSelectedRegion(state.region);
        }
        // Load selected trees
        if (state.treeIds.length > 0) {
          const trees = TREE_TYPES.filter(t => state.treeIds.includes(t.id));
          setSelectedTrees(trees);
          setTreePercentages(state.treePercentages || {});
        }
      }
    }
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLatitude(lat);
    setSelectedLongitude(lng);
    // Clear any existing region selection when point is selected
    setSelectedRegion(null);
  };

  const handleSearchLocation = (lat: number, lng: number, name: string) => {
    setSelectedLatitude(lat);
    setSelectedLongitude(lng);
    // Clear any existing region selection when location is searched
    setSelectedRegion(null);
    // You could add a toast notification here to show the searched location
    console.log(`Searched for: ${name} at ${lat}, ${lng}`);
  };

  const handleRegionSelect = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    setSelectedRegion(bounds);
    // Clear any existing point selection when region is selected
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleTreeSelectionChange = (trees: TreeType[]) => {
    setSelectedTrees(trees);
    // Clear percentages when trees change
    const newPercentages: { [key: string]: number } = {};
    trees.forEach(tree => {
      newPercentages[tree.id] = 0;
    });
    setTreePercentages(newPercentages);
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleTreePercentagesChange = (percentages: { [key: string]: number }) => {
    setTreePercentages(percentages);
    // Clear planting data as it needs to be recalculated
    setPlantingData(null);
  };

  const handleImpactDataReady = (data: Partial<ExportData>) => {
    try {
      setExportData(prev => prev ? { ...prev, ...data } : data as ExportData);
    } catch (error) {
      console.warn('Error updating impact data:', error);
    }
  };

  const handlePlantingDataReady = (data: Partial<ExportData>) => {
    try {
      setExportData(prev => prev ? { ...prev, ...data } : data as ExportData);
      // Store planting data for ForestImpactCalculator
      if (data.plantingData) {
        setPlantingData(data.plantingData);
      }
    } catch (error) {
      console.warn('Error updating planting data:', error);
    }
  };

  const handleSoilClimateDataReady = (soil: { carbon: number | null; ph: number | null } | null, climate: { temperature: number | null; precipitation: number | null; historicalData?: { temperatures: number[]; precipitations: number[] } } | null) => {
    setSoilData(soil);
    setClimateData(climate);
  };

  const handleReset = () => {
    if (window.confirm('Reset all selections and start over? This will clear your current analysis.')) {
      setSelectedLatitude(null);
      setSelectedLongitude(null);
      setSelectedRegion(null);
      setYears(50);
      setCalculationMode('perArea');
      setAverageTreeAge(20);
      setSelectedTrees([]);
      setTreePercentages({});
      setPlantingData(null);
      setSoilData(null);
      setClimateData(null);
      setExportData(null);
      // Don't reset simulationMode to preserve user's choice
      // Clear URL parameter
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  };

  const handleShare = async () => {
    const state: ShareableState = {
      mode: simulationMode,
      latitude: selectedLatitude || undefined,
      longitude: selectedLongitude || undefined,
      region: selectedRegion || undefined,
      years,
      calculationMode,
      averageTreeAge: simulationMode === 'clear-cutting' ? averageTreeAge : undefined,
      treeIds: selectedTrees.map(t => t.id),
      treePercentages
    };

    const url = generateShareableUrl(state);
    const success = await copyToClipboard(url);
    
    if (success) {
      setShareNotification('Link copied to clipboard!');
      setTimeout(() => setShareNotification(null), 3000);
    } else {
      setShareNotification('Failed to copy link. Please try again.');
      setTimeout(() => setShareNotification(null), 3000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-8 lg:p-12">
      <div className="container mx-auto max-w-7xl w-full">
        <section className="text-center mb-12 space-y-section" aria-labelledby="main-heading">
          <h1 id="main-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-gray-900">
            Simulate the Impact of Forest Management
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-4xl mx-auto text-center leading-relaxed">
            Use real-time environmental data to analyze the impacts of forest planting and clear-cutting on carbon storage, biodiversity, economic value, social outcomes, and land use.
          </p>
        </section>
        
        {/* Simulation Mode Selector and Reset Button */}
        <div className="mb-10 md:mb-12">
          <div className="flex justify-center items-center gap-4 md:gap-6 flex-wrap">
            <div className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-2 shadow-xl">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSimulationMode('planting')}
                  aria-label="Switch to planting mode"
                  aria-pressed={simulationMode === 'planting'}
                  className={`relative px-6 md:px-8 py-3 md:py-4 rounded-xl text-base md:text-lg font-semibold transition-all duration-300 flex items-center gap-2 md:gap-3 ${
                    simulationMode === 'planting'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.636 5.636l.707.707m11.314 11.314l.707.707M5.636 18.364l.707-.707m11.314-11.314l.707-.707" />
                    <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
                  </svg>
                  <span>Planting</span>
                  {simulationMode === 'planting' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  )}
                </button>
                <div className="w-px h-10 bg-gray-200 mx-1" />
                <button
                  onClick={() => setSimulationMode('clear-cutting')}
                  aria-label="Switch to clear-cutting mode"
                  aria-pressed={simulationMode === 'clear-cutting'}
                  className={`relative px-6 md:px-8 py-3 md:py-4 rounded-xl text-base md:text-lg font-semibold transition-all duration-300 flex items-center gap-2 md:gap-3 ${
                    simulationMode === 'clear-cutting'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span>Clear-cutting</span>
                  {simulationMode === 'clear-cutting' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                  )}
                </button>
              </div>
            </div>
            {/* Reset Button */}
            {(selectedLatitude || selectedLongitude || selectedRegion || selectedTrees.length > 0) && (
              <button
                onClick={handleReset}
                className="bg-white border-2 border-red-300 text-red-700 hover:bg-red-50 px-5 md:px-6 py-3 md:py-4 rounded-xl text-base md:text-lg font-semibold transition-colors shadow-md hover:shadow-lg flex items-center gap-2 md:gap-3"
                title="Reset all selections"
                aria-label="Reset all selections"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>
        
        {/* Share Notification Toast */}
        {shareNotification && (
          <div className="fixed top-4 right-4 z-50 bg-primary text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {shareNotification}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12">
            <div className="bg-white border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-full flex-shrink-0">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 md:w-7 md:h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 11c0 4.5 7 11 7 11s7-6.5 7-11a7 7 0 10-14 0z"
                    />
                  </svg>
                  <span className="sr-only">Location step icon</span>
                </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Select Location</h2>
                <div className="text-base md:text-lg text-gray-700 space-y-2">
                  <p className="font-semibold">How to select:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Desktop:</strong> Press CTRL + mouse click and drag.</li>
                    <li><strong>Mobile:</strong> Tap to create a selection square, then drag to resize.</li>
                  </ul>
                </div>
              </div>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <LocationMap 
                onLocationSelect={handleLocationSelect}
                onRegionSelect={handleRegionSelect}
                onSearchLocation={handleSearchLocation}
                initialRegion={selectedRegion}
                initialLatitude={selectedLatitude}
                initialLongitude={selectedLongitude}
              />
            </Suspense>
          </div>
          
          <div className="bg-white border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-full flex-shrink-0">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 md:w-7 md:h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l4 6H8l4-6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10l3 5H9l3-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v5" />
                  </svg>
                  <span className="sr-only">Tree selection icon</span>
                </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                  {simulationMode === 'planting' ? 'Select Tree Species' : 'Select Tree Species'}
                </h2>
                <p className="text-base md:text-lg text-gray-700">
                  {simulationMode === 'planting' 
                    ? 'Select one or multiple tree types and set their distribution'
                    : 'Select the tree species to be removed and their composition'
                  }
                </p>
              </div>
            </div>
            <div className="flex-1">
              <Suspense fallback={
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              }>
                <TreeTypeSelector
                  selectedTrees={selectedTrees}
                  onTreeSelectionChange={handleTreeSelectionChange}
                  treePercentages={treePercentages}
                  onTreePercentagesChange={handleTreePercentagesChange}
                  latitude={selectedLatitude || undefined}
                  selectedRegion={selectedRegion}
                  simulationMode={simulationMode}
                />
              </Suspense>
            </div>
          </div>
        </div>
        
        {/* Combined Calculator and Impact Results - Full Width */}
        <div className="mt-16 md:mt-24">
          <div className="bg-white border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-lg">
            <div className="flex items-start gap-4 mb-8">
                <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-full flex-shrink-0">
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 md:w-7 md:h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 15v4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7v12" />
                  </svg>
                  <span className="sr-only">Impact analysis icon</span>
                </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Impact Results</h2>
                <p className="text-base md:text-lg text-gray-700">
                  {simulationMode === 'planting' 
                    ? 'Calculate planting details and see environmental benefits'
                    : 'Calculate removal details and see environmental impacts'
                  }
                </p>
              </div>
            </div>
            
            {(selectedRegion || (selectedLatitude && selectedLongitude)) && selectedTrees.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calculator Section */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                    {simulationMode === 'planting' ? 'Planting Calculations' : 'Removal Configuration'}
                  </h3>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <TreePlantingCalculator
                      selectedRegion={selectedRegion || (selectedLatitude && selectedLongitude ? {
                        north: selectedLatitude + 0.01,
                        south: selectedLatitude - 0.01,
                        east: selectedLongitude + 0.01,
                        west: selectedLongitude - 0.01
                      } : null)}
                      selectedTreeType={selectedTrees.length === 1 ? selectedTrees[0] : null}
                      selectedTrees={selectedTrees}
                      treePercentages={treePercentages}
                      onDataReady={handlePlantingDataReady}
                      simulationMode={simulationMode}
                      years={years}
                      onYearsChange={setYears}
                      onCalculationModeChange={setCalculationMode}
                      onTreeAgeChange={setAverageTreeAge}
                      soil={soilData}
                      climate={climateData}
                    />
                  </Suspense>
                </div>
                
                {/* Impact Results Section */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Impact Analysis</h3>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <ForestImpactCalculator 
                      latitude={selectedLatitude || (selectedRegion ? (selectedRegion.north + selectedRegion.south) / 2 : null)}
                      longitude={selectedLongitude || (selectedRegion ? (selectedRegion.east + selectedRegion.west) / 2 : null)}
                      years={years}
                      selectedTreeType={selectedTrees.length === 1 ? selectedTrees[0] : null}
                      selectedTrees={selectedTrees.length > 1 ? selectedTrees : undefined}
                      treePercentages={treePercentages}
                      selectedRegion={selectedRegion}
                      plantingData={plantingData}
                      onYearsChange={setYears}
                      onDataReady={handleImpactDataReady}
                      simulationMode={simulationMode}
                      calculationMode={calculationMode}
                      averageTreeAge={averageTreeAge}
                      onSoilClimateDataReady={handleSoilClimateDataReady}
                    />
                  </Suspense>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  {simulationMode === 'planting' 
                    ? 'Select a region and tree types to see planting calculations and environmental impact analysis.'
                    : 'Select a region and forest type to see removal calculations and environmental impact analysis.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Export and Share Results Section */}
        <div className="mt-12 md:mt-16 bg-white border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-lg">
          <Suspense fallback={
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          }>
            <ExportResults 
              exportData={exportData || {
                metadata: {
                  timestamp: new Date().toISOString(),
                  simulatorVersion: "1.0.0",
                  location: {
                    latitude: selectedLatitude,
                    longitude: selectedLongitude,
                    region: selectedRegion
                  },
                  simulation: {
                    years,
                    selectedTrees,
                    treePercentages
                  }
                },
                environmentalData: {},
                impactResults: {
                  carbonSequestration: 0,
                  biodiversityImpact: 0,
                  forestResilience: 0,
                  waterRetention: 0,
                  airQualityImprovement: 0,
                  totalCarbon: 0,
                  averageBiodiversity: 0,
                  averageResilience: 0
                }
              }}
              disabled={!selectedTrees.length || (!selectedLatitude && !selectedLongitude && !selectedRegion)}
              shareableState={(selectedLatitude || selectedLongitude || selectedRegion) && selectedTrees.length > 0 ? {
                mode: simulationMode,
                latitude: selectedLatitude || undefined,
                longitude: selectedLongitude || undefined,
                region: selectedRegion || undefined,
                years,
                calculationMode,
                averageTreeAge: simulationMode === 'clear-cutting' ? averageTreeAge : undefined,
                treeIds: selectedTrees.map(t => t.id),
                treePercentages
              } : undefined}
              onShareSuccess={(message) => {
                setShareNotification(message);
                setTimeout(() => setShareNotification(null), 3000);
              }}
            />
          </Suspense>
        </div>
        


        {/* FAQ Section */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-10 flex items-center justify-center gap-4 text-gray-900">
            <span className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-full text-xl md:text-2xl font-bold">
              ?
            </span>
            Frequently Asked Questions
          </h2>

          {/* FAQ Search */}
          <div className="max-w-xl mx-auto mb-6">
            <label htmlFor="faq-search" className="sr-only">
              Search frequently asked questions
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
              </span>
              <input
                id="faq-search"
                type="text"
                value={faqSearch}
                onChange={(e) => {
                  setFaqSearch(e.target.value);
                  setFaqShowAll(false);
                }}
                placeholder="Search questions about modes, data, exports, and more..."
                className="w-full rounded-xl border-2 border-gray-300 bg-white py-3 md:py-4 pl-11 pr-4 text-base md:text-lg text-gray-900 placeholder:text-gray-400 shadow-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="mt-3 text-sm md:text-base text-center text-gray-600">
              Try searching for terms like &quot;clear-cutting&quot;, &quot;carbon&quot;, &quot;exports&quot;, or &quot;species&quot;.
            </p>
          </div>

          {/* FAQ List */}
          <div className="max-w-4xl mx-auto space-y-4">
            {(() => {
              const query = faqSearch.trim().toLowerCase();
              const filtered = query
                ? faqs.filter((faq) => faq.searchText.toLowerCase().includes(query) || faq.title.toLowerCase().includes(query))
                : faqs;
              const visible = !query && !faqShowAll ? filtered.slice(0, 5) : filtered;

              if (!visible.length) {
                return (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 md:p-10 text-center text-base md:text-lg text-gray-700">
                    No questions match your search yet. Try a different keyword or clear the search box.
                  </div>
                );
              }

              return (
                <>
                  {visible.map((faq) => (
                    <div key={faq.id} className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden mb-4">
                      <button
                        onClick={() => setFaqOpen((prev) => ({ ...prev, [faq.id]: !prev[faq.id] }))}
                        className="w-full p-6 md:p-8 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        aria-expanded={!!faqOpen[faq.id]}
                      >
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 pr-4">{faq.title}</h3>
                        <svg
                          className={`w-6 h-6 md:w-7 md:h-7 text-gray-500 transition-transform flex-shrink-0 ${faqOpen[faq.id] ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {faqOpen[faq.id] && <div className="px-6 md:px-8 pb-6 md:pb-8 text-base md:text-lg text-gray-700 leading-relaxed">{faq.content}</div>}
                    </div>
                  ))}

                  {!query && filtered.length > 5 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setFaqShowAll((prev) => !prev)}
                        className="inline-flex items-center gap-3 rounded-full border-2 border-primary/30 bg-primary/5 px-5 md:px-6 py-3 md:py-4 text-base md:text-lg font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <span>{faqShowAll ? 'Show fewer questions' : `Show ${filtered.length - 5} more questions`}</span>
                        <svg
                          className={`h-5 w-5 md:h-6 md:w-6 transition-transform ${faqShowAll ? 'rotate-180' : ''}`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

      </div>
    </main>
  );
}
