
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Hardened Region List ---
const GLOBAL_REGIONS = [
  "India", "China", "United States", "Indonesia", "Pakistan", "Nigeria", "Brazil", "Bangladesh", "Russia", "Ethiopia",
  "Mexico", "Japan", "Egypt", "Philippines", "Democratic Republic of the Congo", "Vietnam", "Iran", "Turkey", "Germany", "Thailand",
  "Tanzania", "United Kingdom", "France", "South Africa", "Italy", "Kenya", "Myanmar", "Colombia", "South Korea", "Spain",
  "Argentina", "Uganda", "Algeria", "Sudan", "Iraq", "Ukraine", "Poland", "Canada", "Morocco", "Saudi Arabia",
  "Uzbekistan", "Peru", "Angola", "Venezuela", "Yemen", "Mozambique", "Ghana", "Cameroon", "Madagascar", "Australia",
  "North Korea", "Taiwan", "Côte d’Ivoire", "Nepal", "Niger", "Sri Lanka", "Burkina Faso", "Mali", "Romania", "Malawi",
  "Chile", "Kazakhstan", "Zambia", "Syria", "Ecuador", "Netherlands", "Senegal", "Cambodia", "Chad", "Somalia",
  "Zimbabwe", "Guinea", "Rwanda", "Benin", "Burundi", "Tunisia", "South Sudan", "Belgium", "Bolivia", "Haiti",
  "Cuba", "Jordan", "United Arab Emirates", "Honduras", "Azerbaijan", "Sweden", "Portugal", "Tajikistan", "Greece", "Czech Republic",
  "Hungary", "Belarus", "Austria", "Switzerland", "Israel", "Sierra Leone", "Laos", "Hong Kong", "Bulgaria", "Libya",
  "Serbia", "Paraguay", "El Salvador", "Lebanon", "Nicaragua", "Kyrgyzstan", "Turkmenistan", "Singapore", "Denmark", "Finland",
  "Slovakia", "Norway", "Costa Rica", "Palestine (West Bank and Gaza)", "New Zealand", "Liberia", "Panama", "Central African Republic", "Republic of the Congo", "Mauritania",
  "Oman", "Kuwait", "Georgia", "Eritrea", "Uruguay", "Mongolia", "Armenia", "Georgia", "Qatar", "Albania",
  "Lithuania", "Namibia", "Gambia", "Botswana", "Gabon", "Lesotho", "North Macedonia", "Slovenia", "Guinea-Bissau", "Latvia",
  "Bahrain", "Equatorial Guinea", "Trinidad and Tobago", "Estonia", "Timor-Leste", "Mauritius", "Cyprus", "Eswatini", "Djibouti", "Fiji",
  "Bhutan", "Comoros", "Montenegro", "Solomon Islands", "Luxembourg", "Suriname", "Cabo Verde", "Micronesia", "Malta", "Maldives",
  "Belize", "Bahamas", "Iceland", "Vanuatu", "Barbados", "Sao Tome and Principe", "Samoa", "Saint Lucia", "Kiribati", "Grenada",
  "Tonga", "Seychelles", "Antigua and Barbuda", "Andorra", "Dominica", "Marshall Islands", "Saint Vincent and the Grenadines", "Palau", "Tuvalu", "Nauru",
  "Monaco", "Liechtenstein", "San Marino", "Holy See (Vatican City)", "Saint Kitts and Nevis", "Bermuda", "Greenland", "Aruba", "Channel Islands", "French Polynesia",
  "New Caledonia", "Faroe Islands", "Guam", "Cayman Islands", "Northern Mariana Islands", "American Samoa"
];

// --- Professional Archetypes ---
const RANDOM_ARCHETYPES = [
  "Software Developer", "Web Developer", "DevOps Engineer", "Cloud Architect", "Data Scientist", "AI Engineer", "UX Designer", "Game Designer", "Cybersecurity Analyst", "Blockchain Developer",
  "Doctor", "Surgeon", "Pediatrician", "Cardiologist", "Psychiatrist", "Dentist", "Pharmacist", "Nurse Practitioner", "Physical Therapist", "Biomedical Engineer",
  "Mechanical Engineer", "Civil Engineer", "Electrical Engineer", "Chemical Engineer", "Aerospace Engineer", "Nuclear Engineer", "Materials Scientist", "Physicist", "Chemist", "Astronomer",
  "Accountant", "Investment Banker", "Financial Planner", "Tax Consultant", "Venture Capitalist", "Portfolio Manager", "Economist", "Actuary", "Property Manager", "Real Estate Agent",
  "Teacher", "Professor", "Tutor", "Principal", "Curriculum Developer", "Librarian", "Instructional Designer", "ESL Teacher", "Corporate Trainer", "Academic Advisor",
  "Graphic Designer", "Photographer", "Filmmaker", "Journalist", "Content Creator", "Animator", "Fashion Designer", "Fine Artist", "Art Director", "Musician"
];

