exports.up = (pgm) => {
  pgm.createTable("organizer_users", {
    id: { type: "uuid", primaryKey: true },
    email: { type: "varchar(254)", notNull: true, unique: true },
    full_name: { type: "varchar(160)", notNull: true },
    password_hash: { type: "text", notNull: true },
    status: { type: "varchar(30)", notNull: true, default: "ACTIVE" },
    preferred_language: { type: "varchar(5)", notNull: true, default: "id" },
    last_login_at: { type: "timestamptz" },
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
  pgm.addConstraint("organizer_users", "organizer_users_email_lowercase_check", {
    check: "email = LOWER(email)"
  });
  pgm.addConstraint("organizer_users", "organizer_users_status_check", {
    check: "status IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED')"
  });
  pgm.addConstraint("organizer_users", "organizer_users_language_check", {
    check: "preferred_language IN ('id', 'en')"
  });

  pgm.createTable("organizer_memberships", {
    id: { type: "uuid", primaryKey: true },
    event_id: {
      type: "uuid",
      notNull: true,
      references: "events",
      onDelete: "CASCADE"
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "organizer_users",
      onDelete: "CASCADE"
    },
    role_id: {
      type: "bigint",
      notNull: true,
      references: "organizer_roles",
      onDelete: "RESTRICT"
    },
    status: { type: "varchar(30)", notNull: true, default: "ACTIVE" },
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
  pgm.addConstraint(
    "organizer_memberships",
    "organizer_memberships_event_user_unique",
    { unique: ["event_id", "user_id"] }
  );
  pgm.addConstraint(
    "organizer_memberships",
    "organizer_memberships_status_check",
    { check: "status IN ('ACTIVE', 'SUSPENDED', 'REMOVED')" }
  );
  pgm.createIndex("organizer_memberships", ["user_id", "status"]);

  pgm.createTable("organizer_sessions", {
    id: { type: "uuid", primaryKey: true },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "organizer_users",
      onDelete: "CASCADE"
    },
    token_hash: { type: "varchar(64)", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    last_used_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    },
    revoked_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });
  pgm.createIndex("organizer_sessions", ["user_id", "expires_at"]);
  pgm.createIndex("organizer_sessions", ["expires_at"], {
    where: "revoked_at IS NULL"
  });

  pgm.createTable("organizer_audit_log", {
    id: { type: "bigserial", primaryKey: true },
    event_id: {
      type: "uuid",
      references: "events",
      onDelete: "SET NULL"
    },
    user_id: {
      type: "uuid",
      references: "organizer_users",
      onDelete: "SET NULL"
    },
    action: { type: "varchar(120)", notNull: true },
    entity_type: { type: "varchar(80)" },
    entity_id: { type: "varchar(160)" },
    metadata: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb")
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP")
    }
  });
  pgm.addConstraint(
    "organizer_audit_log",
    "organizer_audit_log_metadata_object_check",
    { check: "jsonb_typeof(metadata) = 'object'" }
  );
  pgm.createIndex("organizer_audit_log", ["event_id", "created_at"]);
  pgm.createIndex("organizer_audit_log", ["user_id", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("organizer_audit_log");
  pgm.dropTable("organizer_sessions");
  pgm.dropTable("organizer_memberships");
  pgm.dropTable("organizer_users");
};