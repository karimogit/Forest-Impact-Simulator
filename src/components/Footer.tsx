import React from 'react';
import { GitHubIcon } from './ui/Icons';

const dataSources = [
  { name: 'ISRIC SoilGrids', href: 'https://soilgrids.org/', what: 'Soil carbon & pH' },
  { name: 'Open-Meteo', href: 'https://open-meteo.com/', what: 'Climate & weather' },
  { name: 'OpenStreetMap', href: 'https://www.openstreetmap.org/', what: 'Map tiles & geocoding' },
  { name: 'Overpass API', href: 'https://overpass-api.de/', what: 'Forest & protected areas' },
];

const implementations = [
  { name: 'TypeScript (web)', href: 'https://github.com/KarimOsmanGH/forest-impact-simulator' },
  { name: 'Python notebook', href: 'https://github.com/KarimOsmanGH/forest-impact-simulator-python' },
  { name: 'R notebook', href: 'https://github.com/KarimOsmanGH/forest-impact-simulator-r' },
];

const Footer: React.FC = () => {
  return (
    <footer className="mt-24 border-t border-sand-200 bg-forest-950 text-forest-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-2xl text-white">Forest Impact Simulator</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-forest-200/80">
              An open-source tool for exploring how planting or clearing a forest changes carbon,
              biodiversity, water, and communities over time. Built with live environmental data and
              transparent, documented formulas.
            </p>
            <p className="mt-5 text-xs leading-relaxed text-forest-300/70">
              For educational and planning purposes only. Always consult forestry professionals and local
              authorities before acting on real-world projects.
            </p>
          </div>

          <div className="md:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-300/80">Data sources</p>
            <ul className="mt-4 space-y-2.5">
              {dataSources.map(source => (
                <li key={source.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/90 hover:text-white underline-offset-4 hover:underline"
                  >
                    {source.name}
                  </a>
                  <span className="text-xs text-forest-300/70">{source.what}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-300/80">Implementations</p>
            <ul className="mt-4 space-y-2.5">
              {implementations.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/90 hover:text-white underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-forest-300/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Forest Impact Simulator · Created by{' '}
            <a href="https://kar.im" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white">
              Karim Osman
            </a>{' '}
            · MIT License
          </p>
          <a
            href="https://github.com/KarimOsmanGH/forest-impact-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white"
            aria-label="GitHub repository"
          >
            <GitHubIcon size={18} />
            <span>Source on GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