const hardenedShuffle = <T,>(array: T[]): T[] => {
  const result = [...array];
  const crypto = window.crypto;
  const uint32 = new Uint32Array(1);
  for (let pass = 0; pass < 5; pass++) {
    for (let i = result.length - 1; i > 0; i--) {
      crypto.getRandomValues(uint32);
      const j = uint32[0] % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

interface Skill { name: string; value: number; }
interface Education { degree: string; institution: string; fieldOfStudy: string; }
interface TechnicalMetadata { email: string; password: string; username: string; userAgent: string; browser: string; platform: 'Desktop' | 'Mobile' | 'Tablet'; iban: string; cardType: string; cardExpiry: string; }
interface Persona { id: string; fullName: string; dateOfBirth: string; age: number; gender: 'Male' | 'Female' | 'Non-binary' | 'Other'; region: string; occupation: string; maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'In a relationship'; education: Education; biography: string; shortBiography: string; interests: string[]; personalityTraits: string[]; skills: Skill[]; ethnicity: string; primaryLanguage: string; technicalMetadata: TechnicalMetadata; actionPhotoUrl?: string; isNewlySynthesized?: boolean; }
interface User { username: string; joinedAt: string; }

const SearchableDropdown = ({ options, value, onChange, placeholder, className = "w-full lg:w-48" }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())), [options, search]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-100 dark:bg-black/40 border border-default rounded-xl py-3 px-4 text-xs outline-none text-primary font-mono flex items-center justify-between hover:border-cyan-500/30 transition-all">
        <span className="truncate">{value === 'All' ? placeholder : value}</span>
        <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 glass border border-default rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3 border-b border-default bg-white/5">
            <input type="text" autoFocus placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-200 dark:bg-black/40 border border-default rounded-lg py-2 px-3 text-[10px] font-mono outline-none text-primary focus:border-cyan-500/50" />
          </div>
          <div className="max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <button onClick={() => { onChange('All'); setIsOpen(false); setSearch(''); }} className={`w-full text-left px-4 py-2 text-[10px] font-mono hover:bg-indigo-600 hover:text-white transition-colors ${value === 'All' ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-primary'}`}>All {placeholder}</button>
            {filtered.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }} className={`w-full text-left px-4 py-2 text-[10px] font-mono hover:bg-indigo-600 hover:text-white transition-colors truncate ${value === opt ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-primary'}`}>{opt}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SynthesisOverlay = ({ stage }: { stage: 'bio' | 'image' }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center">
    <div className="relative w-80 h-80 mb-12">
      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse"></div>
      <div className="absolute inset-8 border-2 border-cyan-500/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <i className={`fa-solid ${stage === 'bio' ? 'fa-dna' : 'fa-user-circle'} text-7xl text-cyan-400 animate-pulse`}></i>
        </div>
      </div>
      <div className="scanner-line"></div>
    </div>
    <h2 className="text-5xl font-black gradient-text tracking-tighter mb-4 uppercase">{stage === 'bio' ? 'Reconstructing Identity' : 'Generating Bio-Metrics'}</h2>
    <p className="text-slate-400 font-mono text-sm max-w-lg leading-relaxed">{stage === 'bio' ? 'Mapping cultural DNA, professional history, and digital footprints...' : 'Synthesizing facial features and localized environmental headshot...'}</p>
  </div>
);

const DossierView = ({ p, onCopy, onShare }: { p: Persona; onCopy: (p: Persona) => void; onShare: (p: Persona) => void }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = () => { onCopy(p); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare = () => { onShare(p); setShared(true); setTimeout(() => setShared(false), 2000); };

  const maritalStatusColors = { 'Single': 'text-slate-400', 'Married': 'text-green-400', 'Divorced': 'text-orange-400', 'Widowed': 'text-purple-400', 'In a relationship': 'text-pink-400' };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-8 pb-20">
      {/* Dossier Header */}
      <div className="glass border border-default rounded-[3rem] p-10 flex flex-col lg:flex-row gap-12 items-center lg:items-start shadow-2xl relative overflow-hidden group">
        <div className="relative w-72 h-72 lg:w-80 lg:h-80 flex-shrink-0 rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl">
          {p.actionPhotoUrl ? (
            <img src={p.actionPhotoUrl} alt={p.fullName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-slate-100 dark:bg-white/5 flex items-center justify-center"><i className="fa-solid fa-user-tie text-7xl text-muted/20"></i></div>
          )}
          <div className="absolute top-4 left-4 z-10 px-4 py-1.5 rounded-full glass border border-white/20 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">Subject 0x{p.id.substring(0,4)}</div>
        </div>

        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3">
            <span className={`px-4 py-1 rounded-lg glass border border-default text-[10px] font-black uppercase tracking-widest ${maritalStatusColors[p.maritalStatus]}`}>{p.maritalStatus}</span>
            <span className="px-4 py-1 rounded-lg glass border border-default text-[10px] font-black uppercase tracking-widest text-indigo-400">{p.age} YEARS</span>
            <span className="px-4 py-1 rounded-lg glass border border-default text-[10px] font-black uppercase tracking-widest text-cyan-400">{p.gender}</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-none">{p.fullName}</h1>
          <p className="text-xl lg:text-2xl font-mono text-cyan-500 uppercase font-black tracking-tight">{p.occupation}</p>
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-default">
              <i className="fa-solid fa-map-location-dot text-cyan-500"></i>
              <span className="text-sm font-bold text-primary">{p.region}</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-default">
              <i className="fa-solid fa-graduation-cap text-indigo-500"></i>
              <span className="text-sm font-bold text-primary">{p.education.degree}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-6 justify-center lg:justify-start">
            <button onClick={handleCopy} className="px-6 py-3 bg-white/5 border border-default rounded-xl hover:bg-cyan-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3">
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'Copied' : 'Export Full Dossier'}
            </button>
            <button onClick={handleShare} className="px-6 py-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-3">
              <i className={`fa-solid ${shared ? 'fa-check' : 'fa-share-nodes'}`}></i> {shared ? 'Link Copied' : 'Share Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Narrative & Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass border border-default rounded-[3rem] p-10 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted border-b border-default pb-4 flex items-center gap-3"><i className="fa-solid fa-feather-pointed text-cyan-500"></i> Biographical Log</h3>
          <div className="prose prose-invert max-w-none space-y-6">
             {p.biography.split('\n\n').map((para, i) => (
               <p key={i} className="text-lg text-secondary leading-relaxed font-medium first-letter:text-4xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:text-indigo-500 first-letter:leading-none">{para}</p>
             ))}
          </div>
        </div>
        <div className="glass border border-default rounded-[3rem] p-10 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted border-b border-default pb-4 flex items-center gap-3"><i className="fa-solid fa-chart-line text-cyan-500"></i> Skill Architecture</h3>
          <div className="space-y-6">
            {p.skills.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono"><span className="text-slate-400 uppercase">{s.name}</span><span className="text-cyan-400 font-bold">{s.value}%</span></div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000" style={{ width: `${s.value}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-default space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">Education Record</h3>
             <p className="text-sm font-bold text-primary">{p.education.fieldOfStudy}</p>
             <p className="text-xs text-muted font-mono">{p.education.institution}</p>
          </div>
        </div>
      </div>

      {/* Technical Footprint */}
      <div className="glass border border-default rounded-[3rem] p-10">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted border-b border-default pb-4 mb-8 flex items-center gap-3"><i className="fa-solid fa-fingerprint text-cyan-500"></i> Digital & Financial Footprint</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-1"><p className="text-[10px] text-muted uppercase font-black tracking-widest">Username</p><p className="font-mono text-sm text-primary">{p.technicalMetadata.username}</p></div>
          <div className="space-y-1"><p className="text-[10px] text-muted uppercase font-black tracking-widest">Operator Email</p><p className="font-mono text-sm text-primary truncate">{p.technicalMetadata.email}</p></div>
          <div className="space-y-1"><p className="text-[10px] text-muted uppercase font-black tracking-widest">Registry IBAN</p><p className="font-mono text-sm text-primary truncate">{p.technicalMetadata.iban}</p></div>
          <div className="space-y-1"><p className="text-[10px] text-muted uppercase font-black tracking-widest">Payment Node</p><p className="font-mono text-sm text-primary">{p.technicalMetadata.cardType} ({p.technicalMetadata.cardExpiry})</p></div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<'bio' | 'image' | false>(false);
  const [history, setHistory] = useState<Persona[]>([]);
  const [view, setView] = useState<'stream' | 'archive' | 'shared'>('stream');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [sharedPersona, setSharedPersona] = useState<Persona | null>(null);
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
  const [regionPool, setRegionPool] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setRegionPool(hardenedShuffle(GLOBAL_REGIONS));
    
    // Check for shared persona in URL
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('p');
    if (sharedData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(sharedData)));
        setSharedPersona(decoded);
        setView('shared');
      } catch (e) {
        console.error("Neural Signal Decoding Failed", e);
      }
    }

    const saved = localStorage.getItem('persona_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      setHistory(parsed);
      if (parsed.length > 0 && !sharedData) setSelectedPersonaId(parsed[0].id);
    }
  }, []);

  const activePersona = useMemo(() => {
    if (view === 'shared') return sharedPersona;
    return history.find(p => p.id === selectedPersonaId) || history[0];
  }, [history, selectedPersonaId, view, sharedPersona]);

  const generatePersona = async () => {
    setLoading('bio');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let currentPool = [...regionPool];
      if (currentPool.length === 0) currentPool = hardenedShuffle(GLOBAL_REGIONS);
      const selectedRegion = filterRegion === 'All' ? currentPool.shift() || GLOBAL_REGIONS[0] : filterRegion;
      setRegionPool(currentPool);
      const randomArchetype = RANDOM_ARCHETYPES[Math.floor(Math.random() * RANDOM_ARCHETYPES.length)];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Synthesize a realistic persona. Region: ${selectedRegion}, Gender: ${filterGender === 'All' ? 'Balanced' : filterGender}, Profession: ${randomArchetype}. Detailed bio, education, skills, technical metadata.`,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING }, age: { type: Type.INTEGER }, gender: { type: Type.STRING, enum: ['Male', 'Female', 'Non-binary', 'Other'] }, maritalStatus: { type: Type.STRING, enum: ['Single', 'Married', 'Divorced', 'Widowed', 'In a relationship'] }, region: { type: Type.STRING }, occupation: { type: Type.STRING }, education: { type: Type.OBJECT, properties: { degree: { type: Type.STRING }, institution: { type: Type.STRING }, fieldOfStudy: { type: Type.STRING } } }, biography: { type: Type.STRING }, skills: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.INTEGER } } } }, technicalMetadata: { type: Type.OBJECT, properties: { email: { type: Type.STRING }, password: { type: Type.STRING }, username: { type: Type.STRING }, userAgent: { type: Type.STRING }, browser: { type: Type.STRING }, platform: { type: Type.STRING, enum: ['Desktop', 'Mobile', 'Tablet'] }, iban: { type: Type.STRING }, cardType: { type: Type.STRING }, cardExpiry: { type: Type.STRING } } }
            }, required: ["fullName", "age", "gender", "maritalStatus", "region", "occupation", "education", "biography", "skills", "technicalMetadata"]
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      setLoading('image');
      const imgPrompt = `Extreme close-up headshot, cinematic photorealistic portrait of ${data.fullName}, a ${data.gender} in ${data.region}. Neutral background, high detail, realistic skin, 8k professional studio lighting.`;
      const imgResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: imgPrompt }] } });
      let photoUrl = "";
      for (const part of imgResponse.candidates[0].content.parts) { if (part.inlineData) { photoUrl = `data:image/png;base64,${part.inlineData.data}`; break; } }
      const newP: Persona = { ...data, id: crypto.randomUUID(), actionPhotoUrl: photoUrl };
      const updatedHistory = [newP, ...history];
      setHistory(updatedHistory);
      setSelectedPersonaId(newP.id);
      if (view === 'shared') setView('stream');
      localStorage.setItem('persona_history', JSON.stringify(updatedHistory.slice(0, 50)));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const copyToClipboard = (p: Persona) => {
    const text = `Full Name: ${p.fullName}\nAge: ${p.age}\nOccupation: ${p.occupation}\nRegion: ${p.region}\nBio: ${p.biography}`;
    navigator.clipboard.writeText(text);
  };

  const sharePersona = (p: Persona) => {
    try {
      const json = JSON.stringify(p);
      const base64 = btoa(encodeURIComponent(json));
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('p', base64);
      navigator.clipboard.writeText(url.toString());
    } catch (e) {
      console.error("Neural Uplink Failure during sharing", e);
    }
  };

  const resetToMain = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.replaceState({}, '', url.toString());
    setView('stream');
    if (history.length > 0) setSelectedPersonaId(history[0].id);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#050507] text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col md:flex-row overflow-hidden transition-colors duration-500`}>
      {loading && <SynthesisOverlay stage={loading} />}

      <aside className="w-full md:w-80 glass border-b md:border-b-0 md:border-r border-default p-8 flex flex-col gap-10 z-20">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-black gradient-text tracking-tighter leading-none">GLOBAL PERSONA</h1>
          <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-black"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block mr-2 animate-pulse"></span> Node Access Active</p>
        </div>
        <nav className="flex flex-col gap-3">
          <button onClick={() => setView('stream')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-sm font-bold tracking-tight ${view === 'stream' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'hover:bg-white/5 text-muted'}`}><i className="fa-solid fa-satellite-dish"></i> Neural Stream</button>
          <button onClick={() => setView('archive')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-sm font-bold tracking-tight ${view === 'archive' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'hover:bg-white/5 text-muted'}`}><i className="fa-solid fa-database"></i> Registry Archive</button>
          {view === 'shared' && (
            <button onClick={resetToMain} className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-sm font-bold tracking-tight animate-pulse"><i className="fa-solid fa-arrow-left"></i> Return to Feed</button>
          )}
        </nav>
        <div className="mt-auto space-y-4">
           <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="w-full py-3 rounded-xl border border-default text-[10px] font-black uppercase tracking-widest text-muted hover:text-cyan-500 transition-all flex items-center justify-center gap-3"><i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i> Toggle UI Mood</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        {view === 'shared' && (
          <div className="absolute top-0 left-0 right-0 bg-indigo-600 py-2 text-center text-[10px] font-black uppercase tracking-[0.3em] z-50 animate-pulse">
            Shared Signal Detected // Remote Dossier Reconstruction Complete
          </div>
        )}

        <header className="sticky top-0 z-30 glass border-b border-default p-6 md:p-8 flex flex-col xl:flex-row gap-6 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <SearchableDropdown options={GLOBAL_REGIONS.sort()} value={filterRegion} onChange={setFilterRegion} placeholder="Regions" className="w-full sm:w-56" />
            <SearchableDropdown options={["Male", "Female", "Non-binary"]} value={filterGender} onChange={setFilterGender} placeholder="Genders" className="w-full sm:w-48" />
          </div>
          <button onClick={generatePersona} disabled={!!loading} className="w-full xl:w-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"><i className="fa-solid fa-bolt"></i> Initiate Synthesis</button>
        </header>

        {/* Node Scroller Navigation */}
        {view !== 'shared' && history.length > 0 && (
          <div className="glass border-b border-default px-8 py-4 flex gap-4 overflow-x-auto whitespace-nowrap custom-scrollbar scroll-smooth">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted self-center mr-4">Active Signals:</span>
            {history.map((p) => (
              <button key={p.id} onClick={() => setSelectedPersonaId(p.id)} className={`flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all p-0.5 ${selectedPersonaId === p.id ? 'border-cyan-500 shadow-lg scale-110' : 'border-transparent hover:border-white/20 opacity-60 hover:opacity-100'}`}>
                {p.actionPhotoUrl ? <img src={p.actionPhotoUrl} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black">{p.fullName.charAt(0)}</div>}
              </button>
            ))}
          </div>
        )}

        <section className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar scroll-smooth">
          {activePersona ? (
            <DossierView p={activePersona} onCopy={copyToClipboard} onShare={sharePersona} />
          ) : !loading && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-40">
              <div className="w-32 h-32 border-4 border-dashed border-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-brain text-5xl"></i></div>
              <p className="font-mono text-sm uppercase tracking-[0.3em] font-black">Waiting for neural uplink...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<App />);
