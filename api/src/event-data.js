export const currentEvent = {
  id: "cyclofest-2026",
  name: "CycloFest 2026",
  tagline: "Grand Cycling Festival",
  description:
    "A weekend ride for every kind of cyclist, from first-time families to century riders.",
  date: "2026-09-20",
  dateLabel: "20 September 2026",
  location: "Jakarta, Indonesia",
  venue: "Gelora Bung Karno",
  registrationOpen: true,
  prizePool: 150000000,
  maxDistanceKm: 100,
  racePack: "Jersey + Medal",
  afterParty: "Live Music Festival",
  status: "DRAFT",
  defaultLanguage: "id",
  supportedLanguages: ["id", "en"],
  timezone: "Asia/Jakarta",
  registrationTarget: null,
  paymentProvider: null,
  map: {
    provider: null,
    center: null,
    zoom: null,
    routeUrl: null
  },
  translations: {
    id: {
      name: "CycloFest 2026",
      tagline: "Festival Bersepeda Akbar",
      description:
        "Akhir pekan bersepeda untuk semua orang, dari keluarga pemula hingga pesepeda jarak jauh.",
      dateLabel: "20 September 2026",
      location: "Jakarta, Indonesia",
      venue: "Gelora Bung Karno",
      racePack: "Jersey + Medali",
      afterParty: "Festival Musik"
    },
    en: {
      name: "CycloFest 2026",
      tagline: "Grand Cycling Festival",
      description:
        "A weekend ride for every kind of cyclist, from first-time families to century riders.",
      dateLabel: "20 September 2026",
      location: "Jakarta, Indonesia",
      venue: "Gelora Bung Karno",
      racePack: "Jersey + Medal",
      afterParty: "Live Music Festival"
    }
  },
  venues: [],
  activities: [],
  sponsors: [],
  categories: [
    {
      id: "family-ride",
      name: "Family Ride",
      distanceKm: 15,
      price: 150000,
      capacity: 1000,
      registered: 284,
      level: "Easy",
      duration: "1-2 hours",
      color: "lime",
      description: "A relaxed city loop for families and new cyclists."
    },
    {
      id: "city-challenge",
      name: "City Challenge",
      distanceKm: 50,
      price: 275000,
      capacity: 1500,
      registered: 631,
      level: "Intermediate",
      duration: "2-4 hours",
      color: "mint",
      featured: true,
      description: "Our signature ride through Jakarta's landmark streets."
    },
    {
      id: "endurance",
      name: "Endurance",
      distanceKm: 100,
      price: 425000,
      capacity: 500,
      registered: 198,
      level: "Advanced",
      duration: "4-7 hours",
      color: "orange",
      description: "A demanding century route for experienced riders."
    }
  ],
  schedule: [
    {
      time: "05:00",
      title: "Venue opens",
      description: "Check-in, bike inspection, and rider preparation.",
      type: "arrival"
    },
    {
      time: "05:45",
      title: "Opening ceremony",
      description: "Safety briefing and warm-up at the main stage.",
      type: "stage"
    },
    {
      time: "06:15",
      title: "Endurance start",
      description: "100 KM riders enter the start corral.",
      type: "ride"
    },
    {
      time: "06:40",
      title: "City Challenge start",
      description: "50 KM riders begin the landmark route.",
      type: "ride"
    },
    {
      time: "07:10",
      title: "Family Ride start",
      description: "15 KM riders depart with ride marshals.",
      type: "ride"
    },
    {
      time: "11:30",
      title: "Awards and festival",
      description: "Finisher celebration, prizes, food, and live music.",
      type: "stage"
    }
  ],
  checkpoints: [
    {
      kilometer: 0,
      name: "Start / Finish",
      detail: "Gelora Bung Karno"
    },
    {
      kilometer: 18,
      name: "Aid Station 1",
      detail: "Water, fruit, and basic mechanical support"
    },
    {
      kilometer: 37,
      name: "City Viewpoint",
      detail: "Timing checkpoint and photo spot"
    },
    {
      kilometer: 68,
      name: "Aid Station 2",
      detail: "Hydration, nutrition, and medical team"
    },
    {
      kilometer: 100,
      name: "Finisher Village",
      detail: "Medal, recovery zone, and festival"
    }
  ]
};