import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Layers,
  Heart,
  Search,
  Plus,
  User,
  Compass,
  Grid2X2,
  Github,
  Apple,
  Download,
  X,
  Check,
  Smartphone,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import type { NFT, Collection, ApiSuccess } from '@nexanft/contracts';
import './styles.css';
const api = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const demo = import.meta.env.VITE_DEMO_URL ?? 'http://localhost:8081';
const releases = {
  github: import.meta.env.VITE_GITHUB_URL as string | undefined,
  android: import.meta.env.VITE_ANDROID_URL as string | undefined,
  ios: import.meta.env.VITE_IOS_URL as string | undefined,
};
async function load<T>(path: string, signal: AbortSignal) {
  const response = await fetch(`${api}${path}`, { signal });
  if (!response.ok) throw new Error('Marketplace unavailable');
  return ((await response.json()) as ApiSuccess<T>).data;
}
function ArtImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  return error ? (
    <div className={`image-error ${className ?? ''}`}>Artwork unavailable</div>
  ) : (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setError(true)} />
  );
}
function ArtworkCard({
  nft,
  onClick,
  className = '',
}: {
  nft: NFT;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button className={`art-card ${className}`} onClick={onClick}>
      <div className="art-image">
        <ArtImage src={nft.imageUrl} alt={nft.name} />
        <span className="heart">
          <Heart size={17} />
          {nft.likesCount}
        </span>
      </div>
      <div className="art-card-title">
        <h3>{nft.name}</h3>
        <ArrowUpRight size={20} />
      </div>
      <p>@{nft.creator.username}</p>
      <div className="card-price">
        <span>LISTED PRICE</span>
        <strong>◇ {Number(nft.price)} ETH</strong>
      </div>
    </button>
  );
}
function Phone({ nfts }: { nfts: NFT[] }) {
  return (
    <div className="phone">
      <div className="phone-camera" />
      <div className="phone-status">
        <span>9:41</span>
        <span>● ▰</span>
      </div>
      <div className="phone-content">
        <div className="phone-header">
          <strong>nexa↗</strong>
          <span className="avatar">MC</span>
        </div>
        <small>ART. CULTURE. POSSIBILITY.</small>
        <h3>
          Discover the
          <br />
          extraordinary.
        </h3>
        <div className="phone-search">
          <Search size={14} /> Search art, creators…
        </div>
        <div className="phone-banner">
          <h4>
            A new world,
            <br />
            one creation at a time.
          </h4>
          <span>Explore the collection ↗</span>
        </div>
        <div className="phone-section">
          <h4>Trending now</h4>
          <span>View all ↗</span>
        </div>
        <div className="phone-art-row">
          {nfts.slice(0, 2).map((n) => (
            <div className="phone-art" key={n.id}>
              <ArtImage src={n.imageUrl} alt={n.name} />
              <strong>{n.name}</strong>
              <span>◇ {Number(n.price)} ETH</span>
            </div>
          ))}
        </div>
      </div>
      <div className="phone-tabs">
        {[Grid2X2, Compass, Plus, Heart, User].map((Icon, i) => (
          <Icon key={i} size={18} className={i === 0 ? 'active' : ''} />
        ))}
      </div>
      <div className="phone-home" />
    </div>
  );
}
export default function App() {
  const [nfts, setNFTs] = useState<NFT[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState<NFT | null>(null),
    [info, setInfo] = useState<'github' | 'android' | 'ios' | null>(null),
    [screenshot, setScreenshot] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    void Promise.all([
      load<NFT[]>('/nfts?status=LISTED&sort=popular&limit=8', controller.signal),
      load<Collection[]>('/collections?limit=4', controller.signal),
    ])
      .then(([art, c]) => {
        setNFTs(art);
        setCollections(c);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const hasModal = Boolean(selected || info || screenshot);
  useEffect(() => {
    if (!hasModal) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setInfo(null);
        setScreenshot(null);
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', close);
    };
  }, [hasModal]);
  function release(kind: 'github' | 'android' | 'ios') {
    const url = releases[kind];
    if (url && /^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
    else setInfo(kind);
  }
  return (
    <>
      <nav className="nav wrap">
        <a href="#" className="brand">
          <span className="brand-icon">N</span>nexa<span className="brand-nft">NFT</span>
          <span className="beta">BETA</span>
        </a>
        <div className="nav-links">
          <a href="#discover">Discover</a>
          <a href="#experience">The experience</a>
          <a href="#creators">For creators</a>
        </div>
        <a className="button small dark" href={demo} target="_blank" rel="noreferrer">
          Open marketplace <ArrowUpRight size={16} />
        </a>
      </nav>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="green-dot" /> A NEW HOME FOR DIGITAL CULTURE
            </div>
            <h1>
              Own a little
              <br />
              <em>extraordinary.</em>
              <span className="hero-star">✳</span>
            </h1>
            <p>
              Art that moves you. Creators who inspire you.
              <br className="desktop-break" /> A world of possibility, right in your pocket.
            </p>
            <div className="hero-actions">
              <a className="button" href="#discover">
                Find your next obsession <ArrowUpRight size={19} />
              </a>
              <a className="text-link" href={demo} target="_blank" rel="noreferrer">
                Take a look around <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-footnote">
              <div className="mini-avatars">
                <span>M</span>
                <span>A</span>
                <span>LD</span>
                <span>L</span>
              </div>
              <span>
                Independent artists.
                <br />
                <strong>Extraordinary perspectives.</strong>
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            {nfts[0] ? (
              <ArtworkCard
                nft={nfts[0]}
                onClick={() => setSelected(nfts[0]!)}
                className="hero-card one"
              />
            ) : (
              <div className="hero-card art-card one decorative-art">
                <div className="css-orb" />
                <span>A LITTLE POSSIBILITY</span>
              </div>
            )}
            {nfts[3] && (
              <ArtworkCard
                nft={nfts[3]}
                onClick={() => setSelected(nfts[3]!)}
                className="hero-card two"
              />
            )}
            <div className="floating-note">
              <span>↗</span> Collect what
              <br />
              <strong>speaks to you.</strong>
            </div>
            <div className="art-caption">CURATED BY CURIOSITY / 001</div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            ART WITHOUT LIMITS <span>✳</span> CULTURE IN YOUR POCKET <span>✳</span> CREATE YOUR NEXT
            CHAPTER <span>✳</span> ART WITHOUT LIMITS <span>✳</span> CULTURE IN YOUR POCKET{' '}
            <span>✳</span>
          </div>
        </div>
        <section id="discover" className="section wrap">
          <div className="section-top">
            <div>
              <div className="eyebrow">01 / THE DISCOVERY</div>
              <h2>
                A fresh perspective.
                <br />
                Every time you explore.
              </h2>
            </div>
            <a href={`${demo}/explore`} target="_blank" rel="noreferrer" className="text-link">
              Explore the marketplace <ArrowUpRight size={20} />
            </a>
          </div>
          <div className="category-line">
            <span className="selected">Selected for you</span>
            {['Art', 'Photography', 'Music', 'Gaming', 'Collectibles'].map((category) => (
              <a
                key={category}
                href={`${demo}/explore?category=${encodeURIComponent(category)}`}
                target="_blank"
                rel="noreferrer"
              >
                {category}
              </a>
            ))}
          </div>
          {loading ? (
            <div className="art-grid">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="skeleton" aria-label="Loading artwork" />
              ))}
            </div>
          ) : failed ? (
            <div className="api-state">
              <h3>The gallery is taking a moment.</h3>
              <p>We couldn’t connect to the marketplace. Please try again.</p>
              <button className="button dark" onClick={() => setRetry((n) => n + 1)}>
                Reload gallery
              </button>
            </div>
          ) : nfts.length === 0 ? (
            <div className="api-state">
              The next discovery is on its way. Be the first to create a listing.
            </div>
          ) : (
            <div className="art-grid">
              {nfts.slice(0, 4).map((n) => (
                <ArtworkCard key={n.id} nft={n} onClick={() => setSelected(n)} />
              ))}
            </div>
          )}
          <div className="gallery-note">
            <ShieldCheck size={15} />
            <span>
              Platform listings. ETH denomination. No wallet, payments, or blockchain transactions.
            </span>
          </div>
        </section>
        {collections.length > 0 && (
          <section className="collections wrap">
            <div className="section-top">
              <h3>Worlds worth getting lost in.</h3>
              <a
                href={`${demo}/collections`}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                All collections <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="collection-grid">
              {collections.map((c) => (
                <a
                  key={c.id}
                  href={`${demo}/collection/${c.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="collection"
                >
                  <ArtImage src={c.imageUrl} alt={c.name} />
                  <div>
                    <strong>{c.name}</strong>
                    <span>
                      {c._count?.nfts ?? 0} works · @{c.creator.username}
                    </span>
                  </div>
                  <ArrowUpRight size={20} />
                </a>
              ))}
            </div>
          </section>
        )}
        <section id="experience" className="experience section">
          <div className="wrap experience-grid">
            <div className="phone-stage">
              <span className="stage-star">✳</span>
              <Phone nfts={nfts} />
              <div className="phone-tag">
                <Smartphone size={18} />
                <span>
                  Big discoveries.
                  <br />
                  <strong>Small screen.</strong>
                </span>
              </div>
            </div>
            <div className="experience-copy">
              <div className="eyebrow">02 / BUILT FOR YOUR EVERYDAY</div>
              <h2>
                A whole world.
                <br />
                In your pocket.
              </h2>
              <p>
                Discovery should feel effortless. From your first favorite to your next creation,
                NexaNFT puts the good stuff within reach.
              </p>
              <div className="feature-list">
                {[
                  {
                    Icon: Search,
                    title: 'Find your kind of extraordinary',
                    text: 'Search creators, collections, and artwork. Fine-tune your discoveries with price and category filters.',
                  },
                  {
                    Icon: Heart,
                    title: 'Keep what moves you close',
                    text: 'Save artwork to your private favorites, then pick up where you left off across sessions.',
                  },
                  {
                    Icon: Palette,
                    title: 'Let your imagination out',
                    text: 'Upload your art, give it a story, and create a listing. Your work deserves a place to be seen.',
                  },
                ].map(({ Icon, title, text }) => (
                  <div className="feature" key={title}>
                    <span>
                      <Icon size={21} />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="platform-buttons">
                <button className="button dark" onClick={() => release('android')}>
                  <Download size={18} /> {releases.android ? 'Download Android APK' : 'Android app'}
                </button>
                <button className="button dark" onClick={() => release('ios')}>
                  <Apple size={20} /> iOS app
                </button>
              </div>
              <small>
                {releases.android
                  ? 'Android direct download available. iPhone release pending.'
                  : 'Android & iOS builds configured. Public store releases pending.'}
              </small>
            </div>
          </div>
        </section>
        <section className="section wrap how">
          <div className="section-top">
            <div>
              <div className="eyebrow">03 / A LITTLE CURIOSITY GOES A LONG WAY</div>
              <h2>
                Your next chapter
                <br />
                starts here.
              </h2>
            </div>
            <p>
              No wallet setup. No complicated first steps.
              <br />
              Just you, your curiosity, and a world of art.
            </p>
          </div>
          <div className="steps">
            {[
              {
                number: '01',
                title: 'Make yourself at home.',
                text: 'Create your account and put a little personality into your profile.',
              },
              {
                number: '02',
                title: 'Follow your curiosity.',
                text: 'Explore collections, meet creators, and save the works you love.',
              },
              {
                number: '03',
                title: 'Make something yours.',
                text: 'Publish your own artwork or try a clearly labeled demo collection transfer.',
              },
            ].map((s) => (
              <div key={s.number}>
                <span>{s.number}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <ArrowUpRight size={24} />
              </div>
            ))}
          </div>
        </section>
        <section id="creators" className="creator-section wrap">
          <div>
            <div className="eyebrow">FOR THE ORIGINALS. THE DREAMERS. THE MAKERS.</div>
            <h2>
              The next big thing
              <br />
              could be <em>your thing.</em>
            </h2>
            <p>Build a collection. Share a story. Find the people who see what you see.</p>
            <a className="button" href={`${demo}/register`} target="_blank" rel="noreferrer">
              Create your first listing <ArrowUpRight size={19} />
            </a>
          </div>
          <div className="creator-graphic">
            <Layers size={130} strokeWidth={0.8} />
            <span className="graphic-label">100% YOUR IMAGINATION</span>
            <span className="graphic-plus">+</span>
          </div>
        </section>
        <section className="section wrap screenshots">
          <div className="section-top">
            <div>
              <div className="eyebrow">04 / A CLOSER LOOK</div>
              <h2>Made for the way you explore.</h2>
            </div>
            <span className="muted">Actual app previews</span>
          </div>
          <div className="screenshot-grid">
            {[
              ['home', 'Discover'],
              ['explore', 'Explore'],
              ['detail', 'Artwork details'],
            ].map(([path, title]) => (
              <button key={path} onClick={() => setScreenshot(`/screenshots/${path}.png`)}>
                <img src={`/screenshots/${path}.png`} alt={`${title} screen in NexaNFT`} />
                <span>
                  {title} <ArrowUpRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="tech wrap">
          <div>
            <span className="eyebrow">CRAFTED WITH CARE</span>
            <h3>
              A thoughtful product.
              <br />A solid foundation.
            </h3>
          </div>
          <div>
            {['React Native', 'Expo', 'TypeScript', 'Node.js', 'PostgreSQL', 'S3 storage'].map(
              (t) => (
                <span key={t}>
                  <Check size={13} />
                  {t}
                </span>
              ),
            )}
          </div>
        </section>
        <section className="final-cta wrap">
          <span>✳</span>
          <div className="eyebrow">A LITTLE EXTRAORDINARY IS WAITING.</div>
          <h2>
            Go on.
            <br />
            Follow your curiosity.
          </h2>
          <a href={demo} target="_blank" rel="noreferrer" className="button">
            Open the marketplace <ArrowUpRight size={20} />
          </a>
        </section>
      </main>
      <footer className="wrap">
        <a href="#" className="brand">
          nexa<span className="brand-nft">NFT</span>↗
        </a>
        <span>Independent art. Endless possibility.</span>
        <div>
          <button onClick={() => release('github')}>
            <Github size={16} /> View GitHub
          </button>
          <a href={demo} target="_blank" rel="noreferrer">
            View demo <ArrowUpRight size={16} />
          </a>
        </div>
        <small>
          © {new Date().getFullYear()} NexaNFT · Made by Lakshay Dhiman · A platform marketplace,
          with demo transfers.
        </small>
      </footer>
      {hasModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelected(null);
            setInfo(null);
            setScreenshot(null);
          }}
        >
          <div
            className={`modal ${screenshot ? 'screenshot-modal' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={selected?.name ?? (info ? 'Release availability' : 'App screenshot')}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              aria-label="Close dialog"
              onClick={() => {
                setSelected(null);
                setInfo(null);
                setScreenshot(null);
              }}
            >
              <X size={22} />
            </button>
            {selected ? (
              <>
                <ArtImage src={selected.imageUrl} alt={selected.name} />
                <div className="eyebrow">
                  {selected.category} / {selected.status}
                </div>
                <h2>{selected.name}</h2>
                <p>
                  By {selected.creator.fullName} · @{selected.creator.username}
                </p>
                <p>{selected.description}</p>
                <strong>◇ {Number(selected.price)} ETH</strong>
                <p className="muted">Platform record only. No payment or blockchain transaction.</p>
                <a
                  className="button"
                  href={`${demo}/nft/${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View in marketplace <ArrowUpRight size={18} />
                </a>
              </>
            ) : info ? (
              <>
                <div className="eyebrow">NEXANFT / COMING INTO VIEW</div>
                <h2>
                  {info === 'github'
                    ? 'Source, ready to share.'
                    : 'Your next discovery, on mobile.'}
                </h2>
                <p>
                  {info === 'github'
                    ? 'The source repository has not been published to GitHub yet. The project guide includes setup, testing, and architecture documentation.'
                    : `The ${info === 'android' ? 'Android' : 'iOS'} app is configured for EAS builds. A public store release has not been published yet. You can explore the web demo today.`}
                </p>
                <a className="button" href={demo} target="_blank" rel="noreferrer">
                  Try the working demo <ArrowUpRight size={18} />
                </a>
                <a className="text-link" href="/project-guide.md" download>
                  Download project guide <Download size={16} />
                </a>
              </>
            ) : (
              <img src={screenshot!} alt="Expanded NexaNFT app screenshot" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
