import React from 'react';
import Link from 'next/link';
import { GitHubIcon } from './ui/Icons';

const BrandMark = () => (
  <span
    aria-hidden="true"
    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-white shadow-sm"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 7.5 9.5h2.5L6 15h5v5h2v-5h5l-4-5.5h2.5L12 3Z" />
    </svg>
  </span>
);

const Header = () => {
  return (
    <header className="sticky top-0 z-[1100] border-b border-sand-200/80 bg-sand-50/85 backdrop-blur supports-[backdrop-filter]:bg-sand-50/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 rounded-lg">
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg text-ink-900 group-hover:text-forest-700 transition-colors">
              Forest Impact Simulator
            </span>
            <span className="hidden sm:block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
              Planting &amp; clear-cutting analysis
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <a
            href="#faq"
            className="hidden sm:inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-ink-500 hover:bg-sand-100 hover:text-ink-900 transition-colors"
          >
            FAQ
          </a>
          <a
            href="https://github.com/KarimOsmanGH/forest-impact-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-sand-300 bg-white px-3 text-sm font-medium text-ink-700 hover:border-ink-300 hover:bg-sand-50 transition-colors"
            aria-label="View source on GitHub"
          >
            <GitHubIcon size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
