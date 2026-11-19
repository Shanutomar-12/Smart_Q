import React, {useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {ArrowRight, Search} from 'lucide-react';
import {
  CLINICAL_EASE,
  ShakeContainer,
  SkeletonRows,
} from '../components/MotionPrimitives';
import {useOpd} from '../context/OpdContext';
import {formatClockTime, getStatusMeta} from '../engine/queueEngine';

export const TrackTokenPage: React.FC = () => {
  const {
    departments,
    tokens,
    lookupTokens,
    setSelectedPatientTokenId,
    setView,
  } = useOpd();

  const prefersReduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<typeof tokens>([]);

  const executeLookup = () => {
    const results = lookupTokens(query);
    if (results.length === 1) {
      setSelectedPatientTokenId(results[0].id);
      setView('patient-dashboard');
      return;
    }
    if (results.length > 1) {
      setMatches(results);
      setNotFound(false);
      return;
    }
    setMatches([]);
    setNotFound(true);
    setShakeKey((k) => k + 1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setNotFound(true);
      setShakeKey((k) => k + 1);
      return;
    }
    if (prefersReduced) {
      executeLookup();
      return;
    }
    setSearching(true);
    window.setTimeout(() => {
      setSearching(false);
      executeLookup();
    }, 220);
  };

  const openToken = (tokenId: string) => {
    setSelectedPatientTokenId(tokenId);
    setView('patient-dashboard');
  };

  const quickTokens = tokens.filter((t) =>
    ['CARD-104', 'CARD-103', 'CARD-102', 'CARD-101', 'GMED-103', 'ORTH-102'].includes(
      t.tokenNumber,
    ),
  );

  return (
    <div className="clinical-canvas">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
            Live Patient Queue Lookup
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1E3D] dark:text-white">
            Track Your OPD Token
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Enter your digital token number (for example{' '}
            <span className="font-mono font-semibold text-[#0B1E3D] dark:text-white">
              CARD-104
            </span>
            ) or registered mobile number (
            <span className="font-mono font-semibold text-[#0B1E3D] dark:text-white">
              +919765432109
            </span>
            ) to view your live position, medical record, and updated arrival window.
          </p>
        </div>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="clinical-card rounded-2xl p-6 space-y-4"
        >
          <label
            htmlFor="track-input"
            className="block text-sm font-semibold text-[#0B1E3D] dark:text-slate-100"
          >
            Token Number or Registered Mobile Number
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#0F5CA8] dark:text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="track-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setNotFound(false);
                }}
                placeholder="Enter CARD-104 or +919765432109"
                className="w-full font-mono rounded-xl border border-[#CBD9EE] dark:border-[#1B3154] bg-white dark:bg-[#0A1629] pl-10 pr-4 py-3 text-sm text-[#0B1E3D] dark:text-white placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#0F5CA8] dark:focus:border-sky-400 focus:ring-2 focus:ring-[#0F5CA8]/20"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{y: -1.5}}
              whileTap={{scale: 0.97}}
              className="cta-warm-btn inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Track Live Status</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          {searching && <SkeletonRows count={2} />}

          {!searching && notFound && (
            <ShakeContainer shakeKey={shakeKey}>
              <p
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-800 dark:text-red-200"
              >
                No OPD token matched &ldquo;{query}&rdquo;. Verify the token code or
                select one of the active tokens listed below.
              </p>
            </ShakeContainer>
          )}

          {!searching && matches.length > 1 && (
            <div className="pt-3 border-t border-[#E2ECF8] dark:border-[#1B3154] space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Multiple tokens matched your search. Select one to open:
              </p>
              <div className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] border border-[#DCE7F5] dark:border-[#1B3154] rounded-xl overflow-hidden">
                {matches.map((tok) => {
                  const dept = departments.find((d) => d.id === tok.departmentId);
                  return (
                    <button
                      key={tok.id}
                      type="button"
                      onClick={() => openToken(tok.id)}
                      className="w-full px-4 py-3 bg-white dark:bg-[#0A1629] hover:bg-[#F4F8FC] dark:hover:bg-[#132544] flex items-center justify-between text-left cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-sm text-[#0F5CA8] dark:text-sky-400">
                          {tok.tokenNumber}
                        </span>
                        <span className="mx-2 text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-sm font-medium text-[#0B1E3D] dark:text-white">
                          {tok.patientName}
                        </span>
                        <span className="mx-2 text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {dept?.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400">
                        Open Dashboard →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Pre-loaded Sample Tokens Table for Instant Testing */}
        <section className="clinical-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2ECF8] dark:border-[#1B3154] bg-[#F8FBFF] dark:bg-[#0A1629] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                Active &amp; Sample Hospital Tokens
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select any patient below to inspect their live queue &amp; medical
                record dashboard
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('register')}
              className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              + Book new token
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2ECF8] dark:border-[#1B3154] bg-white dark:bg-[#0E1C33] text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">Token</th>
                  <th className="py-3 px-4">Patient &amp; Origin</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Est. Time</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9F0FA] dark:divide-[#1B3154] bg-white dark:bg-[#0E1C33]">
                {quickTokens.map((tok, i) => {
                  const dept = departments.find((d) => d.id === tok.departmentId);
                  const statusMeta = getStatusMeta(tok.status);
                  return (
                    <motion.tr
                      key={tok.id}
                      initial={{opacity: 0, y: 6}}
                      animate={{opacity: 1, y: 0}}
                      transition={{
                        duration: 0.22,
                        delay: i * 0.03,
                        ease: CLINICAL_EASE,
                      }}
                      onClick={() => openToken(tok.id)}
                      className="hover:bg-[#F4F8FC] dark:hover:bg-[#132544] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6 font-mono tabular-nums font-bold text-[#0F5CA8] dark:text-sky-400 whitespace-nowrap">
                        {tok.tokenNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#0B1E3D] dark:text-white">
                          {tok.patientName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {tok.phone} · {tok.locality} ({tok.distanceKm} km)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {dept?.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-xs ${statusMeta.textClass}`}>
                          {statusMeta.label}
                          {tok.status === 'WAITING' && tok.position
                            ? ` · #${tok.position}`
                            : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {tok.status === 'COMPLETED'
                          ? 'Completed'
                          : tok.status === 'IN_CONSULTATION'
                            ? 'In Room'
                            : formatClockTime(tok.estimatedConsultTimestamp)}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openToken(tok.id);
                          }}
                          className="text-xs font-semibold text-[#0F5CA8] dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Track →
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
