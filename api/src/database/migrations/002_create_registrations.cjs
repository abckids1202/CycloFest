exports.up = (pgm) => {
  pgm.createTable("participants", {
    id: { type: "uuid", primaryKey: true },
    full_name: { type: "varchar(160)", notNull: true },
    email: { type: "varchar(254)", notNull: true },
    phone: { type: "varchar(40)", notNull: true },
    birth_date: { type: "date", notNull: true },
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
  pgm.createIndex("participants", "email");

  pgm.createTable("emergency_contacts", {
    id: { type: "uuid", primaryKey: true },
    participant_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: "participants",
      onDelete: "CASCADE"
    },
    full_name: { type: "varchar(160)", notNull: true },
    phone: { type: "varchar(40)", notNull: true },
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

  pgm.createTable("registrations", {
    id: { type: "uuid", primaryKey: true },
    public_id: { type: "varchar(32)", notNull: true, unique: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "RESTRICT"
    },
    participant_id: {
      type: "uuid",
      notNull: true,
      references: "participants",
      onDelete: "RESTRICT"
    },
    category_id: {
      type: "uuid",
      notNull: true,
      references: "event_categories",
      onDelete: "RESTRICT"
    },
    jersey_size: { type: "varchar(4)", notNull: true },
    status: {
      type: "varchar(30)",
      notNull: true,
      default: "PENDING_PAYMENT"
    },
    subtotal: { type: "bigint", notNull: true },
    discount_amount: { type: "bigint", notNull: true, default: 0 },
    total_amount: { type: "bigint", notNull: true },
    waiver_version: { type: "varchar(30)", notNull: true },
    waiver_accepted_at: { type: "timestamptz", notNull: true },
    hold_expires_at: { type: "timestamptz", notNull: true },
    confirmed_at: { type: "timestamptz" },
    cancelled_at: { type: "timestamptz" },
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

  pgm.addConstraint("registrations", "registrations_status_check", {
    check:
      "status IN ('PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PAYMENT_EXPIRED', 'CANCELLED', 'REFUNDED', 'CHECKED_IN')"
  });
  pgm.addConstraint("registrations", "registrations_jersey_size_check", {
    check: "jersey_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')"
  });
  pgm.addConstraint("registrations", "registrations_amount_check", {
    check:
      "subtotal >= 0 AND discount_amount >= 0 AND total_amount = subtotal - discount_amount"
  });
  pgm.addConstraint("registrations", "registrations_event_participant_unique", {
    unique: ["event_id", "participant_id"]
  });

  pgm.createIndex("registrations", ["event_id", "status"]);
  pgm.createIndex("registrations", ["category_id", "status"]);
  pgm.createIndex("registrations", "hold_expires_at");
};

exports.down = (pgm) => {
  pgm.dropTable("registrations");
  pgm.dropTable("emergency_contacts");
  pgm.dropTable("participants");
};

