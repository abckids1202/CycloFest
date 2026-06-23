exports.up = (pgm) => {
  pgm.createTable("tickets", {
    id: { type: "uuid", primaryKey: true },
    public_id: { type: "varchar(40)", notNull: true, unique: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      unique: true,
      references: "registrations",
      onDelete: "RESTRICT"
    },
    participant_number: {
      type: "varchar(32)",
      notNull: true,
      unique: true
    },
    qr_token_hash: { type: "varchar(64)", notNull: true, unique: true },
    issued_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    },
    revoked_at: { type: "timestamptz" },
    revoke_reason: { type: "varchar(300)" },
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

  pgm.createIndex("tickets", ["registration_id", "revoked_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("tickets");
};