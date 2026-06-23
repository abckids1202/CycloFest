exports.up = (pgm) => {
  const optionalEventColumns = [
    "tagline",
    "description",
    "event_date",
    "date_label",
    "location",
    "venue",
    "max_distance_km",
    "race_pack",
    "after_party"
  ];

  for (const column of optionalEventColumns) {
    pgm.alterColumn("events", column, { notNull: false });
  }

  pgm.addColumns("events", {
    default_language: {
      type: "varchar(5)",
      notNull: true,
      default: "id"
    },
    supported_languages: {
      type: "text[]",
      notNull: true,
      default: pgm.func("ARRAY['id', 'en']::text[]")
    },
    timezone: {
      type: "varchar(80)",
      notNull: true,
      default: "Asia/Jakarta"
    },
    registration_target: { type: "integer" },
    payment_provider: { type: "varchar(40)" },
    translations: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
    map_config: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    }
  });

  pgm.addConstraint("events", "events_default_language_check", {
    check: "default_language IN ('id', 'en')"
  });
  pgm.addConstraint("events", "events_registration_target_check", {
    check: "registration_target IS NULL OR registration_target >= 0"
  });
  pgm.addConstraint("events", "events_translations_object_check", {
    check: "jsonb_typeof(translations) = 'object'"
  });
  pgm.addConstraint("events", "events_map_config_object_check", {
    check: "jsonb_typeof(map_config) = 'object'"
  });

  for (const table of ["event_categories", "schedule_items", "checkpoints"]) {
    pgm.addColumn(table, {
      translations: {
        type: "jsonb",
        notNull: true,
        default: pgm.func("'{}'::jsonb")
      }
    });
    pgm.addConstraint(table, `${table}_translations_object_check`, {
      check: "jsonb_typeof(translations) = 'object'"
    });
  }

  pgm.createTable("venues", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    slug: { type: "varchar(120)", notNull: true },
    name: { type: "varchar(160)", notNull: true },
    description: { type: "text" },
    address: { type: "text" },
    latitude: { type: "numeric(10, 7)" },
    longitude: { type: "numeric(10, 7)" },
    venue_type: { type: "varchar(40)", notNull: true, default: "VENUE" },
    translations: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
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
  pgm.addConstraint("venues", "venues_event_slug_unique", {
    unique: ["event_id", "slug"]
  });
  pgm.addConstraint("venues", "venues_coordinates_check", {
    check:
      "(latitude IS NULL AND longitude IS NULL) OR " +
      "(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)"
  });
  pgm.addConstraint("venues", "venues_translations_object_check", {
    check: "jsonb_typeof(translations) = 'object'"
  });
  pgm.createIndex("venues", ["event_id", "sort_order"]);

  pgm.createTable("activities", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    venue_id: {
      type: "uuid",
      references: "venues",
      onDelete: "SET NULL"
    },
    slug: { type: "varchar(120)", notNull: true },
    name: { type: "varchar(160)", notNull: true },
    description: { type: "text" },
    activity_type: { type: "varchar(40)", notNull: true, default: "GENERAL" },
    starts_at: { type: "timestamptz" },
    ends_at: { type: "timestamptz" },
    translations: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
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
  pgm.addConstraint("activities", "activities_event_slug_unique", {
    unique: ["event_id", "slug"]
  });
  pgm.addConstraint("activities", "activities_time_order_check", {
    check: "ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at"
  });
  pgm.addConstraint("activities", "activities_translations_object_check", {
    check: "jsonb_typeof(translations) = 'object'"
  });
  pgm.createIndex("activities", ["event_id", "sort_order"]);
  pgm.createIndex("activities", ["event_id", "starts_at"]);

  pgm.createTable("sponsors", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    name: { type: "varchar(160)", notNull: true },
    tier: { type: "varchar(60)" },
    logo_url: { type: "text" },
    website_url: { type: "text" },
    description: { type: "text" },
    translations: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
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
  pgm.addConstraint("sponsors", "sponsors_translations_object_check", {
    check: "jsonb_typeof(translations) = 'object'"
  });
  pgm.createIndex("sponsors", ["event_id", "sort_order"]);

  pgm.createTable("organizer_roles", {
    id: { type: "bigserial", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    role_key: { type: "varchar(60)", notNull: true },
    name: { type: "varchar(120)", notNull: true },
    permissions: {
      type: "text[]",
      notNull: true,
      default: pgm.func("ARRAY[]::text[]")
    },
    is_system: { type: "boolean", notNull: true, default: false },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });
  pgm.addConstraint("organizer_roles", "organizer_roles_event_key_unique", {
    unique: ["event_id", "role_key"]
  });
};

exports.down = (pgm) => {
  pgm.dropTable("organizer_roles");
  pgm.dropTable("sponsors");
  pgm.dropTable("activities");
  pgm.dropTable("venues");

  for (const table of ["checkpoints", "schedule_items", "event_categories"]) {
    pgm.dropColumn(table, "translations");
  }

  pgm.dropColumns("events", [
    "default_language",
    "supported_languages",
    "timezone",
    "registration_target",
    "payment_provider",
    "translations",
    "map_config"
  ]);

  const requiredEventColumns = [
    "tagline",
    "description",
    "event_date",
    "date_label",
    "location",
    "venue",
    "max_distance_km",
    "race_pack",
    "after_party"
  ];

  for (const column of requiredEventColumns) {
    pgm.alterColumn("events", column, { notNull: true });
  }
};