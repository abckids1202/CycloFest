exports.up = (pgm) => {
  pgm.createTable("events", {
    id: { type: "uuid", primaryKey: true },
    slug: { type: "varchar(120)", notNull: true, unique: true },
    name: { type: "varchar(160)", notNull: true },
    tagline: { type: "varchar(200)", notNull: true },
    description: { type: "text", notNull: true },
    event_date: { type: "date", notNull: true },
    date_label: { type: "varchar(80)", notNull: true },
    location: { type: "varchar(160)", notNull: true },
    venue: { type: "varchar(160)", notNull: true },
    registration_open: { type: "boolean", notNull: true, default: false },
    prize_pool: { type: "bigint", notNull: true, default: 0 },
    max_distance_km: { type: "integer", notNull: true },
    race_pack: { type: "varchar(160)", notNull: true },
    after_party: { type: "varchar(160)", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "DRAFT" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });

  pgm.addConstraint("events", "events_status_check", {
    check: "status IN ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED')"
  });

  pgm.createTable("event_categories", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    slug: { type: "varchar(120)", notNull: true },
    name: { type: "varchar(160)", notNull: true },
    description: { type: "text", notNull: true },
    distance_km: { type: "integer", notNull: true },
    price: { type: "bigint", notNull: true },
    capacity: { type: "integer", notNull: true },
    registered_count: { type: "integer", notNull: true, default: 0 },
    level: { type: "varchar(40)", notNull: true },
    duration_label: { type: "varchar(60)", notNull: true },
    color: { type: "varchar(30)", notNull: true },
    featured: { type: "boolean", notNull: true, default: false },
    sort_order: { type: "integer", notNull: true, default: 0 },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });

  pgm.addConstraint("event_categories", "event_categories_event_slug_unique", {
    unique: ["event_id", "slug"]
  });
  pgm.addConstraint("event_categories", "event_categories_capacity_check", {
    check: "capacity > 0 AND registered_count >= 0 AND registered_count <= capacity"
  });
  pgm.addConstraint("event_categories", "event_categories_price_check", {
    check: "price >= 0"
  });
  pgm.createIndex("event_categories", ["event_id", "sort_order"]);

  pgm.createTable("schedule_items", {
    id: { type: "bigserial", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    start_time: { type: "time", notNull: true },
    title: { type: "varchar(160)", notNull: true },
    description: { type: "text", notNull: true },
    item_type: { type: "varchar(40)", notNull: true },
    sort_order: { type: "integer", notNull: true, default: 0 }
  });
  pgm.createIndex("schedule_items", ["event_id", "sort_order"]);

  pgm.createTable("checkpoints", {
    id: { type: "bigserial", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    kilometer: { type: "integer", notNull: true },
    name: { type: "varchar(160)", notNull: true },
    detail: { type: "text", notNull: true },
    sort_order: { type: "integer", notNull: true, default: 0 }
  });
  pgm.createIndex("checkpoints", ["event_id", "sort_order"]);
};

exports.down = (pgm) => {
  pgm.dropTable("checkpoints");
  pgm.dropTable("schedule_items");
  pgm.dropTable("event_categories");
  pgm.dropTable("events");
};

