exports.up = (pgm) => {
  pgm.createTable("message_outbox", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    registration_id: {
      type: "uuid",
      references: "registrations",
      onDelete: "SET NULL"
    },
    channel: { type: "varchar(30)", notNull: true },
    message_type: { type: "varchar(60)", notNull: true },
    recipient: { type: "varchar(254)", notNull: true },
    subject: { type: "varchar(180)" },
    body: { type: "text", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "QUEUED" },
    provider: { type: "varchar(40)", notNull: true, default: "mock" },
    provider_message_id: { type: "varchar(120)" },
    error_message: { type: "text" },
    metadata: { type: "jsonb", notNull: true, default: "{}" },
    created_by: { type: "uuid", references: "organizer_users", onDelete: "SET NULL" },
    sent_at: { type: "timestamp" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") }
  });

  pgm.addConstraint("message_outbox", "message_outbox_channel_check", {
    check: "channel IN ('EMAIL', 'WHATSAPP')"
  });
  pgm.addConstraint("message_outbox", "message_outbox_status_check", {
    check: "status IN ('QUEUED', 'SENT', 'FAILED')"
  });
  pgm.createIndex("message_outbox", ["event_id", "created_at"]);
  pgm.createIndex("message_outbox", ["registration_id", "created_at"]);
  pgm.createIndex("message_outbox", ["message_type", "status"]);
};

exports.down = (pgm) => {
  pgm.dropTable("message_outbox");
};
