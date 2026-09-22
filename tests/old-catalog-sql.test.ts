import { describe, expect, it } from "vitest";
import { parseDumpTables } from "../scripts/lib/old-catalog-sql.mjs";

/**
 * The reader for the old catalogue's MySQL dump. A value that slips a column
 * does not fail loudly — it files a price as a photo path — so the quoting
 * rules phpMyAdmin actually writes are pinned here.
 */

const dump = `
CREATE TABLE \`produktet\` (\`produktID\` int(11) NOT NULL);
INSERT INTO \`produktet\` (\`produktID\`, \`name\`, \`nrserik\`, \`price\`, \`changes\`) VALUES
(1, 'Aparat prodhues i oksigjenit 5L', '0440', '580.00', NULL),
(2, ' Johnson''s baby, 500ml ', ' 2836A,B', '3.30', 'Ndryshuar Jo-Aktivizuar'),
(3, 'Gel (sl-925-1) \\'ortho\\' 13x13', '8053-s', '4.00', 'NULL');
INSERT INTO \`produktet\` (\`produktID\`, \`name\`, \`nrserik\`, \`price\`, \`changes\`) VALUES
(4, 'Second statement', '5600', '12.50', NULL);
INSERT INTO \`users\` (\`userID\`, \`email\`, \`password\`) VALUES
(1, 'someone@example.com', '$2y$10$hash');
`;

describe("parseDumpTables", () => {
  const { produktet } = parseDumpTables(dump, ["produktet"]);

  it("reads every row of every INSERT statement", () => {
    expect(produktet.map((r) => r.produktID)).toEqual(["1", "2", "3", "4"]);
  });

  it("keys values by column and trims the padding", () => {
    expect(produktet[1]).toEqual({
      produktID: "2",
      name: "Johnson's baby, 500ml",
      nrserik: "2836A,B",
      price: "3.30",
      changes: "Ndryshuar Jo-Aktivizuar",
    });
  });

  it("keeps commas and brackets inside strings, and undoes backslash escapes", () => {
    expect(produktet[2].name).toBe("Gel (sl-925-1) 'ortho' 13x13");
  });

  it("tells a bare NULL from the string 'NULL'", () => {
    expect(produktet[0].changes).toBeNull();
    expect(produktet[2].changes).toBe("NULL");
  });

  it("reads only the tables it is asked for", () => {
    expect(Object.keys(parseDumpTables(dump, ["produktet"]))).toEqual(["produktet"]);
  });
});
