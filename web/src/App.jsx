import { useEffect, useMemo, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
const adminTokenKey = "cyclofest-admin-token";
const riderSessionKey = "cyclofest-rider-session";
const staffKeyStorageKey = "cyclofest-staff-key";

const interfaceCopy = {
  en: {
    loading: "Loading CycloFest...",
    loadError: "The event could not be loaded.",
    noAnnouncements: "No new announcements",
    previewCreated: "Preview ticket created",
    languageLabel: "Language",
    nav: {
      home: "Home",
      rides: "Rides",
      schedule: "Schedule",
      route: "Route",
      profile: "Profile"
    }
  },
  id: {
    loading: "Memuat CycloFest...",
    loadError: "Acara tidak dapat dimuat.",
    noAnnouncements: "Belum ada pengumuman baru",
    previewCreated: "Pratinjau tiket dibuat",
    languageLabel: "Bahasa",
    nav: {
      home: "Beranda",
      rides: "Rute",
      schedule: "Jadwal",
      route: "Peta",
      profile: "Profil"
    }
  }
};

const navItems = [
  { id: "home", icon: "home" },
  { id: "rides", icon: "bike" },
  { id: "schedule", icon: "calendar" },
  { id: "route", icon: "map" },
  { id: "profile", icon: "user" }
];

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  emergencyName: "",
  emergencyPhone: "",
  jerseySize: "M",
  categoryId: "",
  waiverAccepted: false
};

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.registrationToken
      ? { "X-Registration-Token": options.registrationToken }
      : {}),
    ...(options.staffKey ? { "X-Staff-Key": options.staffKey } : {})
  };

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error?.message ?? "The request could not be completed."
    );
    error.status = response.status;
    throw error;
  }

  return payload;
}

function loadStoredRiderSession() {
  try {
    return JSON.parse(window.localStorage.getItem(riderSessionKey)) ?? null;
  } catch {
    return null;
  }
}

function qrBlocks(value = "") {
  let seed = 17;
  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) % 2147483647;
  }

  return Array.from({ length: 49 }, (_, index) => {
    const row = Math.floor(index / 7);
    const column = index % 7;
    const inFinder =
      (row < 2 && column < 2) ||
      (row < 2 && column > 4) ||
      (row > 4 && column < 2);
    seed = (seed * 48271) % 2147483647;
    return inFinder || seed % 3 !== 0;
  });
}

function TokenQr({ value }) {
  return (
    <div className="real-qr" aria-label="Ticket QR token display">
      {qrBlocks(value).map((active, index) => (
        <i className={active ? "active" : ""} key={index} />
      ))}
    </div>
  );
}

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5M9 20v-6h6v6" /></>,
    bike: <><circle cx="6" cy="17" r="4" /><circle cx="18" cy="17" r="4" /><path d="m6 17 4-8h4l4 8m-8-8-2-3m2 11h4l-4-8m4 0h3" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM10 15h4M12 13v5M8 21h8" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" /></>,
    shirt: <path d="m8 4 4 2 4-2 5 4-3 4-2-2v11H8V10l-2 2-3-4 5-4Z" />,
    music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    ticket: <><path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Z" /><path d="M13 7v12" /></>
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}

function AppHeader({ copy, language, onAdminOpen, onLanguageChange, onNotifications }) {
  return (
    <header className="app-header">
      <div className="brand-mark">
        <Icon name="bike" size={22} />
      </div>
      <div className="brand-copy">
        <strong>CycloFest</strong>
        <span>Grand Cycling Festival</span>
      </div>
      <label className="language-picker">
        <span className="sr-only">{copy.languageLabel}</span>
        <select
          aria-label={copy.languageLabel}
          onChange={(event) => onLanguageChange(event.target.value)}
          value={language}
        >
          <option value="id">ID</option>
          <option value="en">EN</option>
        </select>
      </label>
      <button className="admin-link-button" onClick={onAdminOpen} type="button">
        Admin
      </button>
      <button className="icon-button notification-button" onClick={onNotifications} type="button">
        <Icon name="bell" />
        <span className="notification-dot" />
      </button>
    </header>
  );
}

function BottomNav({ activePage, copy, onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="bottom-nav">
      {navItems.map((item) => (
        <button
          className={activePage === item.id ? "active" : ""}
          key={item.id}
          onClick={() => onNavigate(item.id)}
          type="button"
        >
          <span className="nav-icon"><Icon name={item.icon} size={21} /></span>
          <span>{copy.nav[item.id]}</span>
        </button>
      ))}
    </nav>
  );
}

