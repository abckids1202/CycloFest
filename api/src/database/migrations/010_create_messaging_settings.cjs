exports.up = (pgm) => {
  pgm.createTable("messaging_settings", {
    event_id: {
      type: "uuid",
      primaryKey: true,
      references: "events",
      onDelete: "CASCADE"
    },
    email_provider: { type: "varchar(40)", notNull: true, default: "mock" },
    email_api_key: { type: "text" },
    sender_email: { type: "varchar(254)" },
    sender_name: { type: "varchar(120)" },
    whatsapp_provider: { type: "varchar(40)", notNull: true, default: "mock" },
    whatsapp_api_key: { type: "text" },
    whatsapp_phone_number: { type: "varchar(40)" },
    templates: { type: "jsonb", notNull: true, default: "{}" },
    updated_by: { type: "uuid", references: "organizer_users", onDelete: "SET NULL" },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") }
  });

  pgm.addConstraint("messaging_settings", "messaging_settings_email_provider_check", {
    check: "email_provider IN ('mock', 'sendgrid', 'mailgun', 'resend', 'ses')"
  });
  pgm.addConstraint("messaging_settings", "messaging_settings_whatsapp_provider_check", {
    check: "whatsapp_provider IN ('mock', 'whatsapp_cloud', 'twilio', 'qontak', 'wati')"
  });
  pgm.addConstraint("messaging_settings", "messaging_settings_templates_object_check", {
    check: "jsonb_typeof(templates) = 'object'"
  });
};

exports.down = (pgm) => {
  pgm.dropTable("messaging_settings");
};
