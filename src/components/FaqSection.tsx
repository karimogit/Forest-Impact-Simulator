"use client";

import React, { useState } from 'react';
import { ChevronDownIcon, SearchIcon } from './ui/Icons';
import { Callout, Eyebrow } from './ui/primitives';

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="font-medium text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
  >
    {children}
  </a>
);

const Formula = ({ children }: { children: React.ReactNode }) => (
  <code className="block rounded-lg border border-sand-200 bg-white px-3 py-2 font-mono text-[13px] text-ink-900">
    {children}
  </code>
);

const FormulaGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="mb-2 text-sm font-semibold text-ink-900">{title}</h4>
    <div className="space-y-2 rounded-2xl bg-sand-50 p-3">{children}</div>
  </div>
);

const EducationalNote = () => (
  <Callout tone="accent" className="mt-4">
    <strong>Note:</strong> This tool is for educational and planning purposes. Always consult with forestry
    professionals and environmental experts before making real-world decisions about forest management.
  </Callout>
);

const faqs = [
  {
    id: 1,
    title: 'Who made this tool and how can I contribute?',
    searchText: 'who made this tool contribute open source github creator karim osman typeScript python r simulator',
    content: (
      <p>
        The Forest Impact Simulator was created by <ExternalLink href="https://kar.im">Karim Osman</ExternalLink> to
        simulate and analyze the environmental impact of forest planting and clear-cutting operations. This tool is
        completely open-source and available on GitHub. The simulator is available as a{' '}
        <ExternalLink href="https://github.com/KarimOsmanGH/forest-impact-simulator">TypeScript (web)</ExternalLink>,{' '}
        <ExternalLink href="https://github.com/KarimOsmanGH/forest-impact-simulator-python">Python notebook</ExternalLink>,
        and <ExternalLink href="https://github.com/KarimOsmanGH/forest-impact-simulator-r">R notebook</ExternalLink>. We
        welcome contributions from the community! Whether you&apos;re a developer, environmental scientist, or forestry
        expert, there are many ways to help improve this simulator.
      </p>
    ),
  },
  {
    id: 2,
    title: 'What is planting mode and how does it work?',
    searchText: 'planting mode how it works carbon sequestration reforestation carbon offset biodiversity restoration environmental planning',
    content: (
      <>
        <p>
          Planting mode allows you to analyze the environmental benefits of forest restoration and tree planting
          operations. This mode is useful for:
        </p>
        <ul>
          <li><strong>Reforestation Projects:</strong> Planning and quantifying the benefits of tree planting initiatives</li>
          <li><strong>Carbon Offset Planning:</strong> Calculating potential carbon sequestration from new forests</li>
          <li><strong>Biodiversity Restoration:</strong> Understanding how tree planting can enhance local ecosystems</li>
          <li><strong>Environmental Planning:</strong> Evaluating the long-term environmental benefits of forest restoration</li>
        </ul>
        <p>
          In planting mode, the simulator shows carbon sequestration (positive values) representing the carbon that
          would be absorbed from the atmosphere as trees grow and mature. The interface shows &quot;recommended species
          for this region&quot; and displays planting configurations with timelines for project completion.
        </p>
        <EducationalNote />
      </>
    ),
  },
  {
    id: 3,
    title: 'What is clear-cutting mode and how does it work?',
    searchText: 'clear cutting mode how it works carbon emissions deforestation removal impacts policy analysis educational',
    content: (
      <>
        <p>Clear-cutting mode allows you to analyze the environmental impacts of forest removal operations. This mode is useful for:</p>
        <ul>
          <li><strong>Environmental Impact Assessment:</strong> Understanding the carbon emissions and biodiversity loss from forest removal</li>
          <li><strong>Land Use Planning:</strong> Evaluating the trade-offs of converting forested areas to other uses</li>
          <li><strong>Policy Analysis:</strong> Quantifying the environmental costs of deforestation</li>
          <li><strong>Educational Purposes:</strong> Demonstrating the value of existing forests</li>
        </ul>
        <p>
          In clear-cutting mode, the simulator shows carbon emissions (positive values) representing the carbon that
          would be released into the atmosphere, including both immediate emissions from tree removal and the lost
          future sequestration capacity. You can specify the average age of trees in the forest area to get more
          accurate calculations. The interface adapts to show &quot;forest types present in this region&quot; instead of
          &quot;recommended species&quot; and displays removal configurations with tree age settings.
        </p>
        <EducationalNote />
      </>
    ),
  },
  {
    id: 4,
    title: 'What do the different impact analysis tabs show?',
    searchText: 'impact analysis tabs environment economic social land use what do they show',
    content: (
      <>
        <p>The impact analysis is organized into four comprehensive tabs, each focusing on different aspects of forest impact:</p>
        <ul>
          <li>
            <strong>Environment Tab:</strong> Core environmental metrics including soil data, climate information, carbon
            sequestration/emissions, biodiversity impact, forest resilience, water retention, and air quality improvement.
            This is the most detailed tab with real-time environmental data integration.
          </li>
          <li>
            <strong>Economic Tab:</strong> Economic benefits such as job creation estimates, conservation value, and economic
            impact calculations based on forest size and type.
          </li>
          <li>
            <strong>Social Tab:</strong> Community benefits, social impact scores, and societal value of forest restoration or
            the social costs of forest removal.
          </li>
          <li>
            <strong>Land Use Tab:</strong> Land management impacts including erosion reduction, soil improvement, habitat
            creation, and land use change effects.
          </li>
        </ul>
        <p>
          Each tab provides detailed metrics, real-world comparisons, and context-specific information to help you
          understand the full scope of forest impact in your selected region.
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
        <p>
          Our estimates are based on{' '}
          <ExternalLink href="https://www.ipcc.ch/report/ar4/wg1/">IPCC Fourth Assessment Report</ExternalLink> data,
          with species-specific rates ranging from 15-30 kg CO₂/year for mature trees. We apply realistic growth curves
          that account for the fact that young trees sequester much less carbon than mature ones.
        </p>
        <p>
          <strong>Growth Model:</strong> Trees don&apos;t reach full capacity immediately. Our realistic model shows: Year
          1-3 (5-15% of mature rate), Year 4-10 (15-80% of mature rate), Year 11-20 (80-95% of mature rate), and Year 20+
          (95-100% of mature rate). This reflects real-world tree growth patterns and provides more accurate long-term
          projections.
        </p>
        <p>
          <strong>Clear-cutting Carbon Calculations:</strong> In clear-cutting mode, the simulator calculates immediate
          carbon release as the tree&apos;s current annual sequestration rate (representing carbon released when the tree
          is cut down) plus lost future sequestration (carbon that would have been absorbed over the simulation period).
          This provides realistic emission estimates based on the actual age of trees being removed.
        </p>
        <p>The simulator also factors in local soil conditions and climate data for more accurate predictions.</p>
      </>
    ),
  },
  {
    id: 6,
    title: "What's the difference between single and multiple tree selection?",
    searchText: 'difference between single and multiple tree selection forest mix equal split percentages',
    content: (
      <p>
        Single tree selection uses the specific carbon sequestration rate of that species. Multiple tree selection
        allows you to create a mixed forest with custom percentage distributions. You can either use the &quot;Equal
        Split&quot; option for balanced distribution or manually set percentages for each species to reflect your forest
        management strategy.
      </p>
    ),
  },
  {
    id: 7,
    title: 'How are environmental factors calculated and what benefits do they provide?',
    searchText: 'environmental factors calculated benefits soilgrids open meteo biodiversity resilience water retention air quality',
    content: (
      <>
        <p>
          <strong>Environmental Data Sources:</strong> The simulator uses real-time data from multiple sources: Soil
          carbon content from <ExternalLink href="https://soilgrids.org/">ISRIC SoilGrids</ExternalLink> (adds 0.1 kg
          CO₂/year per g/kg of soil carbon) and climate data from{' '}
          <ExternalLink href="https://open-meteo.com/">Open-Meteo</ExternalLink> (precipitation affects forest
          resilience). Biodiversity values are based on scientific literature and species-specific ecological
          characteristics. When environmental data is unavailable, the simulator uses climate-zone based estimates to
          ensure calculations remain accurate.
        </p>
        <p>
          <strong>Environmental Benefits Calculated:</strong> Beyond carbon sequestration, the simulator calculates
          biodiversity impact (how well the forest supports wildlife), forest resilience (ability to withstand climate
          stresses), water retention (improved soil moisture and reduced runoff), and air quality improvement (pollution
          filtration). In planting mode, these metrics improve over time and scale with forest size. In clear-cutting
          mode, these metrics degrade over time and scale with the extent of forest removal. These metrics provide a
          comprehensive view of the forest&apos;s environmental contribution or impact.
        </p>
      </>
    ),
  },
  {
    id: 8,
    title: 'Why should I simulate different time periods?',
    searchText: 'why simulate different time periods years long term short term',
    content: (
      <p>
        Different time periods show how forest impact compounds over time. Short-term simulations (1-5 years) show
        immediate benefits like soil stabilization and initial carbon capture. Long-term simulations (10-100 years)
        reveal the full potential for carbon sequestration, biodiversity enhancement, and ecosystem restoration. This
        helps in planning both immediate and long-term environmental strategies.
      </p>
    ),
  },
  {
    id: 9,
    title: 'How can I use this simulator for real-world projects?',
    searchText: 'use simulator for real world projects reforestation urban tree planting carbon offset impact assessment',
    content: (
      <>
        <p>
          The simulator is perfect for planning reforestation projects, urban tree planting initiatives, carbon offset
          programs, and environmental impact assessments. Use it to compare different tree species for your climate
          zone, estimate long-term environmental benefits, analyze the impacts of forest removal, and communicate the
          impact of your projects to stakeholders. The region-specific data ensures your calculations are relevant to
          your actual forest management area.
        </p>
        <Callout tone="warning" title="Disclaimer" className="mt-4">
          This simulator is for educational and planning purposes only. Use at your own risk. Always consult with
          forestry professionals, environmental experts, and local authorities before implementing any real-world
          projects.
        </Callout>
      </>
    ),
  },
  {
    id: 10,
    title: 'What formulas and calculations does the simulator use?',
    searchText: 'formulas calculations simulator weighted average growth model climate prediction biodiversity resilience water retention air quality',
    content: (
      <div className="space-y-5 not-prose">
        <FormulaGroup title="Carbon Sequestration">
          <p className="text-xs font-semibold text-ink-500">Weighted average formula</p>
          <Formula>Carbon = Σ(Treeᵢ × Percentageᵢ) / 100</Formula>
          <p className="text-xs font-semibold text-ink-500 pt-1">Environmental modifiers</p>
          <Formula>Soil Bonus = Soil Carbon (g/kg) × 0.1 kg CO₂/year</Formula>
          <Formula>Final Carbon = Base Carbon + Soil Bonus</Formula>
          <p className="text-xs font-semibold text-ink-500 pt-1">Display values</p>
          <Formula>Annual Carbon = Yearly sequestration rate</Formula>
          <Formula>Total Carbon = Cumulative over entire simulation period</Formula>
        </FormulaGroup>

        <FormulaGroup title="Tree Growth Model">
          <p className="text-xs font-semibold text-ink-500">4-phase growth model</p>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-ink-700">
            <div><strong>Years 1-3:</strong> Establishment phase (5-15% of mature rate)</div>
            <div><strong>Years 4-10:</strong> Rapid growth phase (15-80% of mature rate)</div>
            <div><strong>Years 11-20:</strong> Maturation phase (80-95% of mature rate)</div>
            <div><strong>Years 20+:</strong> Mature phase (95-100% of mature rate)</div>
          </div>
          <p className="text-xs font-semibold text-ink-500 pt-1">Annual carbon calculation</p>
          <Formula>Annual Carbon = Mature Rate × Growth Factor (based on year)</Formula>
        </FormulaGroup>

        <FormulaGroup title="Climate Prediction">
          <p className="text-xs font-semibold text-ink-500">Temperature trend analysis</p>
          <Formula>Historical Data = 11 years of temperature records</Formula>
          <Formula>Linear Regression = Calculate temperature trend (°C/year)</Formula>
          <Formula>Future Temperature = Current + (Trend × Years)</Formula>
          <p className="text-xs font-semibold text-ink-500 pt-1">Growth modifier</p>
          <Formula>Temperature Change = Future Temp - Current Temp</Formula>
          <Formula>Growth Modifier = 1 + (Temperature Change × 0.02)</Formula>
          <p className="text-xs font-semibold text-ink-500 pt-1">Regional estimates (fallback)</p>
          <Formula>Tropical: 25°C, Temperate: 15°C, Boreal: 5°C, Arctic: -5°C</Formula>
        </FormulaGroup>

        <FormulaGroup title="Biodiversity Impact">
          <Formula>Base Score = Average biodiversity value (1-5)</Formula>
          <Formula>Multiplier = 1 + (Number of species - 1) × 0.1</Formula>
          <Formula>Final Score = min(Base Score × Multiplier, 5)</Formula>
        </FormulaGroup>

        <FormulaGroup title="Forest Resilience">
          <Formula>Base Resilience = Average resilience score (1-5)</Formula>
          <Formula>Climate Bonus = Precipitation (mm) × 0.001</Formula>
          <Formula>Final Resilience = min(Base + Climate Bonus, 5)</Formula>
        </FormulaGroup>

        <FormulaGroup title="Water Retention">
          <Formula>Base Retention = 70-85% (based on latitude)</Formula>
          <Formula>Annual Improvement = 0.3% per year</Formula>
          <Formula>Precipitation Bonus = Annual Precipitation (mm) × 0.01</Formula>
          <Formula>Water Retention = min(Base + (Years × 0.3) + Bonus, 95%)</Formula>
        </FormulaGroup>

        <FormulaGroup title="Air Quality Improvement">
          <Formula>Base Quality = 60%</Formula>
          <Formula>Annual Improvement = 0.7% per year</Formula>
          <Formula>Air Quality = min(Base + (Years × 0.7), 95%)</Formula>
        </FormulaGroup>

        <FormulaGroup title="Mathematical Notation">
          <ul className="space-y-1.5 text-sm text-ink-700">
            <li><strong>Σ:</strong> Summation across all selected tree species</li>
            <li><strong>Treeᵢ:</strong> Carbon sequestration rate of tree species i</li>
            <li><strong>Percentageᵢ:</strong> User-specified percentage for tree species i</li>
            <li><strong>n:</strong> Number of selected tree species</li>
            <li><strong>Years:</strong> Simulation duration in years</li>
            <li><strong>min():</strong> Function returning the minimum value (capping at maximum)</li>
          </ul>
        </FormulaGroup>
      </div>
    ),
  },
  {
    id: 11,
    title: 'What tree species are included in the database?',
    searchText: 'what tree species are included database temperate tropical boreal arid subtropical',
    content: (
      <>
        <p>Our comprehensive tree database includes 80 species from around the world, covering diverse ecosystems and 7 major climate zones:</p>
        <ul>
          <li><strong>Temperate Trees:</strong> Oak, Beech, Ash, Maple, Birch, and European/North American species</li>
          <li><strong>Coniferous Trees:</strong> Pine, Spruce, Cedar, Redwood, and other evergreens</li>
          <li><strong>Tropical Trees:</strong> Mahogany, Teak, Mango, Mangrove, and tropical hardwoods</li>
          <li><strong>Mediterranean Trees:</strong> Olive, Cork Oak, Aleppo Pine, and Mediterranean climate species</li>
          <li><strong>Boreal Trees:</strong> Black Spruce, White Spruce, Balsam Fir, Tamarack, Jack Pine, and northern forest species</li>
          <li><strong>Arid Zone Trees:</strong> Mesquite, Palo Verde, Desert Ironwood, Joshua Tree, and drought-resistant species</li>
          <li><strong>Subtropical Trees:</strong> Live Oak, Bald Cypress, Southern Magnolia, Pecan, and warm climate species</li>
        </ul>
        <p>
          Each tree species includes detailed data on carbon sequestration rates, growth characteristics, biodiversity
          value, climate preferences, and environmental impact factors. The database is continuously updated with new
          species and improved data.
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
        <p>The simulator offers multiple export and sharing options to suit different use cases:</p>
        <ul>
          <li>
            <strong>PDF Report:</strong> Professional formatted report with all analysis results, charts, and metrics.
            Perfect for presentations, reports, and documentation.
          </li>
          <li>
            <strong>GeoJSON:</strong> Geographic data format for GIS professionals and mapping tools. Includes point
            features (analysis location) and polygon features (forest region) with all environmental metrics as
            properties.
          </li>
          <li>
            <strong>JSON:</strong> Complete structured data export for developers and data analysis. Contains all
            simulation parameters, environmental data, impact results, and forest management specifications.
          </li>
          <li>
            <strong>CSV:</strong> Spreadsheet-friendly format organized by sections (metadata, trees, environmental data,
            results, forest data) for use in Excel, R, Python, and other data analysis tools.
          </li>
          <li>
            <strong>Share Link:</strong> Generate a shareable URL that preserves your entire analysis configuration.
            Others can view your exact analysis by opening the link, with all settings, species selections, and region
            data preserved.
          </li>
        </ul>
        <p>
          All exports include timestamps and are automatically generated once you complete your analysis. Files are
          downloaded directly to your browser with descriptive filenames.
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
        <p>The Forest Impact Simulator fetches real-time environmental data from two scientific sources:</p>
        <ul>
          <li>
            <strong>Soil data:</strong> <ExternalLink href="https://soilgrids.org/">ISRIC SoilGrids</ExternalLink> (global
            soil property database)
          </li>
          <li>
            <strong>Climate data:</strong> <ExternalLink href="https://open-meteo.com/">Open-Meteo</ExternalLink> (weather
            and climate API)
          </li>
        </ul>
        <p>Sometimes this data cannot be fetched because:</p>
        <ul>
          <li>The APIs may be temporarily unavailable or experiencing high latency</li>
          <li>Your selected location may not have data coverage in these databases</li>
          <li>Network connectivity issues or firewall/ad-blocker restrictions</li>
          <li>API rate limits may be reached during high traffic periods</li>
        </ul>
        <Callout tone="accent" title="Don't worry!" className="my-4">
          When real-time data is unavailable, the simulator automatically uses <strong>scientifically-based estimates</strong>{' '}
          derived from climate zone analysis (based on latitude), regional climate patterns, and established environmental
          science models.
        </Callout>
        <p>
          These estimates are reliable and the calculations remain accurate. You&apos;ll see an &quot;(Estimated)&quot;
          indicator when fallback data is used. Additionally:
        </p>
        <ul>
          <li>Data is <strong>cached locally</strong> for 1 hour to reduce API calls</li>
          <li>The simulator tries 3 times with different timeouts before using estimates</li>
          <li>Estimated values are based on peer-reviewed climate zone classifications</li>
        </ul>
      </>
    ),
  },
];