function PageTitle({ eyebrow, title, description }) {
  return (
    <div className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

function HomePage({ event, onNavigate, onRegister }) {
  const totalRegistered = event.categories.reduce((sum, category) => sum + category.registered, 0);
  const totalCapacity = event.categories.reduce((sum, category) => sum + category.capacity, 0);
  const totalRemaining = totalCapacity - totalRegistered;

  return (
    <div className="page home-page">
      <section className="event-hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <p className="hero-kicker">Official event app</p>
        <h1>{event.name}</h1>
        <p className="hero-tagline">{event.tagline}</p>
        <p className="hero-location">
          <Icon name="location" size={15} />
          {event.dateLabel} · {event.location}
        </p>
        <div className="hero-stats">
          <div><strong>{formatNumber(totalRegistered)}</strong><span>Riders</span></div>
          <div><strong>{event.categories.length}</strong><span>Categories</span></div>
          <div><strong>{event.maxDistanceKm}</strong><span>KM max</span></div>
          <div><strong>150M</strong><span>Prizes</span></div>
        </div>
      </section>

      <section className="countdown-card">
        <div>
          <span>Countdown to</span>
          <strong>Event day</strong>
        </div>
        <div className="countdown-values">
          <div><strong>100</strong><span>Days</span></div>
          <div><strong>14</strong><span>Hours</span></div>
          <div><strong>27</strong><span>Min</span></div>
          <div><strong>12</strong><span>Sec</span></div>
        </div>
      </section>

      <section className="quick-grid">
        <button className="quick-card" onClick={() => onNavigate("route")} type="button">
          <Icon name="location" />
          <span>Start & finish</span>
          <strong>{event.venue}</strong>
        </button>
        <button className="quick-card" onClick={() => onNavigate("rides")} type="button">
          <Icon name="trophy" />
          <span>Total prizes</span>
          <strong>{formatRupiah(event.prizePool)}</strong>
        </button>
        <button className="quick-card" onClick={() => onNavigate("rides")} type="button">
          <Icon name="shirt" />
          <span>Race pack</span>
          <strong>{event.racePack}</strong>
        </button>
        <button className="quick-card" onClick={() => onNavigate("schedule")} type="button">
          <Icon name="music" />
          <span>After party</span>
          <strong>{event.afterParty}</strong>
        </button>
      </section>

      <div className="availability-bar">
        <span><i /> Registration open</span>
        <strong>{formatNumber(totalRemaining)} places left</strong>
      </div>

      <button className="primary-action" onClick={() => onRegister()} type="button">
        Register now <Icon name="arrow" size={18} />
      </button>
      <button className="secondary-action" onClick={() => onNavigate("schedule")} type="button">
        <Icon name="calendar" size={18} /> View event schedule
      </button>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Find your pace</p>
            <h2>Popular rides</h2>
          </div>
          <button onClick={() => onNavigate("rides")} type="button">View all</button>
        </div>
        <div className="horizontal-cards">
          {event.categories.map((category) => (
            <button
              className={`mini-ride-card ${category.color}`}
              key={category.id}
              onClick={() => onRegister(category.id)}
              type="button"
            >
              <span>{category.level}</span>
              <strong>{category.distanceKm} KM</strong>
              <h3>{category.name}</h3>
              <small>{formatRupiah(category.price)}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function RidesPage({ event, onRegister }) {
  return (
    <div className="page">
      <PageTitle
        description="Choose a route that matches your experience, energy, and goals."
        eyebrow="Ride categories"
        title="Your road. Your challenge."
      />
      <div className="ride-list">
        {event.categories.map((category) => {
          const remaining = category.capacity - category.registered;
          const filled = Math.round((category.registered / category.capacity) * 100);

          return (
            <article className={`ride-card ${category.color}`} key={category.id}>
              {category.featured && <span className="featured-tag">Most popular</span>}
              <div className="ride-card-top">
                <div>
                  <p>{category.level}</p>
                  <h2>{category.name}</h2>
                </div>
                <strong>{category.distanceKm}<span>KM</span></strong>
              </div>
              <p className="ride-description">{category.description}</p>
              <div className="ride-meta">
                <span><Icon name="clock" size={16} /> {category.duration}</span>
                <span><Icon name="ticket" size={16} /> {formatRupiah(category.price)}</span>
              </div>
              <div className="capacity-row">
                <div className="capacity-track"><span style={{ width: `${filled}%` }} /></div>
                <small>{formatNumber(remaining)} left</small>
              </div>
              <button onClick={() => onRegister(category.id)} type="button">
                Select this ride <Icon name="arrow" size={17} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SchedulePage({ event }) {
  return (
    <div className="page">
      <PageTitle
        description="Everything happening on event day, from rider check-in to the closing festival."
        eyebrow="20 September 2026"
        title="Event schedule"
      />
      <div className="schedule-date-card">
        <div><strong>20</strong><span>SEP</span></div>
        <p><strong>Sunday</strong><span>Gelora Bung Karno, Jakarta</span></p>
        <Icon name="calendar" size={28} />
      </div>
      <div className="timeline">
        {event.schedule.map((item, index) => (
          <article className="timeline-item" key={`${item.time}-${item.title}`}>
            <div className="timeline-time">{item.time}</div>
            <div className="timeline-marker">
              <span>{index + 1}</span>
            </div>
            <div className="timeline-content">
              <small>{item.type}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
      <aside className="info-note">
        <Icon name="bell" />
        <div>
          <strong>Arrive at least 60 minutes early</strong>
          <p>Allow enough time for check-in, equipment checks, and entry to your start corral.</p>
        </div>
      </aside>
    </div>
  );
}

function mapVenueType(type = "") {
  const normalized = type.toUpperCase();
  if (normalized.includes("START") || normalized.includes("FINISH")) return "start";
  if (normalized.includes("MEDICAL")) return "medical";
  if (normalized.includes("PARKING")) return "parking";
  if (normalized.includes("TOILET")) return "toilet";
  if (normalized.includes("STAGE")) return "stage";
  if (normalized.includes("REST") || normalized.includes("AID") || normalized.includes("MEDICAL")) return "rest";
  if (normalized.includes("BOOTH") || normalized.includes("SPONSOR")) return "booth";
  return "venue";
}

function venueTypeLabel(type = "") {
  const mapped = mapVenueType(type);
  const normalized = type.toUpperCase();
  if (normalized.includes("MEDICAL")) return "Medical";
  if (normalized.includes("PARKING")) return "Parking";
  if (normalized.includes("TOILET")) return "Toilet";
  if (normalized.includes("STAGE")) return "Stage";
  if (mapped === "start") return "Start / finish";
  if (mapped === "rest") return "Resting spot";
  if (mapped === "booth") return "Booth / stand";
  return "Venue";
}

function venueSupportCopy(venue) {
  const type = mapVenueType(venue?.pinType || venue?.type);
  if (type === "start") return "Start arch, finish area, race pack help, and official information point.";
  if (type === "rest") return "Good place to refill, recover, and meet ride support.";
  if (type === "medical") return "Medical support point. Use this area if a rider needs help.";
  if (type === "parking") return "Parking area for visitors, crews, or staff depending on organizer rules.";
  if (type === "toilet") return "Toilet and comfort facilities near this point.";
  if (type === "stage") return "Stage area for activities, ceremonies, music, or announcements.";
  if (type === "booth") return "Booth or sponsor stand area with festival activity.";
  return "Organizer information for this place will appear here.";
}

function filterCountForVenue(venues, filterId) {
  if (filterId === "all") return venues.length;
  return venues.filter((venue) => mapVenueType(venue.pinType || venue.type) === filterId).length;
}

function activityTimeRange(activity) {
  if (!activity?.startsAt) return "Time TBA";
  const start = new Date(activity.startsAt);
  const end = activity.endsAt ? new Date(activity.endsAt) : null;
  if (Number.isNaN(start.getTime())) return "Time TBA";
  const startLabel = start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endLabel = end && !Number.isNaN(end.getTime())
    ? end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "";
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
}

function createMapVenues(event) {
  const publicVenues = event.venues ?? [];
  if (publicVenues.length > 0) return publicVenues;

  const checkpointVenues = (event.checkpoints ?? []).map((checkpoint, index) => ({
    id: `checkpoint-${index}`,
    name: checkpoint.name,
    description: checkpoint.detail,
    type: "REST_STOP",
    address: `${checkpoint.kilometer} KM on route`
  }));

  return [
    {
      id: "start-finish",
      name: event.venue,
      description: "Main festival gate, race start, finish arch, race pack service, and information desk.",
      type: "START_FINISH",
      address: event.location
    },
    ...checkpointVenues
  ];
}

const mapPinPositions = [
  { x: 11, y: 73 },
  { x: 30, y: 35 },
  { x: 54, y: 55 },
  { x: 76, y: 24 },
  { x: 83, y: 67 },
  { x: 42, y: 78 },
  { x: 62, y: 33 }
];

function hasCoordinates(venue) {
  return Number.isFinite(Number(venue?.latitude)) && Number.isFinite(Number(venue?.longitude));
}

function createCoordinateBounds(venues) {
  const coordinateVenues = venues.filter(hasCoordinates);
  if (coordinateVenues.length === 0) return null;

  const latitudes = coordinateVenues.map((venue) => Number(venue.latitude));
  const longitudes = coordinateVenues.map((venue) => Number(venue.longitude));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    latRange: Math.max(maxLat - minLat, 0.0008),
    lngRange: Math.max(maxLng - minLng, 0.0008),
    count: coordinateVenues.length
  };
}

function projectVenuePosition(venue, index, bounds) {
  if (!bounds || !hasCoordinates(venue)) return mapPinPositions[index % mapPinPositions.length];

  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  const x = ((longitude - bounds.minLng) / bounds.lngRange) * 76 + 12;
  const y = (1 - (latitude - bounds.minLat) / bounds.latRange) * 70 + 14;

  return {
    x: Math.min(Math.max(x, 8), 92),
    y: Math.min(Math.max(y, 10), 86)
  };
}

function googleMapsUrl(venue) {
  if (!hasCoordinates(venue)) return "";
  return `https://www.google.com/maps/search/?api=1&query=${Number(venue.latitude)},${Number(venue.longitude)}`;
}

function VenueDetailModal({ activities, onClose, sponsors, venue }) {
  if (!venue) return null;
  const type = mapVenueType(venue.pinType || venue.type);
  const mapsUrl = googleMapsUrl(venue);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={`${venue.name} details`}
        aria-modal="true"
        className="venue-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Close venue details" className="modal-close-button" onClick={onClose} type="button">
          x
        </button>
        <div className="venue-modal-hero">
          <div className={`venue-type-badge ${type}`}>{venueTypeLabel(venue.pinType || venue.type)}</div>
          <h2>{venue.name}</h2>
          <p>{venue.description || "Details will be added by the organizer."}</p>
          {venue.address && (
            <span className="venue-address"><Icon name="location" size={16} /> {venue.address}</span>
          )}
        </div>

        <div className="venue-info-grid">
          <article>
            <span>Map label</span>
            <strong>{venue.mapLabel || venue.id}</strong>
          </article>
          <article>
            <span>Pin type</span>
            <strong>{venueTypeLabel(venue.pinType || venue.type)}</strong>
          </article>
          {hasCoordinates(venue) && (
            <article>
              <span>Coordinates</span>
              <strong>{Number(venue.latitude).toFixed(5)}, {Number(venue.longitude).toFixed(5)}</strong>
            </article>
          )}
        </div>

        <section className="venue-modal-section">
          <h3>What is here</h3>
          <p>{venueSupportCopy(venue)}</p>
          {mapsUrl && (
            <a className="venue-map-link" href={mapsUrl} rel="noreferrer" target="_blank">
              Open in Google Maps
            </a>
          )}
        </section>

        <section className="venue-modal-section">
          <h3>Activities here</h3>
          <div className="activity-location-list compact">
            {activities.map((activity) => (
              <article key={activity.id}>
                <time>{activityTimeRange(activity)}</time>
                <div>
                  <strong>{activity.name}</strong>
                  <p>{activity.description || activity.type}</p>
                </div>
              </article>
            ))}
            {activities.length === 0 && (
              <p className="empty-location-note">No activities assigned here yet.</p>
            )}
          </div>
        </section>

        <section className="venue-modal-section">
          <h3>Sponsors and booths</h3>
          {sponsors.length > 0 ? (
            <div className="venue-modal-sponsors">
              {sponsors.map((sponsor) => (
                <article key={sponsor.id}>
                  {sponsor.logoUrl ? <img alt="" src={sponsor.logoUrl} /> : <span>{sponsor.name.slice(0, 1)}</span>}
                  <div>
                    <strong>{sponsor.name}</strong>
                    <small>{sponsor.tier || "Partner"}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-location-note">No sponsor booth assigned here yet.</p>
          )}
        </section>
      </section>
    </div>
  );
}

function RoutePage({ event }) {
  const venues = useMemo(() => createMapVenues(event), [event]);
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? "");
  const [activeMapFilter, setActiveMapFilter] = useState("all");
  const [detailVenueId, setDetailVenueId] = useState("");
  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) ?? venues[0];
  const detailVenue = venues.find((venue) => venue.id === detailVenueId);
  const selectedVenueType = selectedVenue ? mapVenueType(selectedVenue.pinType || selectedVenue.type) : "venue";
  const activitiesForVenue = (event.activities ?? []).filter(
    (activity) => activity.venueId === selectedVenue?.id
  );
  const sponsorsForVenue = (event.sponsors ?? []).filter(
    (sponsor) => sponsor.venueId === selectedVenue?.id
  );
  const activitiesForDetailVenue = (event.activities ?? []).filter(
    (activity) => activity.venueId === detailVenue?.id
  );
  const sponsorsForDetailVenue = (event.sponsors ?? []).filter(
    (sponsor) => sponsor.venueId === detailVenue?.id
  );
  const coordinateBounds = useMemo(() => createCoordinateBounds(venues), [venues]);
  const usingRealCoordinates = Boolean(coordinateBounds);
  const visibleVenues = activeMapFilter === "all"
    ? venues
    : venues.filter((venue) => mapVenueType(venue.pinType || venue.type) === activeMapFilter);
  const sponsorsOnMap = (event.sponsors ?? []).slice(0, 4);
  const filterOptions = [
    ["all", "All"],
    ["start", "Start/finish"],
    ["rest", "Rest spots"],
    ["booth", "Booths"],
    ["medical", "Medical"],
    ["stage", "Stage"],
    ["parking", "Parking"],
    ["toilet", "Toilet"]
  ].filter(([id]) => id === "all" || filterCountForVenue(venues, id) > 0);

  useEffect(() => {
    if (!selectedVenueId && venues[0]) setSelectedVenueId(venues[0].id);
  }, [selectedVenueId, venues]);

  return (
    <div className="page">
      <PageTitle
        description="Explore the course, start/finish area, rest stops, booths, sponsors, and venue schedules."
        eyebrow="Interactive event map"
        title="CycloFest guide"
      />

      <div className="map-filter-tabs" aria-label="Map filters">
        {filterOptions.map(([id, label]) => (
          <button
            className={activeMapFilter === id ? "active" : ""}
            key={id}
            onClick={() => setActiveMapFilter(id)}
            type="button"
          >
            <span>{label}</span>
            <strong>{filterCountForVenue(venues, id)}</strong>
          </button>
        ))}
      </div>

      <section className={`route-map interactive-map ${usingRealCoordinates ? "coordinate-map" : "stylized-map"}`}>
        <div className="map-mode-badge">
          <strong>{usingRealCoordinates ? "Coordinate map" : "Stylized map"}</strong>
          <span>{usingRealCoordinates ? `${coordinateBounds.count} real pin locations` : "Add latitude/longitude in admin"}</span>
        </div>
        {!usingRealCoordinates && (
          <>
            <div className="map-zone zone-start">Start village</div>
            <div className="map-zone zone-support">Support area</div>
            <div className="map-zone zone-festival">Festival hub</div>
          </>
        )}
        <div className="map-grid" />
        {usingRealCoordinates ? (
          <svg aria-label="Coordinate-based venue area" className="route-line coordinate-route" viewBox="0 0 360 270">
            <path className="route-shadow" d="M40 210 C96 130, 142 166, 184 94 S274 64, 318 122" />
            <path d="M40 210 C96 130, 142 166, 184 94 S274 64, 318 122" />
          </svg>
        ) : (
          <svg aria-label="Stylized cycling route" className="route-line" viewBox="0 0 360 270">
            <path className="route-shadow" d="M42 220 C70 180, 55 115, 115 105 S184 170, 213 129 S255 42, 315 68 S321 177, 285 211 S171 232, 42 220" />
            <path d="M42 220 C70 180, 55 115, 115 105 S184 170, 213 129 S255 42, 315 68 S321 177, 285 211 S171 232, 42 220" />
          </svg>
        )}
        {visibleVenues.map((venue, index) => {
          const position = projectVenuePosition(venue, index, coordinateBounds);
          const type = mapVenueType(venue.pinType || venue.type);
          return (
            <button
              className={`map-pin map-pin-button ${type} ${selectedVenue?.id === venue.id ? "active" : ""}`}
              key={venue.id}
              onClick={() => {
                setSelectedVenueId(venue.id);
                setDetailVenueId(venue.id);
              }}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              type="button"
            >
              <span>{venue.mapLabel || (type === "start" ? "START" : type === "rest" ? "REST" : type === "booth" ? "BOOTH" : type === "medical" ? "MED" : type === "stage" ? "STAGE" : "PIN")}</span>
              <small>{venueTypeLabel(venue.pinType || venue.type)}</small>
            </button>
          );
        })}
        {sponsorsOnMap.map((sponsor, index) => {
          const sponsorVenue = venues.find((venue) => venue.id === sponsor.venueId);
          const position = sponsorVenue
            ? projectVenuePosition(sponsorVenue, index + 3, coordinateBounds)
            : mapPinPositions[(index + 3) % mapPinPositions.length];
          return (
            <span
              className="map-sponsor-dot"
              key={sponsor.id}
              style={{ left: `${Math.min(position.x + 7, 88)}%`, top: `${Math.min(position.y + 8, 82)}%` }}
              title={sponsor.name}
            >
              {sponsor.name.slice(0, 1)}
            </span>
          );
        })}
        <div className="map-caption">
          <span>Tap a pin for details</span>
          <strong>{event.maxDistanceKm} KM - {event.location}</strong>
        </div>
      </section>

      <div className="route-summary">
        <div><strong>{event.maxDistanceKm} KM</strong><span>Max course</span></div>
        <div><strong>{venues.length}</strong><span>Map places</span></div>
        <div><strong>{event.activities?.length ?? 0}</strong><span>Activities</span></div>
      </div>

      {selectedVenue && (
        <section className="venue-detail-card">
          <div className={`venue-type-badge ${selectedVenueType}`}>
            {venueTypeLabel(selectedVenue.type)}
          </div>
          <h2>{selectedVenue.name}</h2>
          <p>{selectedVenue.description || "Details will be added by the organizer."}</p>
          {selectedVenue.address && (
            <span className="venue-address"><Icon name="location" size={16} /> {selectedVenue.address}</span>
          )}
          {sponsorsForVenue.length > 0 && (
            <div className="venue-sponsor-strip">
              <span>Sponsors here</span>
              <strong>{sponsorsForVenue.map((sponsor) => sponsor.name).join(", ")}</strong>
            </div>
          )}
          <div className="venue-mini-facts">
            <span>{activitiesForVenue.length} activities</span>
            <span>{sponsorsForVenue.length} sponsor booths</span>
          </div>
          <div className="venue-actions">
            <button onClick={() => setDetailVenueId(selectedVenue.id)} type="button">Open details</button>
            <button disabled type="button">Near me later</button>
          </div>
        </section>
      )}

      <section className="venue-list-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Area guide</p><h2>Places on the map</h2></div>
        </div>
        <div className="venue-card-list">
          {venues.map((venue) => (
            <button
              className={selectedVenue?.id === venue.id ? "active" : ""}
              key={venue.id}
              onClick={() => setSelectedVenueId(venue.id)}
              type="button"
            >
              <strong>{venue.name}</strong>
              <span>{venueTypeLabel(venue.pinType || venue.type)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="activity-location-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Schedule by location</p>
            <h2>{selectedVenue?.name ?? "Selected venue"}</h2>
          </div>
        </div>
        <div className="activity-location-list">
          {activitiesForVenue.map((activity) => (
            <article key={activity.id}>
              <time>{activityTimeRange(activity)}</time>
              <div>
                <strong>{activity.name}</strong>
                <p>{activity.description || activity.type}</p>
              </div>
            </article>
          ))}
          {activitiesForVenue.length === 0 && (
            <p className="empty-location-note">No activities assigned here yet. The organizer can add them from the admin content editor.</p>
          )}
        </div>
      </section>

      {event.sponsors?.length > 0 && (
        <section className="map-sponsor-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Sponsors nearby</p><h2>Stands and partners</h2></div>
          </div>
          <div className="map-sponsor-list">
            {event.sponsors.slice(0, 6).map((sponsor) => (
              <article key={sponsor.id}>
                {sponsor.logoUrl && <img alt="" src={sponsor.logoUrl} />}
                <strong>{sponsor.name}</strong>
                <span>{sponsor.tier || "Partner"}{sponsor.venueId ? " - booth assigned" : ""}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="checkpoint-list">
        <div className="section-heading">
          <div><p className="eyebrow">Course support</p><h2>Checkpoints</h2></div>
        </div>
        {event.checkpoints.map((checkpoint) => (
          <article key={`${checkpoint.kilometer}-${checkpoint.name}`}>
            <div className="km-badge">{checkpoint.kilometer}<small>KM</small></div>
            <div>
              <h3>{checkpoint.name}</h3>
              <p>{checkpoint.detail}</p>
            </div>
            <Icon name="chevron" size={18} />
          </article>
        ))}
      </section>

      <VenueDetailModal
        activities={activitiesForDetailVenue}
        onClose={() => setDetailVenueId("")}
        sponsors={sponsorsForDetailVenue}
        venue={detailVenue}
      />
    </div>
  );
}

function LegacyRoutePage({ event }) {
  return (
    <div className="page">
      <PageTitle
        description="Preview the official 100 KM course and its main support points."
        eyebrow="Route preview"
        title="Ride through the city"
      />
      <section className="route-map">
        <div className="map-grid" />
        <svg aria-label="Stylized cycling route" className="route-line" viewBox="0 0 360 270">
          <path d="M42 220 C70 180, 55 115, 115 105 S184 170, 213 129 S255 42, 315 68 S321 177, 285 211 S171 232, 42 220" />
        </svg>
        <span className="map-pin start-pin">START</span>
        <span className="map-pin aid-pin">AID</span>
        <span className="map-pin finish-pin">FINISH</span>
        <div className="map-caption">
          <span>Official route</span>
          <strong>100 KM · Jakarta loop</strong>
        </div>
      </section>
      <div className="route-summary">
        <div><strong>100 KM</strong><span>Distance</span></div>
        <div><strong>480 M</strong><span>Elevation</span></div>
        <div><strong>2</strong><span>Aid stations</span></div>
      </div>
      <section className="checkpoint-list">
        <div className="section-heading">
          <div><p className="eyebrow">Course support</p><h2>Checkpoints</h2></div>
        </div>
        {event.checkpoints.map((checkpoint) => (
          <article key={`${checkpoint.kilometer}-${checkpoint.name}`}>
            <div className="km-badge">{checkpoint.kilometer}<small>KM</small></div>
            <div>
              <h3>{checkpoint.name}</h3>
              <p>{checkpoint.detail}</p>
            </div>
            <Icon name="chevron" size={18} />
          </article>
        ))}
      </section>
    </div>
  );
}

function ProfilePage({ ticket, onRegister }) {
  return (
    <div className="page">
      <PageTitle
        description="Your registration, ticket, and race-day details will live here."
        eyebrow="Rider account"
        title={ticket ? `Hi, ${ticket.fullName.split(" ")[0]}` : "Ready to ride?"}
      />
      {ticket ? (
        <>
          <section className="ticket-card">
            <div className="ticket-top">
              <span>Confirmed prototype</span>
              <Icon name="ticket" size={28} />
            </div>
            <h2>{ticket.category.name}</h2>
            <p>{ticket.category.distanceKm} KM · {ticket.jerseySize} jersey</p>
            <div className="ticket-number">
              <span>Participant number</span>
              <strong>CF26-DEMO</strong>
            </div>
            <div className="fake-qr" aria-label="Decorative ticket code">
              {Array.from({ length: 36 }).map((_, index) => <i key={index} />)}
            </div>
            <small>This ticket is a UI preview and is not valid for event entry.</small>
          </section>
          <div className="profile-list">
            <div><span>Email</span><strong>{ticket.email}</strong></div>
            <div><span>Phone</span><strong>{ticket.phone}</strong></div>
            <div><span>Payment</span><strong className="pending">Not connected yet</strong></div>
          </div>
        </>
      ) : (
        <section className="empty-profile">
          <div className="empty-icon"><Icon name="user" size={34} /></div>
          <h2>No registration yet</h2>
          <p>Choose a ride and complete the prototype registration to preview your rider ticket.</p>
          <button className="primary-action" onClick={() => onRegister()} type="button">
            Start registration <Icon name="arrow" size={18} />
          </button>
        </section>
      )}
      <aside className="safety-card">
        <Icon name="shield" size={26} />
        <div><strong>Your real data is not stored yet</strong><p>This frontend prototype keeps registration only in memory until the backend database is built.</p></div>
      </aside>
    </div>
  );
}

function RiderProfilePage({
  error,
  loading,
  onRefresh,
  onRegister,
  onRotateQr,
  session
}) {
  const registration = session?.registration;
  const payment = session?.payment;
  const ticket = session?.ticket;
  const riderName = ticket?.participant?.fullName ?? registration?.participant?.fullName;
  const firstName = riderName?.split(" ")[0];
  const statusLabel = ticket?.status ?? registration?.status ?? "NO_REGISTRATION";

  return (
    <div className="page">
      <PageTitle
        description="Your registration, payment, ticket, and race-day details live here."
        eyebrow="Rider account"
        title={firstName ? `Hi, ${firstName}` : "Ready to ride?"}
      />
      {registration ? (
        <>
          <section className={`ticket-card ${ticket ? "" : "pending-ticket"}`}>
            <div className="ticket-top">
              <span>{ticket ? "Real ticket issued" : "Registration pending"}</span>
              <Icon name="ticket" size={28} />
            </div>
            <h2>{(ticket ?? registration).category.name}</h2>
            <p>
              {(ticket ?? registration).category.distanceKm} KM
              {registration.jerseySize ? ` - ${registration.jerseySize} jersey` : ""}
            </p>
            <div className="ticket-number">
              <span>Participant number</span>
              <strong>{ticket?.participantNumber ?? registration.id}</strong>
            </div>
            {ticket ? (
              <>
                <TokenQr value={session.qrPayload ?? session.qrToken ?? ticket.id} />
                <small>Status: {ticket.status}. Rotate the token if you need a fresh QR.</small>
              </>
            ) : (
              <>
                <div className="pending-ticket-note">
                  <strong>Waiting for payment confirmation</strong>
                  <span>After the mock payment webhook marks this paid, your ticket appears here.</span>
                </div>
                <small>Ticket is issued automatically after a successful payment webhook.</small>
              </>
            )}
          </section>
          {error && <p className="inline-error">{error}</p>}
          <div className="profile-list">
            <div><span>Registration ID</span><strong>{registration.id}</strong></div>
            <div><span>Email</span><strong>{registration.participant.email}</strong></div>
            <div><span>Phone</span><strong>{registration.participant.phone}</strong></div>
            <div><span>Registration</span><strong>{statusLabel}</strong></div>
            <div>
              <span>Payment</span>
              <strong className={payment?.status === "PAID" ? "" : "pending"}>
                {payment?.status ?? "Not created"}
              </strong>
            </div>
            <div><span>Total</span><strong>{formatRupiah(registration.totalAmount)}</strong></div>
          </div>
          {payment?.id && payment.status !== "PAID" && (
            <div className="mock-payment-help">
              <span>Local test command</span>
              <code>npm run payment:mock -- MOCK-{payment.id} PAID</code>
            </div>
          )}
          {payment?.checkoutUrl && payment.status !== "PAID" && (
            <a className="primary-action" href={payment.checkoutUrl} rel="noreferrer" target="_blank">
              Open mock checkout <Icon name="arrow" size={18} />
            </a>
          )}
          <button className="secondary-action" disabled={loading} onClick={onRefresh} type="button">
            {loading ? "Refreshing..." : "Refresh payment and ticket"}
          </button>
          {ticket && (
            <button className="secondary-action" disabled={loading} onClick={onRotateQr} type="button">
              Rotate QR token
            </button>
          )}
        </>
      ) : (
        <section className="empty-profile">
          <div className="empty-icon"><Icon name="user" size={34} /></div>
          <h2>No registration yet</h2>
          <p>Choose a ride and complete the form to create a real pending registration in PostgreSQL.</p>
          <button className="primary-action" onClick={() => onRegister()} type="button">
            Start registration <Icon name="arrow" size={18} />
          </button>
        </section>
      )}
      <aside className="safety-card">
        <Icon name="shield" size={26} />
        <div>
          <strong>Local testing mode</strong>
          <p>Your registration token is saved in this browser so you can refresh and keep testing the rider flow.</p>
        </div>
      </aside>
    </div>
  );
}

function RegistrationModal({ event, initialCategoryId, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...initialForm, categoryId: initialCategoryId || event.categories[0].id });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const selectedCategory = event.categories.find((category) => category.id === form.categoryId);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateCurrentStep() {
    const nextErrors = {};
    if (step === 1 && !form.categoryId) nextErrors.categoryId = "Choose a ride.";
    if (step === 2) {
      if (form.fullName.trim().length < 3) nextErrors.fullName = "Enter your full name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email.";
      if (form.phone.replace(/\D/g, "").length < 9) nextErrors.phone = "Enter a valid phone number.";
      if (!form.birthDate) nextErrors.birthDate = "Enter your date of birth.";
    }
    if (step === 3) {
      if (form.emergencyName.trim().length < 3) nextErrors.emergencyName = "Enter a contact name.";
      if (form.emergencyPhone.replace(/\D/g, "").length < 9) nextErrors.emergencyPhone = "Enter a valid phone number.";
      if (!form.waiverAccepted) nextErrors.waiverAccepted = "You must accept the event rules.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (validateCurrentStep()) setStep((current) => Math.min(current + 1, 4));
  }

  async function submitRegistration() {
    setSubmitting(true);
    setErrors({});
    try {
      await onComplete({ ...form, category: selectedCategory });
    } catch (requestError) {
      setErrors({ submit: requestError.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="CycloFest registration" aria-modal="true" className="registration-sheet" role="dialog">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div>
            <p>Step {step} of 4</p>
            <h2>Register for CycloFest</h2>
          </div>
          <button aria-label="Close registration" className="icon-button" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </header>
        <div className="step-progress">
          {[1, 2, 3, 4].map((number) => <span className={number <= step ? "active" : ""} key={number} />)}
        </div>

        <div className="sheet-content">
          {step === 1 && (
            <>
              <div className="form-heading"><p className="eyebrow">Choose category</p><h3>Which ride is yours?</h3></div>
              <div className="category-options">
                {event.categories.map((category) => (
                  <label className={form.categoryId === category.id ? "selected" : ""} key={category.id}>
                    <input
                      checked={form.categoryId === category.id}
                      name="category"
                      onChange={() => updateField("categoryId", category.id)}
                      type="radio"
                    />
                    <div><strong>{category.name}</strong><span>{category.distanceKm} KM · {category.level}</span></div>
                    <b>{formatRupiah(category.price)}</b>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-heading"><p className="eyebrow">Rider details</p><h3>Tell us about yourself</h3></div>
              <Field error={errors.fullName} label="Full name">
                <input onChange={(event) => updateField("fullName", event.target.value)} placeholder="Your legal name" value={form.fullName} />
              </Field>
              <Field error={errors.email} label="Email address">
                <input onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" type="email" value={form.email} />
              </Field>
              <Field error={errors.phone} label="Phone number">
                <input onChange={(event) => updateField("phone", event.target.value)} placeholder="+62 812 3456 7890" type="tel" value={form.phone} />
              </Field>
              <Field error={errors.birthDate} label="Date of birth">
                <input onChange={(event) => updateField("birthDate", event.target.value)} type="date" value={form.birthDate} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="form-heading"><p className="eyebrow">Safety details</p><h3>Emergency and race pack</h3></div>
              <Field error={errors.emergencyName} label="Emergency contact">
                <input onChange={(event) => updateField("emergencyName", event.target.value)} placeholder="Contact full name" value={form.emergencyName} />
              </Field>
              <Field error={errors.emergencyPhone} label="Emergency phone">
                <input onChange={(event) => updateField("emergencyPhone", event.target.value)} placeholder="+62 812 3456 7890" type="tel" value={form.emergencyPhone} />
              </Field>
              <Field label="Jersey size">
                <div className="size-options">
                  {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                    <button className={form.jerseySize === size ? "selected" : ""} key={size} onClick={() => updateField("jerseySize", size)} type="button">{size}</button>
                  ))}
                </div>
              </Field>
              <label className={`waiver ${errors.waiverAccepted ? "has-error" : ""}`}>
                <input checked={form.waiverAccepted} onChange={(event) => updateField("waiverAccepted", event.target.checked)} type="checkbox" />
                <span>I understand cycling has risks and I agree to follow the organizer's safety rules.</span>
              </label>
              {errors.waiverAccepted && <small className="field-error">{errors.waiverAccepted}</small>}
            </>
          )}

          {step === 4 && (
            <>
              <div className="form-heading"><p className="eyebrow">Review</p><h3>Check your registration</h3></div>
              <div className="review-card">
                <div><span>Rider</span><strong>{form.fullName}</strong></div>
                <div><span>Category</span><strong>{selectedCategory.name} · {selectedCategory.distanceKm} KM</strong></div>
                <div><span>Jersey</span><strong>Size {form.jerseySize}</strong></div>
                <div><span>Registration</span><strong>{formatRupiah(selectedCategory.price)}</strong></div>
                <hr />
                <div className="review-total"><span>Total</span><strong>{formatRupiah(selectedCategory.price)}</strong></div>
              </div>
              <aside className="prototype-warning">
                <Icon name="shield" />
                <p>This creates a real pending registration, then opens a mock payment for local testing.</p>
              </aside>
              {errors.submit && <small className="field-error">{errors.submit}</small>}
            </>
          )}
        </div>

        <footer className="sheet-footer">
          {step > 1 && <button className="back-button" onClick={() => setStep((current) => current - 1)} type="button">Back</button>}
          {step < 4 ? (
            <button className="continue-button" onClick={nextStep} type="button">Continue <Icon name="arrow" size={17} /></button>
          ) : (
            <button className="continue-button" disabled={submitting} onClick={submitRegistration} type="button">
              {submitting ? "Creating..." : "Create registration"} <Icon name="check" size={17} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function Field({ children, error, label }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function AdminShell({ children }) {
  return (
    <div className="admin-shell">
      <main className="admin-content">{children}</main>
    </div>
  );
}

function AdminLoginPage({ onBackToApp, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function fillLocalTestOwner() {
    setEmail("matthew.arsene.en@email.com");
    setPassword("CycloFestOwner2026");
    setError("");
  }

  async function submitLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await apiRequest("/organizer/auth/login", {
        body: { email, password }
      });
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell>
      <section className="admin-login-card">
        <button className="admin-back-link" onClick={onBackToApp} type="button">
          Back to public app
        </button>
        <div className="admin-brand">
          <div className="brand-mark">
            <Icon name="bike" size={24} />
          </div>
          <div>
            <p className="eyebrow">Organizer console</p>
            <h1>CycloFest Admin</h1>
            <span>Manage event content, registrations, and operations.</span>
          </div>
        </div>

        <form className="admin-login-form" onSubmit={submitLogin}>
          <Field label="Owner email">
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="owner@example.com"
              type="email"
              value={email}
            />
          </Field>
          <Field label="Password">
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your organizer password"
              type="password"
              value={password}
            />
          </Field>
          {error && <p className="admin-error">{error}</p>}
          <button
            className="secondary-action"
            disabled={loading}
            onClick={fillLocalTestOwner}
            type="button"
          >
            Use local test owner
          </button>
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in to dashboard"}
          </button>
        </form>

        <aside className="admin-note">
          <Icon name="shield" size={22} />
          <p>
            Local test owner: <strong>matthew.arsene.en@email.com</strong> /
            <strong> CycloFestOwner2026</strong>. Use <strong>npm run auth:bootstrap</strong>
            if you reset the database.
            Remove bootstrap credentials from <strong>.env</strong> after setup.
          </p>
        </aside>
      </section>
    </AdminShell>
  );
}

function AdminStatCard({ label, value, helper }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </article>
  );
}

function createEventDetailsForm(eventDetails) {
  const translations = eventDetails?.translations ?? {};
  const fallback = {
    name: eventDetails?.name ?? "",
    tagline: eventDetails?.tagline ?? "",
    description: eventDetails?.description ?? "",
    dateLabel: eventDetails?.dateLabel ?? "",
    location: eventDetails?.location ?? "",
    venue: eventDetails?.venue ?? ""
  };

  return {
    status: eventDetails?.status ?? "DRAFT",
    date: eventDetails?.date ?? "",
    registrationTarget: eventDetails?.registrationTarget ?? "",
    translations: {
      id: { ...fallback, ...(translations.id ?? {}) },
      en: { ...fallback, ...(translations.en ?? {}) }
    }
  };
}

function AdminQuickLinkCard({ description, onOpen, status, title }) {
  return (
    <button className="admin-quick-link" onClick={onOpen} type="button">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <small>{status}</small>
    </button>
  );
}

function AdminEventDetailsEditor({
  error,
  eventDetails,
  loading,
  message,
  onBack,
  onPreview,
  onSave,
  saving
}) {
  const [form, setForm] = useState(() => createEventDetailsForm(eventDetails));
  const [languageTab, setLanguageTab] = useState("id");

  useEffect(() => {
    setForm(createEventDetailsForm(eventDetails));
  }, [eventDetails]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTranslation(field, value) {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [languageTab]: {
          ...current.translations[languageTab],
          [field]: value
        }
      }
    }));
  }

  function submitForm(event) {
    event.preventDefault();
    onSave({
      date: form.date || null,
      status: form.status,
      registrationTarget: form.registrationTarget === "" ? null : Number(form.registrationTarget),
      translations: form.translations
    });
  }

  const currentTranslation = form.translations[languageTab];

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <div>
          <p className="eyebrow">Content editor</p>
          <h2>Event details</h2>
          <span>Edit the content visitors see in Indonesian and English.</span>
        </div>
        <div className="admin-actions">
          <button onClick={onBack} type="button">Dashboard</button>
          <button onClick={onPreview} type="button">Preview public app</button>
          <button disabled type="button">Publish later</button>
        </div>
      </header>

      {loading && <div className="admin-loading"><span className="loader" /> Loading event details...</div>}
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {!loading && (
        <form className="admin-editor-form" onSubmit={submitForm}>
          <section className="admin-editor-card">
            <div className="admin-form-section-heading">
              <div>
                <h3>Shared event settings</h3>
                <p>Date and target are shared across both languages.</p>
              </div>
            </div>
            <div className="admin-form-grid two">
              <Field label="Event date">
                <input
                  onChange={(event) => updateField("date", event.target.value)}
                  type="date"
                  value={form.date}
                />
              </Field>
              <Field label="Registration target">
                <input
                  min="0"
                  onChange={(event) => updateField("registrationTarget", event.target.value)}
                  placeholder="Example: 1200"
                  type="number"
                  value={form.registrationTarget}
                />
              </Field>
              <Field label="Event status">
                <select
                  onChange={(event) => updateField("status", event.target.value)}
                  value={form.status}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REGISTRATION_OPEN">Registration Open</option>
                  <option value="REGISTRATION_CLOSED">Registration Closed</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="admin-editor-card">
            <div className="admin-language-tabs">
              <button
                className={languageTab === "id" ? "active" : ""}
                onClick={() => setLanguageTab("id")}
                type="button"
              >
                Indonesian
              </button>
              <button
                className={languageTab === "en" ? "active" : ""}
                onClick={() => setLanguageTab("en")}
                type="button"
              >
                English
              </button>
            </div>

            <div className="admin-form-grid">
              <Field label="Event name">
                <input
                  onChange={(event) => updateTranslation("name", event.target.value)}
                  placeholder={languageTab === "id" ? "Nama acara" : "Event name"}
                  value={currentTranslation.name}
                />
              </Field>
              <Field label="Tagline">
                <input
                  onChange={(event) => updateTranslation("tagline", event.target.value)}
                  placeholder={languageTab === "id" ? "Tagline acara" : "Event tagline"}
                  value={currentTranslation.tagline ?? ""}
                />
              </Field>
              <Field label="Description">
                <textarea
                  onChange={(event) => updateTranslation("description", event.target.value)}
                  placeholder={languageTab === "id" ? "Deskripsi acara" : "Event description"}
                  rows="5"
                  value={currentTranslation.description ?? ""}
                />
              </Field>
              <div className="admin-form-grid two">
                <Field label="Date label">
                  <input
                    onChange={(event) => updateTranslation("dateLabel", event.target.value)}
                    placeholder="20 September 2026"
                    value={currentTranslation.dateLabel ?? ""}
                  />
                </Field>
                <Field label="Location">
                  <input
                    onChange={(event) => updateTranslation("location", event.target.value)}
                    placeholder="Jakarta, Indonesia"
                    value={currentTranslation.location ?? ""}
                  />
                </Field>
              </div>
              <Field label="Main venue">
                <input
                  onChange={(event) => updateTranslation("venue", event.target.value)}
                  placeholder={languageTab === "id" ? "Nama venue utama" : "Main venue name"}
                  value={currentTranslation.venue ?? ""}
                />
              </Field>
            </div>
          </section>

          <footer className="admin-editor-footer">
            <div>
              <strong>Saving mode: draft</strong>
              <span>Publish controls will be added after the editor flow is stable.</span>
            </div>
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Saving draft..." : "Save draft"}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

const templateLabels = {
  registrationConfirmation: "Registration confirmation",
  paymentReminder: "Payment reminder",
  ticketConfirmation: "Ticket confirmation",
  ticketResend: "Ticket resend",
  eventBroadcast: "Event broadcast"
};

function createMessagingSettingsForm(settings) {
  return {
    emailProvider: settings?.emailProvider ?? "mock",
    emailApiKey: "",
    senderEmail: settings?.senderEmail ?? "",
    senderName: settings?.senderName ?? "",
    whatsappProvider: settings?.whatsappProvider ?? "mock",
    whatsappApiKey: "",
    whatsappPhoneNumber: settings?.whatsappPhoneNumber ?? "",
    templates: settings?.templates ?? {}
  };
}

function AdminMessagingSettingsEditor({
  error,
  loading,
  message,
  onBack,
  onSave,
  saving,
  settings
}) {
  const [form, setForm] = useState(() => createMessagingSettingsForm(settings));
  const [activeTemplate, setActiveTemplate] = useState("registrationConfirmation");

  useEffect(() => {
    setForm(createMessagingSettingsForm(settings));
  }, [settings]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTemplate(field, value) {
    setForm((current) => ({
      ...current,
      templates: {
        ...current.templates,
        [activeTemplate]: {
          ...(current.templates[activeTemplate] ?? {}),
          [field]: value
        }
      }
    }));
  }

  function submitForm(event) {
    event.preventDefault();
    onSave(form);
  }

  const template = form.templates[activeTemplate] ?? {};

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <div>
          <p className="eyebrow">Messaging settings</p>
          <h2>Email, WhatsApp, and templates</h2>
          <span>Configure sender identity now. Provider keys can be pasted later when the client is ready.</span>
        </div>
        <div className="admin-actions">
          <button onClick={onBack} type="button">Dashboard</button>
        </div>
      </header>

      {loading && <div className="admin-loading"><span className="loader" /> Loading messaging settings...</div>}
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      <form className="admin-editor-form" onSubmit={submitForm}>
        <section className="admin-settings-grid">
          <div className="admin-editor-card">
            <div className="admin-form-section-heading">
              <div>
                <h3>Email provider</h3>
                <p>Use mock for local testing. Later choose the provider the client pays for.</p>
              </div>
            </div>
            <div className="admin-form-grid two">
              <Field label="Provider">
                <select onChange={(event) => updateField("emailProvider", event.target.value)} value={form.emailProvider}>
                  <option value="mock">Mock / testing</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="resend">Resend</option>
                  <option value="ses">Amazon SES</option>
                </select>
              </Field>
              <Field label="Sender email">
                <input
                  onChange={(event) => updateField("senderEmail", event.target.value)}
                  placeholder="hello@cyclofest.id"
                  type="email"
                  value={form.senderEmail}
                />
              </Field>
            </div>
            <div className="admin-form-grid two">
              <Field label="Sender name">
                <input
                  onChange={(event) => updateField("senderName", event.target.value)}
                  placeholder="CycloFest Team"
                  value={form.senderName}
                />
              </Field>
              <Field label={settings?.emailApiKeySaved ? "API key saved - replace key" : "API key"}>
                <input
                  onChange={(event) => updateField("emailApiKey", event.target.value)}
                  placeholder={settings?.emailApiKeySaved ? "Saved. Type a new key to replace." : "Paste API key later"}
                  type="password"
                  value={form.emailApiKey}
                />
              </Field>
            </div>
          </div>

          <div className="admin-editor-card">
            <div className="admin-form-section-heading">
              <div>
                <h3>WhatsApp provider</h3>
                <p>Keep mock until the client has a WhatsApp Business/API provider.</p>
              </div>
            </div>
            <div className="admin-form-grid two">
              <Field label="Provider">
                <select onChange={(event) => updateField("whatsappProvider", event.target.value)} value={form.whatsappProvider}>
                  <option value="mock">Mock / testing</option>
                  <option value="whatsapp_cloud">WhatsApp Cloud API</option>
                  <option value="twilio">Twilio</option>
                  <option value="qontak">Qontak</option>
                  <option value="wati">WATI</option>
                </select>
              </Field>
              <Field label="WhatsApp number">
                <input
                  onChange={(event) => updateField("whatsappPhoneNumber", event.target.value)}
                  placeholder="+62 812 0000 0000"
                  value={form.whatsappPhoneNumber}
                />
              </Field>
            </div>
            <Field label={settings?.whatsappApiKeySaved ? "API key saved - replace key" : "API key"}>
              <input
                onChange={(event) => updateField("whatsappApiKey", event.target.value)}
                placeholder={settings?.whatsappApiKeySaved ? "Saved. Type a new key to replace." : "Paste API key later"}
                type="password"
                value={form.whatsappApiKey}
              />
            </Field>
          </div>
        </section>

        <section className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>Message templates</h3>
              <p>Templates can use variables like {"{{fullName}}"}, {"{{eventName}}"}, {"{{registrationId}}"}, and {"{{checkoutUrl}}"}.</p>
            </div>
          </div>
          <div className="admin-language-tabs">
            {Object.entries(templateLabels).map(([key, label]) => (
              <button
                className={activeTemplate === key ? "active" : ""}
                key={key}
                onClick={() => setActiveTemplate(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="admin-form-grid">
            <Field label="Subject">
              <input
                onChange={(event) => updateTemplate("subject", event.target.value)}
                value={template.subject ?? ""}
              />
            </Field>
            <Field label="Body">
              <textarea
                onChange={(event) => updateTemplate("body", event.target.value)}
                rows="6"
                value={template.body ?? ""}
              />
            </Field>
          </div>
        </section>

        <footer className="admin-editor-footer">
          <div>
            <strong>Provider-ready, not live-sending yet</strong>
            <span>Keys are saved for later integration, while the current app still uses the mock message log.</span>
          </div>
          <button className="primary-action" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save messaging settings"}
          </button>
        </footer>
      </form>
    </section>
  );
}

const emptyContentForms = {
  venues: {
    id: "",
    name: "",
    type: "VENUE",
    pinType: "VENUE",
    mapLabel: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    sortOrder: 0
  },
  sponsors: {
    id: "",
    name: "",
    tier: "",
    venueId: "",
    logoUrl: "",
    websiteUrl: "",
    description: "",
    sortOrder: 0
  },
  activities: {
    id: "",
    venueId: "",
    name: "",
    type: "GENERAL",
    description: "",
    startsAt: "",
    endsAt: "",
    sortOrder: 0
  }
};

const venueTypeOptions = [
  ["START_FINISH", "Start/Finish"],
  ["REST_STOP", "Rest Stop"],
  ["BOOTH", "Booth"],
  ["MEDICAL", "Medical"],
  ["STAGE", "Stage"],
  ["SPONSOR_STAND", "Sponsor Stand"],
  ["PARKING", "Parking"],
  ["TOILET", "Toilet"],
  ["VENUE", "General Venue"]
];

const activityTypeOptions = [
  ["GENERAL", "General"],
  ["RIDE", "Ride"],
  ["STAGE", "Stage Program"],
  ["WORKSHOP", "Workshop"],
  ["MEETUP", "Meetup"],
  ["FOOD", "Food"],
  ["SUPPORT", "Support"],
  ["AFTER_PARTY", "After Party"]
];

const sponsorTierOptions = ["Title", "Platinum", "Gold", "Silver", "Bronze", "Community"];

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function createContentForm(type, item) {
  if (!item) return { ...emptyContentForms[type] };
  if (type === "activities") {
    return {
      ...emptyContentForms.activities,
      ...item,
      id: item.id,
      startsAt: toLocalDateTimeInput(item.startsAt),
      endsAt: toLocalDateTimeInput(item.endsAt)
    };
  }
  return { ...emptyContentForms[type], ...item, id: item.id };
}

function ContentPreviewCard({ activeType, content, form }) {
  const assignedVenue = (content?.venues ?? []).find((venue) => venue.id === form.venueId);

  return (
    <aside className="admin-preview-card">
      <div className="admin-preview-phone">
        <div className="preview-header">
          <span>{activeType === "venues" ? "Map preview" : activeType === "activities" ? "Schedule preview" : "Sponsor preview"}</span>
          <strong>{form.name || "Untitled"}</strong>
        </div>

        {activeType === "sponsors" && (
          <div className="preview-logo-frame">
            {form.logoUrl ? <img alt="" src={form.logoUrl} /> : <span>{(form.name || "S").slice(0, 1)}</span>}
          </div>
        )}

        {activeType === "venues" && (
          <div className="preview-map-strip">
            <span className={`map-pin preview-pin ${mapVenueType(form.pinType || form.type)}`}>
              <span>{form.mapLabel || "PIN"}</span>
            </span>
            <div>
              <strong>{venueTypeLabel(form.pinType || form.type)}</strong>
              <small>{form.address || "Address not set"}</small>
            </div>
          </div>
        )}

        {activeType === "activities" && (
          <div className="preview-time-strip">
            <time>{activityTimeRange(form)}</time>
            <span>{assignedVenue?.name || "No venue assigned"}</span>
          </div>
        )}

        {activeType === "sponsors" && (
          <div className="preview-time-strip">
            <time>{form.tier || "Partner"}</time>
            <span>{assignedVenue?.name || "No booth assigned"}</span>
          </div>
        )}

        <p>{form.description || "Description preview will appear here."}</p>
        {activeType === "sponsors" && form.websiteUrl && <small className="preview-link">{form.websiteUrl}</small>}
      </div>
      <p>This is a draft preview inside admin. Saving makes it available to the public app after refresh.</p>
    </aside>
  );
}

function AdminContentEditor({
  activeType,
  content,
  error,
  loading,
  message,
  onArchive,
  onBack,
  onEditType,
  onSave,
  saving
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(() => createContentForm(activeType));

  useEffect(() => {
    setEditingItem(null);
    setForm(createContentForm(activeType));
  }, [activeType]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editItem(item) {
    setEditingItem(item);
    setForm(createContentForm(activeType, item));
  }

  function resetForm() {
    setEditingItem(null);
    setForm(createContentForm(activeType));
  }

  function submitForm(event) {
    event.preventDefault();
    onSave(activeType, form, editingItem?.id).then(resetForm).catch(() => {});
  }

  const items = content?.[activeType] ?? [];
  const titleMap = {
    venues: "Venues",
    sponsors: "Sponsors",
    activities: "Activities"
  };

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <div>
          <p className="eyebrow">Content editor</p>
          <h2>{titleMap[activeType]}</h2>
          <span>Add, edit, or archive event places, sponsors, and festival sessions.</span>
        </div>
        <div className="admin-actions">
          <button onClick={onBack} type="button">Dashboard</button>
        </div>
      </header>

      <div className="admin-language-tabs">
        {["venues", "sponsors", "activities"].map((type) => (
          <button
            className={activeType === type ? "active" : ""}
            key={type}
            onClick={() => onEditType(type)}
            type="button"
          >
            {titleMap[type]}
          </button>
        ))}
      </div>

      {loading && <div className="admin-loading"><span className="loader" /> Loading content...</div>}
      {error && <p className="admin-error">{error}</p>}
      {message && (
        <div className="admin-success content-save-message">
          <strong>Saved successfully</strong>
          <span>{message}</span>
        </div>
      )}

      <section className="admin-content-layout">
        <div className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>{editingItem ? `Edit ${titleMap[activeType].slice(0, -1)}` : `Add ${titleMap[activeType].slice(0, -1)}`}</h3>
              <p>Save keeps the record active. Archive hides it without deleting history.</p>
            </div>
            {editingItem && <button className="admin-small-button" onClick={resetForm} type="button">New</button>}
          </div>

          <form className="admin-editor-form" onSubmit={submitForm}>
            {activeType !== "sponsors" && (
              <Field label="Slug / ID">
                <input
                  disabled={Boolean(editingItem)}
                  onChange={(event) => updateField("id", event.target.value)}
                  placeholder="start-finish"
                  value={form.id}
                />
              </Field>
            )}

            <div className="admin-form-grid two">
              <Field label="Name">
                <input
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Main Stage"
                  value={form.name}
                />
              </Field>
              <Field label={activeType === "sponsors" ? "Tier" : "Type"}>
                {activeType === "sponsors" ? (
                  <select
                    onChange={(event) => updateField("tier", event.target.value)}
                    value={form.tier ?? ""}
                  >
                    <option value="">No tier</option>
                    {sponsorTierOptions.map((tier) => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                ) : activeType === "venues" ? (
                  <select
                    onChange={(event) => {
                      updateField("type", event.target.value);
                      updateField("pinType", event.target.value);
                    }}
                    value={form.type}
                  >
                    {venueTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    onChange={(event) => updateField("type", event.target.value)}
                    value={form.type}
                  >
                    {activityTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            {activeType === "venues" && (
              <>
                <div className="admin-form-grid two">
                  <Field label="Map label">
                    <input
                      onChange={(event) => updateField("mapLabel", event.target.value)}
                      placeholder="START, AID, MED"
                      value={form.mapLabel ?? ""}
                    />
                  </Field>
                  <Field label="Pin type">
                    <select
                      onChange={(event) => updateField("pinType", event.target.value)}
                      value={form.pinType ?? form.type}
                    >
                      {venueTypeOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Address">
                  <input
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder="Venue address"
                    value={form.address}
                  />
                </Field>
                <div className="admin-form-grid two">
                  <Field label="Latitude">
                    <input
                      onChange={(event) => updateField("latitude", event.target.value)}
                      placeholder="-6.91746"
                      value={form.latitude ?? ""}
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      onChange={(event) => updateField("longitude", event.target.value)}
                      placeholder="107.61912"
                      value={form.longitude ?? ""}
                    />
                  </Field>
                </div>
                <p className="admin-field-help">
                  Add both coordinates to place this venue on the real coordinate map. Leave them blank to use the stylized fallback layout.
                </p>
              </>
            )}

            {activeType === "sponsors" && (
              <>
                <Field label="Booth / venue assignment">
                  <select
                    onChange={(event) => updateField("venueId", event.target.value)}
                    value={form.venueId ?? ""}
                  >
                    <option value="">No booth assigned</option>
                    {(content?.venues ?? []).map((venue) => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="admin-form-grid two">
                  <Field label="Logo URL">
                    <input onChange={(event) => updateField("logoUrl", event.target.value)} value={form.logoUrl ?? ""} />
                  </Field>
                  <Field label="Website URL">
                    <input onChange={(event) => updateField("websiteUrl", event.target.value)} value={form.websiteUrl ?? ""} />
                  </Field>
                </div>
                {form.logoUrl && (
                  <div className="admin-logo-preview">
                    <img alt="" src={form.logoUrl} />
                    <span>Logo preview</span>
                  </div>
                )}
              </>
            )}

            {activeType === "activities" && (
              <>
                <Field label="Venue assignment">
                  <select
                    onChange={(event) => updateField("venueId", event.target.value)}
                    value={form.venueId ?? ""}
                  >
                    <option value="">No venue assigned</option>
                    {(content?.venues ?? []).map((venue) => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="admin-form-grid two">
                  <Field label="Starts at">
                    <input onChange={(event) => updateField("startsAt", event.target.value)} type="datetime-local" value={form.startsAt ?? ""} />
                  </Field>
                  <Field label="Ends at">
                    <input onChange={(event) => updateField("endsAt", event.target.value)} type="datetime-local" value={form.endsAt ?? ""} />
                  </Field>
                </div>
              </>
            )}

            <Field label="Description">
              <textarea
                onChange={(event) => updateField("description", event.target.value)}
                rows="4"
                value={form.description ?? ""}
              />
            </Field>

            <Field label="Sort order">
              <input
                onChange={(event) => updateField("sortOrder", event.target.value)}
                type="number"
                value={form.sortOrder}
              />
            </Field>

            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Saving..." : editingItem ? "Save changes" : "Save draft item"}
            </button>
          </form>
        </div>

        <div className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>Active {titleMap[activeType]}</h3>
              <p>{items.length === 0 ? "No records yet." : `${items.length} record(s) visible to the app.`}</p>
            </div>
          </div>
          <div className="admin-item-list">
            {items.map((item) => (
              <article className="admin-item-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {activeType === "activities" && item.venueId
                      ? `Venue: ${item.venueId}`
                      : activeType === "sponsors" && item.venueId
                        ? `${item.tier || "Partner"} - ${item.venueId}`
                        : activeType === "venues"
                          ? `${venueTypeLabel(item.pinType || item.type)}${item.mapLabel ? ` - ${item.mapLabel}` : ""}`
                          : item.type || item.tier || item.id}
                  </span>
                </div>
                <div>
                  <button onClick={() => editItem(item)} type="button">Edit</button>
                  <button className="danger" onClick={() => onArchive(activeType, item.id)} type="button">Archive</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <ContentPreviewCard activeType={activeType} content={content} form={form} />
      </section>
    </section>
  );
}

function AdminRegistrationStatus({ label, value }) {
  return (
    <div className="admin-status-chip">
      <span>{label}</span>
      <strong>{value ?? "None"}</strong>
    </div>
  );
}

function AdminRegistrationsPanel({
  detail,
  error,
  filters,
  list,
  loading,
  messageError,
  messageLog,
  messageLoading,
  messageSuccess,
  onBack,
  onBroadcast,
  onCopy,
  onFilterChange,
  onRefresh,
  onResendTicket,
  onSendPaymentReminder,
  onSelect,
  selectedId
}) {
  const items = list?.items ?? [];
  const [broadcast, setBroadcast] = useState({
    title: "",
    body: "",
    target: "ALL",
    email: true,
    whatsapp: true
  });

  function submitFilters(event) {
    event.preventDefault();
    onRefresh();
  }

  function submitBroadcast(event) {
    event.preventDefault();
    onBroadcast({
      title: broadcast.title,
      body: broadcast.body,
      target: broadcast.target,
      channels: [
        ...(broadcast.email ? ["EMAIL"] : []),
        ...(broadcast.whatsapp ? ["WHATSAPP"] : [])
      ]
    }).then(() => {
      setBroadcast((current) => ({ ...current, title: "", body: "" }));
    });
  }

  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <div>
          <p className="eyebrow">Participants</p>
          <h2>Registration Operations</h2>
          <span>Search riders, review payment status, and inspect issued tickets.</span>
        </div>
        <div className="admin-actions">
          <button onClick={onRefresh} type="button">Refresh</button>
          <button onClick={onBack} type="button">Dashboard</button>
        </div>
      </header>

      <form className="admin-filter-bar" onSubmit={submitFilters}>
        <input
          onChange={(event) => onFilterChange("search", event.target.value)}
          placeholder="Search name, email, registration ID, participant number"
          value={filters.search}
        />
        <select onChange={(event) => onFilterChange("status", event.target.value)} value={filters.status}>
          <option value="ALL">All registrations</option>
          <option value="PENDING_PAYMENT">Pending payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CHECKED_IN">Checked in</option>
          <option value="PAYMENT_EXPIRED">Payment expired</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select onChange={(event) => onFilterChange("paymentStatus", event.target.value)} value={filters.paymentStatus}>
          <option value="ALL">All payments</option>
          <option value="NONE">No payment</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select onChange={(event) => onFilterChange("ticketStatus", event.target.value)} value={filters.ticketStatus}>
          <option value="ALL">All tickets</option>
          <option value="NONE">No ticket</option>
          <option value="ACTIVE">Active ticket</option>
          <option value="REVOKED">Revoked ticket</option>
        </select>
        <button type="submit">Apply</button>
      </form>

      {loading && <div className="admin-loading"><span className="loader" /> Loading participants...</div>}
      {error && <p className="admin-error">{error}</p>}
      {messageError && <p className="admin-error">{messageError}</p>}
      {messageSuccess && <p className="admin-success">{messageSuccess}</p>}

      <section className="admin-registrations-layout">
        <div className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>Participant list</h3>
              <p>{formatNumber(list?.total ?? 0)} registration(s) found.</p>
            </div>
          </div>

          <div className="admin-registration-list">
            {items.map((registration) => (
              <button
                className={selectedId === registration.id ? "active" : ""}
                key={registration.id}
                onClick={() => onSelect(registration.id)}
                type="button"
              >
                <div>
                  <strong>{registration.participant.fullName}</strong>
                  <span>{registration.participant.email}</span>
                </div>
                <div>
                  <b>{registration.status}</b>
                  <small>{registration.payment?.status ?? "No payment"} / {registration.ticket?.status ?? "No ticket"}</small>
                </div>
              </button>
            ))}
            {!loading && items.length === 0 && (
              <p className="admin-empty-note">No participants match these filters yet.</p>
            )}
          </div>
        </div>

        <div className="admin-editor-card">
          {detail ? (
            <div className="admin-registration-detail">
              <div className="admin-detail-title">
                <div>
                  <p className="eyebrow">{detail.id}</p>
                  <h3>{detail.participant.fullName}</h3>
                  <span>{detail.category.name} - {detail.category.distanceKm} KM</span>
                </div>
                <button onClick={() => onCopy(detail.id)} type="button">Copy ID</button>
              </div>

              <div className="admin-status-chip-grid">
                <AdminRegistrationStatus label="Registration" value={detail.status} />
                <AdminRegistrationStatus label="Payment" value={detail.payment?.status} />
                <AdminRegistrationStatus label="Ticket" value={detail.ticket?.status} />
                <AdminRegistrationStatus label="Check-ins" value={String(detail.checkins?.length ?? 0)} />
              </div>

              <div className="admin-detail-grid">
                <div><span>Email</span><strong>{detail.participant.email}</strong></div>
                <div><span>Phone</span><strong>{detail.participant.phone}</strong></div>
                <div><span>Birth date</span><strong>{detail.participant.birthDate}</strong></div>
                <div><span>Jersey</span><strong>{detail.jerseySize}</strong></div>
                <div><span>Total</span><strong>{formatRupiah(detail.totalAmount)}</strong></div>
                <div><span>Registered</span><strong>{String(detail.createdAt).slice(0, 10)}</strong></div>
                <div><span>Emergency contact</span><strong>{detail.emergencyContact.fullName}</strong></div>
                <div><span>Emergency phone</span><strong>{detail.emergencyContact.phone}</strong></div>
              </div>

              <section className="admin-detail-block">
                <h4>Payment status</h4>
                {detail.payment ? (
                  <div className="admin-detail-grid">
                    <div><span>Payment ID</span><strong>{detail.payment.id}</strong></div>
                    <div><span>Order ID</span><strong>{detail.payment.providerOrderId}</strong></div>
                    <div><span>Provider</span><strong>{detail.payment.provider}</strong></div>
                    <div><span>Method</span><strong>{detail.payment.method ?? "Not set"}</strong></div>
                    <div><span>Paid at</span><strong>{detail.payment.paidAt ? String(detail.payment.paidAt).slice(0, 19) : "Not paid"}</strong></div>
                    <div><span>Expires</span><strong>{String(detail.payment.expiresAt).slice(0, 19)}</strong></div>
                  </div>
                ) : (
                  <p>No payment has been created for this registration.</p>
                )}
              </section>

              <section className="admin-detail-block">
                <h4>Ticket status</h4>
                {detail.ticket ? (
                  <div className="admin-detail-grid">
                    <div><span>Ticket ID</span><strong>{detail.ticket.id}</strong></div>
                    <div><span>Participant number</span><strong>{detail.ticket.participantNumber}</strong></div>
                    <div><span>Issued at</span><strong>{String(detail.ticket.issuedAt).slice(0, 19)}</strong></div>
                    <div><span>Revoked</span><strong>{detail.ticket.revokedAt ? String(detail.ticket.revokedAt).slice(0, 19) : "No"}</strong></div>
                  </div>
                ) : (
                  <p>No ticket yet. A ticket is issued after successful payment.</p>
                )}
              </section>

              <section className="admin-detail-block">
                <h4>Manual tools</h4>
                <div className="admin-manual-tools">
                  <button onClick={() => onCopy(detail.participant.email)} type="button">Copy email</button>
                  <button onClick={() => onCopy(detail.participant.phone)} type="button">Copy phone</button>
                  <button disabled={messageLoading} onClick={() => onSendPaymentReminder(detail.id)} type="button">
                    Send payment reminder
                  </button>
                  {detail.payment?.checkoutUrl && (
                    <button onClick={() => onCopy(detail.payment.checkoutUrl)} type="button">Copy checkout link</button>
                  )}
                  {detail.ticket?.participantNumber && (
                    <>
                      <button onClick={() => onCopy(detail.ticket.participantNumber)} type="button">Copy ticket number</button>
                      <button disabled={messageLoading} onClick={() => onResendTicket(detail.id)} type="button">
                        Resend ticket
                      </button>
                    </>
                  )}
                </div>
                <p>Messages are logged through the mock provider now. Later we connect email and WhatsApp providers here.</p>
              </section>

              <section className="admin-detail-block">
                <h4>Recent messages</h4>
                <div className="admin-message-log">
                  {messageLog.map((message) => (
                    <article key={message.id}>
                      <div>
                        <strong>{message.type}</strong>
                        <span>{message.channel} to {message.recipient}</span>
                      </div>
                      <small>{message.status} {message.sentAt ? `- ${String(message.sentAt).slice(0, 19)}` : ""}</small>
                    </article>
                  ))}
                  {!messageLog.length && (
                    <p className="admin-empty-note">No messages sent for this participant yet.</p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <p className="admin-empty-note">Select a participant to see registration, payment, and ticket details.</p>
          )}
        </div>
      </section>

      <section className="admin-editor-card">
        <div className="admin-form-section-heading">
          <div>
            <h3>Event update broadcast</h3>
            <p>Send an operational update to registered participants through the mock email/WhatsApp provider.</p>
          </div>
        </div>
        <form className="admin-broadcast-form" onSubmit={submitBroadcast}>
          <div className="admin-form-grid two">
            <Field label="Audience">
              <select
                onChange={(event) => setBroadcast((current) => ({ ...current, target: event.target.value }))}
                value={broadcast.target}
              >
                <option value="ALL">All active registrations</option>
                <option value="CONFIRMED">Confirmed participants</option>
                <option value="PENDING_PAYMENT">Pending payment</option>
              </select>
            </Field>
            <Field label="Channels">
              <div className="admin-channel-options">
                <label>
                  <input
                    checked={broadcast.email}
                    onChange={(event) => setBroadcast((current) => ({ ...current, email: event.target.checked }))}
                    type="checkbox"
                  />
                  Email
                </label>
                <label>
                  <input
                    checked={broadcast.whatsapp}
                    onChange={(event) => setBroadcast((current) => ({ ...current, whatsapp: event.target.checked }))}
                    type="checkbox"
                  />
                  WhatsApp
                </label>
              </div>
            </Field>
          </div>
          <Field label="Update title">
            <input
              onChange={(event) => setBroadcast((current) => ({ ...current, title: event.target.value }))}
              placeholder="Parking gate changes"
              value={broadcast.title}
            />
          </Field>
          <Field label="Message">
            <textarea
              onChange={(event) => setBroadcast((current) => ({ ...current, body: event.target.value }))}
              placeholder="Tell riders what changed and what they should do."
              rows="4"
              value={broadcast.body}
            />
          </Field>
          <button className="primary-action" disabled={messageLoading} type="submit">
            {messageLoading ? "Sending..." : "Send broadcast"}
          </button>
        </form>
      </section>
    </section>
  );
}

const checkinTypeOptions = [
  { id: "RACE_PACK_COLLECTED", label: "Race pack collected" },
  { id: "EVENT_ENTRY", label: "Event entry" },
  { id: "START_CONFIRMED", label: "Start confirmed" },
  { id: "FINISH_CONFIRMED", label: "Finish confirmed" }
];

function normalizeQrInput(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("cyclofest:ticket:")
    ? trimmed.replace("cyclofest:ticket:", "")
    : trimmed;
}

function AdminCheckinOpsPanel({
  checkinResult,
  error,
  history,
  input,
  loading,
  message,
  onBack,
  onInputChange,
  onLoadHistory,
  onRecord,
  onValidate,
  staffKeyConfigured
}) {
  return (
    <section className="admin-editor">
      <header className="admin-editor-header">
        <div>
          <p className="eyebrow">Event day ops</p>
          <h2>Check-in Scanner</h2>
          <span>Validate ticket QR tokens, mark check-in steps, and prevent duplicate scans.</span>
        </div>
        <div className="admin-actions">
          <button onClick={onBack} type="button">Dashboard</button>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      <section className="admin-checkin-layout">
        <div className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>Staff access</h3>
              <p>Use your local `STAFF_API_KEY` from `.env` for testing.</p>
            </div>
          </div>

          <div className="admin-editor-form">
            <Field label="Staff API key">
              <input
                onChange={(event) => onInputChange("staffKey", event.target.value)}
                placeholder="dev_staff_key_replace_before_production"
                type="password"
                value={input.staffKey}
              />
            </Field>
            <Field label="Staff name">
              <input
                onChange={(event) => onInputChange("staffName", event.target.value)}
                placeholder="Gate Staff 1"
                value={input.staffName}
              />
            </Field>
            <Field label="QR token or payload">
              <textarea
                onChange={(event) => onInputChange("scanValue", event.target.value)}
                placeholder="Paste CFT1... or cyclofest:ticket:CFT1..."
                rows="4"
                value={input.scanValue}
              />
            </Field>
            <Field label="Check-in type">
              <select
                onChange={(event) => onInputChange("checkinType", event.target.value)}
                value={input.checkinType}
              >
                {checkinTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input
                onChange={(event) => onInputChange("notes", event.target.value)}
                placeholder="Optional"
                value={input.notes}
              />
            </Field>
            <div className="admin-checkin-actions">
              <button disabled={loading || !staffKeyConfigured} onClick={onValidate} type="button">
                {loading ? "Checking..." : "Validate QR"}
              </button>
              <button disabled={loading || !staffKeyConfigured || !checkinResult?.valid} onClick={onRecord} type="button">
                Record check-in
              </button>
            </div>
          </div>
        </div>

        <div className="admin-editor-card">
          <div className="admin-form-section-heading">
            <div>
              <h3>Scan result</h3>
              <p>Validation happens before a check-in is recorded.</p>
            </div>
          </div>

          {checkinResult ? (
            <div className="admin-checkin-result">
              <div className={checkinResult.valid ? "scan-valid" : "scan-invalid"}>
                <strong>{checkinResult.valid ? "Valid ticket" : "Invalid ticket"}</strong>
                <span>{checkinResult.registrationStatus ?? checkinResult.status}</span>
              </div>
              <div className="admin-detail-grid">
                <div><span>Participant</span><strong>{checkinResult.participant?.fullName}</strong></div>
                <div><span>Number</span><strong>{checkinResult.participantNumber}</strong></div>
                <div><span>Registration</span><strong>{checkinResult.registrationId}</strong></div>
                <div><span>Category</span><strong>{checkinResult.category?.name}</strong></div>
              </div>
              <button onClick={() => onLoadHistory(checkinResult.registrationId)} type="button">
                Load check-in history
              </button>
            </div>
          ) : (
            <p className="admin-empty-note">Paste a QR token and validate it to see ticket details.</p>
          )}

          <section className="admin-detail-block">
            <h4>Check-in history</h4>
            <div className="admin-checkin-history">
              {(history ?? []).map((entry) => (
                <article key={entry.id}>
                  <strong>{entry.checkinType}</strong>
                  <span>{String(entry.checkedInAt).slice(0, 19)} by {entry.checkedInBy}</span>
                  {entry.notes && <small>{entry.notes}</small>}
                </article>
              ))}
              {(!history || history.length === 0) && (
                <p className="admin-empty-note">No check-ins loaded yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}

function AdminDashboard({
  activeContentType,
  content,
  contentError,
  contentLoading,
  contentMessage,
  contentSaving,
  checkinError,
  checkinHistory,
  checkinInput,
  checkinLoading,
  checkinMessage,
  checkinResult,
  editorError,
  editorLoading,
  editorMessage,
  editorSaving,
  error,
  eventDetails,
  loading,
  participantDetail,
  participantError,
  participantFilters,
  participantList,
  participantLoading,
  participantMessages,
  messageError,
  messageLoading,
  messageSuccess,
  messagingSettings,
  onBackToApp,
  onArchiveContent,
  onBroadcast,
  onCheckinInputChange,
  onCheckinHistoryLoad,
  onCheckinRecord,
  onCheckinValidate,
  onCopyAdminValue,
  onEditorBack,
  onEditorOpen,
  onEditContentType,
  onParticipantFilterChange,
  onParticipantRefresh,
  onParticipantSelect,
  onResendTicket,
  onSendPaymentReminder,
  onLogout,
  onPreviewPublicApp,
  onRefresh,
  onSaveContent,
  onSaveEventDetails,
  onSaveMessagingSettings,
  overview,
  settingsError,
  settingsLoading,
  settingsMessage,
  settingsSaving,
  session,
  view
}) {
  const event = overview?.event;
  const totals = overview?.totals;
  const membership = session?.memberships?.[0];

  return (
    <AdminShell>
      <section className="admin-dashboard">
        <header className="admin-dashboard-header">
          <div>
            <p className="eyebrow">Organizer console</p>
            <h1>{event?.name ?? "CycloFest Admin"}</h1>
            <span>
              Signed in as {session?.user?.fullName ?? session?.user?.email}
              {membership?.role?.key ? ` · ${membership.role.key}` : ""}
            </span>
          </div>
          <div className="admin-actions">
            <button onClick={onRefresh} type="button">Refresh</button>
            <button onClick={onBackToApp} type="button">Public app</button>
            <button className="danger" onClick={onLogout} type="button">Logout</button>
          </div>
        </header>

        {loading && <div className="admin-loading"><span className="loader" /> Loading dashboard...</div>}
        {error && <p className="admin-error">{error}</p>}

        {overview && (
          <>
            {view === "event-details" && (
              <AdminEventDetailsEditor
                error={editorError}
                eventDetails={eventDetails}
                loading={editorLoading}
                message={editorMessage}
                onBack={onEditorBack}
                onPreview={onPreviewPublicApp}
                onSave={onSaveEventDetails}
                saving={editorSaving}
              />
            )}

            {["venues", "sponsors", "activities"].includes(view) && (
              <AdminContentEditor
                activeType={activeContentType}
                content={content}
                error={contentError}
                loading={contentLoading}
                message={contentMessage}
                onArchive={onArchiveContent}
                onBack={onEditorBack}
                onEditType={onEditContentType}
                onSave={onSaveContent}
                saving={contentSaving}
              />
            )}

            {view === "registrations" && (
              <AdminRegistrationsPanel
                detail={participantDetail}
                error={participantError}
                filters={participantFilters}
                list={participantList}
                loading={participantLoading}
                messageError={messageError}
                messageLoading={messageLoading}
                messageLog={participantMessages}
                messageSuccess={messageSuccess}
                onBack={onEditorBack}
                onBroadcast={onBroadcast}
                onCopy={onCopyAdminValue}
                onFilterChange={onParticipantFilterChange}
                onRefresh={onParticipantRefresh}
                onResendTicket={onResendTicket}
                onSendPaymentReminder={onSendPaymentReminder}
                onSelect={onParticipantSelect}
                selectedId={participantDetail?.id}
              />
            )}

            {view === "messaging-settings" && (
              <AdminMessagingSettingsEditor
                error={settingsError}
                loading={settingsLoading}
                message={settingsMessage}
                onBack={onEditorBack}
                onSave={onSaveMessagingSettings}
                saving={settingsSaving}
                settings={messagingSettings}
              />
            )}

            {view === "checkins" && (
              <AdminCheckinOpsPanel
                checkinResult={checkinResult}
                error={checkinError}
                history={checkinHistory}
                input={checkinInput}
                loading={checkinLoading}
                message={checkinMessage}
                onBack={onEditorBack}
                onInputChange={onCheckinInputChange}
                onLoadHistory={onCheckinHistoryLoad}
                onRecord={onCheckinRecord}
                onValidate={onCheckinValidate}
                staffKeyConfigured={Boolean(checkinInput.staffKey.trim())}
              />
            )}

            {view === "dashboard" && (
              <>
            <section className="admin-status-layout">
              <article className="admin-event-status-card">
                <div>
                  <p className="eyebrow">Event status</p>
                  <h2>{event.status}</h2>
                  <span>
                    This is the current public lifecycle state used by the API.
                    Draft and publish controls come next.
                  </span>
                </div>
                <i />
              </article>

              <article className="admin-detail-card">
                <span>Event date</span>
                <strong>{event.date ? String(event.date).slice(0, 10) : "Not set"}</strong>
                <small>Shown on the public event app.</small>
              </article>

              <article className="admin-detail-card">
                <span>Registration target</span>
                <strong>
                  {event.registrationTarget === null
                    ? "Not set"
                    : formatNumber(event.registrationTarget)}
                </strong>
                <small>Client can set this later.</small>
              </article>
            </section>

            <section className="admin-stats-grid">
              <AdminStatCard
                helper="All registration records"
                label="Registrations"
                value={formatNumber(totals.registrations)}
              />
              <AdminStatCard
                helper="Paid and confirmed riders"
                label="Confirmed"
                value={formatNumber(totals.confirmed)}
              />
              <AdminStatCard
                helper="Mapped event places"
                label="Venues"
                value={formatNumber(totals.venues)}
              />
              <AdminStatCard
                helper="Festival or ride sessions"
                label="Activities"
                value={formatNumber(totals.activities)}
              />
              <AdminStatCard
                helper="Published sponsor records"
                label="Sponsors"
                value={formatNumber(totals.sponsors)}
              />
            </section>

            <section className="admin-quick-links-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Quick links</p>
                  <h2>Edit content</h2>
                </div>
              </div>
              <div className="admin-quick-links-grid">
                <AdminQuickLinkCard
                  description="Name, tagline, date, target, languages, and publish state."
                  onOpen={() => onEditorOpen("event-details")}
                  status="Next"
                  title="Event details"
                />
                <AdminQuickLinkCard
                  description="Start/finish, booths, rest areas, medical points, and map pins."
                  onOpen={() => onEditorOpen("venues")}
                  status="Soon"
                  title="Venues"
                />
                <AdminQuickLinkCard
                  description="Festival sessions, ride schedule, stage programs, and times."
                  onOpen={() => onEditorOpen("activities")}
                  status="Soon"
                  title="Activities"
                />
                <AdminQuickLinkCard
                  description="Sponsor names, tiers, logos, links, and descriptions."
                  onOpen={() => onEditorOpen("sponsors")}
                  status="Soon"
                  title="Sponsors"
                />
                <AdminQuickLinkCard
                  description="Participant list, capacity, payments, and ticket states."
                  onOpen={() => onEditorOpen("registrations")}
                  status="Now"
                  title="Registrations"
                />
                <AdminQuickLinkCard
                  description="Provider keys, sender identity, WhatsApp number, and templates."
                  onOpen={() => onEditorOpen("messaging-settings")}
                  status="Ready"
                  title="Messaging Settings"
                />
                <AdminQuickLinkCard
                  description="Race-pack pickup, entry scan, start, and finish operations."
                  onOpen={() => onEditorOpen("checkins")}
                  status="Now"
                  title="Check-in ops"
                />
              </div>
            </section>

            <section className="admin-next-panel">
              <div>
                <p className="eyebrow">Next build step</p>
                <h2>Content editor</h2>
                <p>
                  The dashboard can read protected data now. Next we will add forms
                  for event details, venues, activities, sponsors, and draft/publish.
                </p>
              </div>
              <button disabled type="button">Editor coming next</button>
            </section>
              </>
            )}
          </>
        )}
      </section>
    </AdminShell>
  );
}

export default function App() {
  const [appMode, setAppMode] = useState(
    () => (window.location.hash === "#admin" ? "admin" : "public")
  );
  const [language, setLanguage] = useState(
    () => window.localStorage.getItem("cyclofest-language") ?? "id"
  );
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("home");
  const [registrationCategory, setRegistrationCategory] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [riderSession, setRiderSession] = useState(loadStoredRiderSession);
  const [riderLoading, setRiderLoading] = useState(false);
  const [riderError, setRiderError] = useState("");
  const [toast, setToast] = useState("");
  const [adminToken, setAdminToken] = useState(
    () => window.localStorage.getItem(adminTokenKey) ?? ""
  );
  const [adminSession, setAdminSession] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminView, setAdminView] = useState("dashboard");
  const [eventDetails, setEventDetails] = useState(null);
  const [messagingSettings, setMessagingSettings] = useState(null);
  const [adminContent, setAdminContent] = useState({
    venues: [],
    sponsors: [],
    activities: []
  });
  const [participantList, setParticipantList] = useState({ items: [], total: 0 });
  const [participantDetail, setParticipantDetail] = useState(null);
  const [participantMessages, setParticipantMessages] = useState([]);
  const [participantFilters, setParticipantFilters] = useState({
    search: "",
    status: "ALL",
    paymentStatus: "ALL",
    ticketStatus: "ALL"
  });
  const [checkinInput, setCheckinInput] = useState({
    staffKey: window.localStorage.getItem(staffKeyStorageKey) ?? "",
    staffName: "",
    scanValue: "",
    checkinType: "EVENT_ENTRY",
    notes: ""
  });
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [activeContentType, setActiveContentType] = useState("venues");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentMessage, setContentMessage] = useState("");
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantError, setParticipantError] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [checkinMessage, setCheckinMessage] = useState("");
  const copy = interfaceCopy[language] ?? interfaceCopy.id;

  useEffect(() => {
    function handleHashChange() {
      setAppMode(window.location.hash === "#admin" ? "admin" : "public");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setEvent(null);
    setError("");
    window.localStorage.setItem("cyclofest-language", language);

    fetch(`${apiUrl}/events/current?lang=${language}`)
      .then((response) => {
        if (!response.ok) throw new Error(copy.loadError);
        return response.json();
      })
      .then(setEvent)
      .catch((requestError) => setError(requestError.message));
  }, [copy.loadError, language]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (riderSession) {
      window.localStorage.setItem(riderSessionKey, JSON.stringify(riderSession));
    } else {
      window.localStorage.removeItem(riderSessionKey);
    }
  }, [riderSession]);

  useEffect(() => {
    if (checkinInput.staffKey) {
      window.localStorage.setItem(staffKeyStorageKey, checkinInput.staffKey);
    } else {
      window.localStorage.removeItem(staffKeyStorageKey);
    }
  }, [checkinInput.staffKey]);

  useEffect(() => {
    if (appMode !== "admin" || !adminToken) return undefined;
    loadAdminData(adminToken);
    return undefined;
  }, [adminToken, appMode]);

  const page = useMemo(() => {
    if (!event) return null;
    const shared = { event, onRegister: (categoryId) => setRegistrationCategory(categoryId || "choose") };
    if (activePage === "rides") return <RidesPage {...shared} />;
    if (activePage === "schedule") return <SchedulePage event={event} />;
    if (activePage === "route") return <RoutePage event={event} />;
    if (activePage === "profile") {
      return (
        <RiderProfilePage
          error={riderError}
          loading={riderLoading}
          onRefresh={refreshRiderSession}
          onRegister={shared.onRegister}
          onRotateQr={rotateTicketQr}
          session={riderSession}
        />
      );
    }
    return <HomePage {...shared} onNavigate={setActivePage} />;
  }, [activePage, event, riderError, riderLoading, riderSession]);

  function navigate(pageId) {
    setActivePage(pageId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function completeRegistration(registration) {
    setRiderLoading(true);
    setRiderError("");

    try {
      const createdRegistration = await apiRequest("/registrations", {
        body: {
          categoryId: registration.categoryId,
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          birthDate: registration.birthDate,
          emergencyName: registration.emergencyName,
          emergencyPhone: registration.emergencyPhone,
          jerseySize: registration.jerseySize,
          waiverAccepted: registration.waiverAccepted
        }
      });

      const payment = await apiRequest(
        `/registrations/${createdRegistration.id}/payments`,
        {
          registrationToken: createdRegistration.accessToken,
          body: { paymentMethod: "mock" }
        }
      );

      setTicket(null);
      setRiderSession({
        registration: createdRegistration,
        accessToken: createdRegistration.accessToken,
        payment,
        ticket: null,
        qrToken: null,
        qrPayload: null
      });
      setRegistrationCategory(null);
      setActivePage("profile");
      setToast("Registration created. Mock payment is ready.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setRiderError(requestError.message);
      throw requestError;
    } finally {
      setRiderLoading(false);
    }
  }

  async function refreshRiderSession() {
    if (!riderSession?.registration?.id || !riderSession?.accessToken) return;
    setRiderLoading(true);
    setRiderError("");

    try {
      const registration = await apiRequest(
        `/registrations/${riderSession.registration.id}`,
        { registrationToken: riderSession.accessToken }
      );
      const payment = riderSession.payment?.id
        ? await apiRequest(`/payments/${riderSession.payment.id}`, {
            registrationToken: riderSession.accessToken
          })
        : null;
      let ticketData = riderSession.ticket;
      let qrToken = riderSession.qrToken;
      let qrPayload = riderSession.qrPayload;

      try {
        ticketData = await apiRequest(
          `/registrations/${riderSession.registration.id}/ticket`,
          { registrationToken: riderSession.accessToken }
        );
        if (ticketData && !qrToken) {
          const rotated = await apiRequest(
            `/registrations/${riderSession.registration.id}/ticket/qr-token`,
            {
              method: "POST",
              registrationToken: riderSession.accessToken
            }
          );
          qrToken = rotated.qrToken;
          qrPayload = rotated.qrPayload;
        }
      } catch (ticketError) {
        if (![403, 404].includes(ticketError.status)) throw ticketError;
        ticketData = null;
      }

      setRiderSession((current) => ({
        ...current,
        registration,
        payment,
        ticket: ticketData,
        qrToken,
        qrPayload
      }));
      setToast(ticketData ? "Ticket refreshed." : "Registration refreshed.");
    } catch (requestError) {
      setRiderError(requestError.message);
    } finally {
      setRiderLoading(false);
    }
  }

  async function rotateTicketQr() {
    if (!riderSession?.registration?.id || !riderSession?.accessToken) return;
    setRiderLoading(true);
    setRiderError("");

    try {
      const rotated = await apiRequest(
        `/registrations/${riderSession.registration.id}/ticket/qr-token`,
        {
          method: "POST",
          registrationToken: riderSession.accessToken
        }
      );
      setRiderSession((current) => ({
        ...current,
        qrToken: rotated.qrToken,
        qrPayload: rotated.qrPayload
      }));
      setToast("QR token rotated.");
    } catch (requestError) {
      setRiderError(requestError.message);
    } finally {
      setRiderLoading(false);
    }
  }

  function openAdmin() {
    window.location.hash = "admin";
    setAppMode("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToPublicApp() {
    window.location.hash = "";
    setAppMode("public");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadAdminData(token = adminToken) {
    if (!token) return;
    setAdminLoading(true);
    setAdminError("");

    try {
      const [session, overview] = await Promise.all([
        apiRequest("/organizer/auth/me", { token }),
        apiRequest("/admin/overview", { token })
      ]);
      setAdminSession(session);
      setAdminOverview(overview);
    } catch (requestError) {
      setAdminError(requestError.message);
      if (requestError.status === 401) {
        window.localStorage.removeItem(adminTokenKey);
        setAdminToken("");
        setAdminSession(null);
        setAdminOverview(null);
      }
    } finally {
      setAdminLoading(false);
    }
  }

  async function loadEventDetails(token = adminToken) {
    if (!token) return;
    setEditorLoading(true);
    setEditorError("");
    setEditorMessage("");

    try {
      setEventDetails(await apiRequest("/admin/event-details", { token }));
    } catch (requestError) {
      setEditorError(requestError.message);
    } finally {
      setEditorLoading(false);
    }
  }

  async function loadMessagingSettings(token = adminToken) {
    if (!token) return;
    setSettingsLoading(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      setMessagingSettings(await apiRequest("/admin/messages/settings", { token }));
    } catch (requestError) {
      setSettingsError(requestError.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadAdminContent(token = adminToken) {
    if (!token) return;
    setContentLoading(true);
    setContentError("");
    setContentMessage("");

    try {
      setAdminContent(await apiRequest("/admin/content", { token }));
    } catch (requestError) {
      setContentError(requestError.message);
    } finally {
      setContentLoading(false);
    }
  }

  async function loadAdminParticipants(token = adminToken, filters = participantFilters) {
    if (!token) return;
    setParticipantLoading(true);
    setParticipantError("");

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    try {
      const list = await apiRequest(`/admin/registrations?${params.toString()}`, {
        token
      });
      setParticipantList(list);
      if (list.items?.length && !participantDetail) {
        await loadAdminParticipantDetail(list.items[0].id, token);
      }
      if (!list.items?.length) {
        setParticipantDetail(null);
        setParticipantMessages([]);
      }
    } catch (requestError) {
      setParticipantError(requestError.message);
    } finally {
      setParticipantLoading(false);
    }
  }

  async function loadAdminParticipantDetail(registrationId, token = adminToken) {
    if (!token || !registrationId) return;
    setParticipantLoading(true);
    setParticipantError("");

    try {
      const [detail, messages] = await Promise.all([
        apiRequest(`/admin/registrations/${registrationId}`, { token }),
        apiRequest(`/admin/registrations/${registrationId}/messages`, { token })
      ]);
      setParticipantDetail(detail);
      setParticipantMessages(messages);
    } catch (requestError) {
      setParticipantError(requestError.message);
    } finally {
      setParticipantLoading(false);
    }
  }

  function openAdminEditor(view) {
    setAdminView(view);
    if (view === "event-details") loadEventDetails();
    if (view === "messaging-settings") loadMessagingSettings();
    if (["venues", "sponsors", "activities"].includes(view)) {
      setActiveContentType(view);
      loadAdminContent();
    }
    if (view === "registrations") loadAdminParticipants();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeContentType(type) {
    setActiveContentType(type);
    setAdminView(type);
    if (!adminContent[type]?.length) loadAdminContent();
  }

  function closeAdminEditor() {
    setAdminView("dashboard");
    setEditorError("");
    setEditorMessage("");
    setSettingsError("");
    setSettingsMessage("");
    setContentError("");
    setContentMessage("");
    setParticipantError("");
    setMessageError("");
    setMessageSuccess("");
    setCheckinError("");
    setCheckinMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeParticipantFilter(field, value) {
    setParticipantFilters((current) => ({ ...current, [field]: value }));
  }

  async function refreshAdminParticipants() {
    await loadAdminParticipants(adminToken, participantFilters);
    await loadAdminData(adminToken);
  }

  async function selectAdminParticipant(registrationId) {
    await loadAdminParticipantDetail(registrationId);
  }

  async function runParticipantMessageAction(registrationId, actionPath, successMessage) {
    if (!registrationId) return;
    setMessageLoading(true);
    setMessageError("");
    setMessageSuccess("");

    try {
      const messages = await apiRequest(
        `/admin/registrations/${registrationId}/messages/${actionPath}`,
        {
          method: "POST",
          token: adminToken
        }
      );
      setMessageSuccess(`${successMessage} (${messages.length} mock message(s)).`);
      await loadAdminParticipantDetail(registrationId, adminToken);
    } catch (requestError) {
      setMessageError(requestError.message);
    } finally {
      setMessageLoading(false);
    }
  }

  async function resendParticipantTicket(registrationId) {
    return runParticipantMessageAction(registrationId, "resend-ticket", "Ticket resent");
  }

  async function sendParticipantPaymentReminder(registrationId) {
    return runParticipantMessageAction(registrationId, "payment-reminder", "Payment reminder sent");
  }

  async function sendAdminBroadcast(body) {
    setMessageLoading(true);
    setMessageError("");
    setMessageSuccess("");

    try {
      const result = await apiRequest("/admin/messages/broadcast", {
        method: "POST",
        token: adminToken,
        body
      });
      setMessageSuccess(
        `Broadcast sent to ${result.participants} participant(s), ${result.messagesSent} mock message(s).`
      );
      if (participantDetail?.id) {
        await loadAdminParticipantDetail(participantDetail.id, adminToken);
      }
      await loadAdminData(adminToken);
    } catch (requestError) {
      setMessageError(requestError.message);
      throw requestError;
    } finally {
      setMessageLoading(false);
    }
  }

  async function copyAdminValue(value) {
    if (!value) return;
    await navigator.clipboard.writeText(String(value)).catch(() => {});
    setToast("Copied.");
  }

  function changeCheckinInput(field, value) {
    setCheckinInput((current) => ({ ...current, [field]: value }));
    setCheckinError("");
    setCheckinMessage("");
  }

  async function validateCheckinQr() {
    setCheckinLoading(true);
    setCheckinError("");
    setCheckinMessage("");

    try {
      const qrToken = normalizeQrInput(checkinInput.scanValue);
      const ticket = await apiRequest("/tickets/validate", {
        staffKey: checkinInput.staffKey,
        body: { qrToken }
      });
      setCheckinResult(ticket);
      setCheckinMessage(ticket.valid ? "Ticket is valid." : "Ticket is not valid for entry.");
      if (ticket.registrationId) await loadCheckinHistory(ticket.registrationId);
    } catch (requestError) {
      setCheckinResult(null);
      setCheckinError(requestError.message);
    } finally {
      setCheckinLoading(false);
    }
  }

  async function recordCheckin() {
    setCheckinLoading(true);
    setCheckinError("");
    setCheckinMessage("");

    try {
      const checkin = await apiRequest("/checkins/scan", {
        staffKey: checkinInput.staffKey,
        body: {
          qrToken: normalizeQrInput(checkinInput.scanValue),
          checkinType: checkinInput.checkinType,
          staffName: checkinInput.staffName,
          notes: checkinInput.notes
        }
      });
      setCheckinMessage(`${checkin.checkinType} recorded for ${checkin.participantName}.`);
      await loadCheckinHistory(checkin.registrationId);
      await loadAdminData(adminToken);
    } catch (requestError) {
      setCheckinError(requestError.message);
    } finally {
      setCheckinLoading(false);
    }
  }

  async function loadCheckinHistory(registrationId) {
    if (!registrationId) return;
    try {
      const payload = await apiRequest(`/checkins/registrations/${registrationId}`, {
        staffKey: checkinInput.staffKey
      });
      setCheckinHistory(payload.checkins ?? []);
    } catch (requestError) {
      setCheckinError(requestError.message);
    }
  }

  async function saveEventDetails(input) {
    setEditorSaving(true);
    setEditorError("");
    setEditorMessage("");

    try {
      const saved = await apiRequest("/admin/event-details", {
        method: "PUT",
        token: adminToken,
        body: input
      });
      setEventDetails(saved);
      setEditorMessage("Draft saved. Preview the public app to review the change.");
      await loadAdminData(adminToken);
      setEvent((current) => current ? { ...current, ...saved } : current);
    } catch (requestError) {
      setEditorError(requestError.message);
    } finally {
      setEditorSaving(false);
    }
  }

  async function saveMessagingSettings(input) {
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const saved = await apiRequest("/admin/messages/settings", {
        method: "PUT",
        token: adminToken,
        body: input
      });
      setMessagingSettings(saved);
      setSettingsMessage("Messaging settings saved. Mock sending remains active until real providers are connected.");
    } catch (requestError) {
      setSettingsError(requestError.message);
    } finally {
      setSettingsSaving(false);
    }
  }

  function contentPath(type, id) {
    const paths = {
      venues: "venues",
      sponsors: "sponsors",
      activities: "activities"
    };
    return `/admin/${paths[type]}${id ? `/${id}` : ""}`;
  }

  function normalizeContentPayload(type, form) {
    const base = {
      name: form.name,
      description: form.description || null,
      sortOrder: Number(form.sortOrder || 0),
      translations: {}
    };

    if (type === "venues") {
      return {
        ...base,
        slug: form.id,
        type: form.type,
        mapLabel: form.mapLabel || null,
        pinType: form.pinType || form.type,
        address: form.address || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude)
      };
    }

    if (type === "sponsors") {
      return {
        ...base,
        tier: form.tier || null,
        venueId: form.venueId || null,
        logoUrl: form.logoUrl || null,
        websiteUrl: form.websiteUrl || null
      };
    }

    return {
      ...base,
      slug: form.id,
      venueId: form.venueId || null,
      type: form.type,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
    };
  }

  async function saveContent(type, form, existingId) {
    setContentSaving(true);
    setContentError("");
    setContentMessage("");

    try {
      await apiRequest(contentPath(type, existingId), {
        method: "PUT",
        token: adminToken,
        body: normalizeContentPayload(type, form)
      });
      setContentMessage("Saved. The public app will use this content after refresh.");
      await Promise.all([loadAdminContent(adminToken), loadAdminData(adminToken)]);
    } catch (requestError) {
      setContentError(requestError.message);
      throw requestError;
    } finally {
      setContentSaving(false);
    }
  }

  async function archiveContent(type, id) {
    setContentSaving(true);
    setContentError("");
    setContentMessage("");

    try {
      await apiRequest(contentPath(type, id), {
        method: "DELETE",
        token: adminToken
      });
      setContentMessage("Archived. The item is hidden from active content.");
      await Promise.all([loadAdminContent(adminToken), loadAdminData(adminToken)]);
    } catch (requestError) {
      setContentError(requestError.message);
    } finally {
      setContentSaving(false);
    }
  }

  function previewPublicApp() {
    setAdminView("dashboard");
    backToPublicApp();
  }

  function completeAdminLogin(session) {
    window.localStorage.setItem(adminTokenKey, session.token);
    setAdminToken(session.token);
    setAdminSession({
      user: session.user,
      memberships: session.memberships,
      expiresAt: session.expiresAt
    });
    setAdminError("");
    loadAdminData(session.token);
  }

  async function logoutAdmin() {
    const token = adminToken;
    window.localStorage.removeItem(adminTokenKey);
    setAdminToken("");
    setAdminSession(null);
    setAdminOverview(null);
    setAdminView("dashboard");
    setEventDetails(null);
    setAdminContent({ venues: [], sponsors: [], activities: [] });
    setParticipantList({ items: [], total: 0 });
    setParticipantDetail(null);
    setParticipantMessages([]);
    setCheckinResult(null);
    setCheckinHistory([]);
    if (token) {
      await apiRequest("/organizer/auth/logout", {
        method: "POST",
        token
      }).catch(() => {});
    }
  }

  if (appMode === "admin") {
    if (!adminToken) {
      return (
        <AdminLoginPage
          onBackToApp={backToPublicApp}
          onLogin={completeAdminLogin}
        />
      );
    }

    return (
      <AdminDashboard
        activeContentType={activeContentType}
        content={adminContent}
        contentError={contentError}
        contentLoading={contentLoading}
        contentMessage={contentMessage}
        contentSaving={contentSaving}
        checkinError={checkinError}
        checkinHistory={checkinHistory}
        checkinInput={checkinInput}
        checkinLoading={checkinLoading}
        checkinMessage={checkinMessage}
        checkinResult={checkinResult}
        error={adminError}
        loading={adminLoading}
        messageError={messageError}
        messageLoading={messageLoading}
        messageSuccess={messageSuccess}
        messagingSettings={messagingSettings}
        onBackToApp={backToPublicApp}
        onArchiveContent={archiveContent}
        onBroadcast={sendAdminBroadcast}
        onCheckinInputChange={changeCheckinInput}
        onCheckinHistoryLoad={loadCheckinHistory}
        onCheckinRecord={recordCheckin}
        onCheckinValidate={validateCheckinQr}
        onCopyAdminValue={copyAdminValue}
        onEditorBack={closeAdminEditor}
        onEditorOpen={openAdminEditor}
        onEditContentType={changeContentType}
        onParticipantFilterChange={changeParticipantFilter}
        onParticipantRefresh={refreshAdminParticipants}
        onParticipantSelect={selectAdminParticipant}
        onResendTicket={resendParticipantTicket}
        onSendPaymentReminder={sendParticipantPaymentReminder}
        onLogout={logoutAdmin}
        onPreviewPublicApp={previewPublicApp}
        onRefresh={() => loadAdminData()}
        onSaveContent={saveContent}
        onSaveEventDetails={saveEventDetails}
        onSaveMessagingSettings={saveMessagingSettings}
        participantDetail={participantDetail}
        participantError={participantError}
        participantFilters={participantFilters}
        participantList={participantList}
        participantLoading={participantLoading}
        participantMessages={participantMessages}
        settingsError={settingsError}
        settingsLoading={settingsLoading}
        settingsMessage={settingsMessage}
        settingsSaving={settingsSaving}
        editorError={editorError}
        editorLoading={editorLoading}
        editorMessage={editorMessage}
        editorSaving={editorSaving}
        eventDetails={eventDetails}
        overview={adminOverview}
        session={adminSession}
        view={adminView}
      />
    );
  }

  if (error) return <main className="status error">{error}</main>;
  if (!event) return <main className="status"><span className="loader" />{copy.loading}</main>;

  return (
    <div className="app-shell">
      <AppHeader
        copy={copy}
        language={language}
        onAdminOpen={openAdmin}
        onLanguageChange={setLanguage}
        onNotifications={() => setToast(copy.noAnnouncements)}
      />
      <main className="app-content">{page}</main>
      <BottomNav activePage={activePage} copy={copy} onNavigate={navigate} />
      {registrationCategory && (
        <RegistrationModal
          event={event}
          initialCategoryId={registrationCategory === "choose" ? "" : registrationCategory}
          onClose={() => setRegistrationCategory(null)}
          onComplete={completeRegistration}
        />
      )}
      {toast && <div className="toast"><Icon name="check" size={17} />{toast}</div>}
    </div>
  );
}
