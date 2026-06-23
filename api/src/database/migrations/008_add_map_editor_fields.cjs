exports.up = (pgm) => {
  pgm.addColumns("venues", {
    map_label: { type: "varchar(80)" },
    pin_type: { type: "varchar(40)" }
  });

  pgm.addColumn("sponsors", {
    venue_id: {
      type: "uuid",
      references: "venues",
      onDelete: "SET NULL"
    }
  });

  pgm.createIndex("sponsors", ["venue_id"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("sponsors", ["venue_id"]);
  pgm.dropColumn("sponsors", "venue_id");
  pgm.dropColumns("venues", ["map_label", "pin_type"]);
};
