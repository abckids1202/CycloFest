exports.up = (pgm) => {
  pgm.createTable("payments", {
    id: { type: "uuid", primaryKey: true },
    public_id: { type: "varchar(40)", notNull: true, unique: true },
    registration_id: {
      type: "uuid",
      notNull: true,
      references: "registrations",
      onDelete: "RESTRICT"
    },
    provider: { type: "varchar(40)", notNull: true },
    provider_order_id: { type: "varchar(160)", notNull: true, unique: true },
    provider_transaction_id: { type: "varchar(160)" },
    amount: { type: "bigint", notNull: true },
    currency: { type: "char(3)", notNull: true, default: "IDR" },
    payment_method: { type: "varchar(60)" },
    status: { type: "varchar(30)", notNull: true, default: "CREATED" },
    checkout_url: { type: "text" },
    expires_at: { type: "timestamptz", notNull: true },
    paid_at: { type: "timestamptz" },
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

  pgm.addConstraint("payments", "payments_status_check", {
    check:
      "status IN ('CREATED', 'PENDING', 'PAID', 'SETTLED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED')"
  });
  pgm.addConstraint("payments", "payments_amount_check", {
    check: "amount > 0"
  });
  pgm.createIndex("payments", ["registration_id", "status"]);
  pgm.createIndex("payments", ["provider", "provider_order_id"]);
  pgm.sql(
    `CREATE UNIQUE INDEX payments_one_active_per_registration
     ON payments (registration_id)
     WHERE status IN ('CREATED', 'PENDING')`
  );

  pgm.createTable("payment_events", {
    id: { type: "bigserial", primaryKey: true },
    payment_id: {
      type: "uuid",
      references: "payments",
      onDelete: "SET NULL"
    },
    provider: { type: "varchar(40)", notNull: true },
    provider_event_id: { type: "varchar(180)", notNull: true },
    event_type: { type: "varchar(80)", notNull: true },
    payload_json: { type: "jsonb", notNull: true },
    signature_valid: { type: "boolean", notNull: true },
    processed_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });
  pgm.addConstraint("payment_events", "payment_events_provider_event_unique", {
    unique: ["provider", "provider_event_id"]
  });
  pgm.createIndex("payment_events", ["payment_id", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("payment_events");
  pgm.dropTable("payments");
};