const INITIAL_VISIBLE = 5;

const FaqSection: React.FC = () => {
  const [open, setOpen] = useState<{ [key: number]: boolean }>({});
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? faqs.filter(faq => faq.searchText.toLowerCase().includes(query) || faq.title.toLowerCase().includes(query))
    : faqs;
  const visible = !query && !showAll ? filtered.slice(0, INITIAL_VISIBLE) : filtered;

  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Help &amp; methodology</Eyebrow>
        <h2 id="faq-heading" className="font-display mt-2 text-3xl sm:text-4xl text-ink-900">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-sm sm:text-base text-ink-500">
          How the simulator works, where the data comes from, and how to use the results.
        </p>

        <div className="mt-6">
          <label htmlFor="faq-search" className="sr-only">Search frequently asked questions</label>
          <div className="relative">
            <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="faq-search"
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setShowAll(false);
              }}
              placeholder="Search questions about modes, data, exports, and more…"
              className="h-12 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
            />
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Try &quot;clear-cutting&quot;, &quot;carbon&quot;, &quot;exports&quot;, or &quot;species&quot;.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-white p-8 text-center text-sm text-ink-500">
            No questions match your search yet. Try a different keyword or clear the search box.
          </div>
        ) : (
          <div className="divide-y divide-sand-200 rounded-3xl border border-sand-200 bg-white shadow-card">
            {visible.map(faq => {
              const isOpen = !!open[faq.id];
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(prev => ({ ...prev, [faq.id]: !prev[faq.id] }))}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${faq.id}`}
                    id={`faq-button-${faq.id}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sand-50 sm:px-6"
                  >
                    <span className="text-sm sm:text-[15px] font-semibold text-ink-900">{faq.title}</span>
                    <ChevronDownIcon
                      size={18}
                      className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-button-${faq.id}`}
                      className="faq-prose px-5 pb-6 sm:px-6 text-sm leading-relaxed text-ink-700 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:text-ink-900"
                    >
                      {faq.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!query && filtered.length > INITIAL_VISIBLE && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll(prev => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:border-ink-300 hover:bg-sand-50"
            >
              {showAll ? 'Show fewer questions' : `Show ${filtered.length - INITIAL_VISIBLE} more questions`}
              <ChevronDownIcon size={16} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FaqSection;
