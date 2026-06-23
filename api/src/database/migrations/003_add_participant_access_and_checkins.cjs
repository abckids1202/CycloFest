exports.up = (pgm) => {
  pgm.addColumn("registrations", {
    access_token_hash: { type: "varchar(64)" }
  });

  pgm.createTable("checkins", {
    id: { type: "uuid", primaryKey: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: "registrations",
      onDelete: "RESTRICT"
    },
    checkin_type: { type: "varchar(30)", notNull: true },
    checked_in_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    },
    checked_in_by: { type: "varchar(120)", notNull: true },
    notes: { type: "varchar(500)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });

  pgm.addConstraint("checkins", "checkins_type_check", {
    check:
      "checkin_type IN ('RACE_PACK_COLLECTED', 'EVENT_ENTRY', 'START_CONFIRMED', 'FINISH_CONFIRMED')"
  });
  pgm.addConstraint("checkins", "checkins_registration_type_unique", {
    unique: ["registration_id", "checkin_type"]
  });
  pgm.createIndex("checkins", ["checkin_type", "checked_in_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("checkins");
  pgm.dropColumn("registrations", "access_token_hash");
};