import { fuzzyMatch } from "../utilities";

export type Organization = {
  name: string;
  aliases: string[];
  categories: string[];
};

export function adhocOrg(name: string): Organization {
  return { name, aliases: [], categories: [] };
}

export const orgs: Organization[] = [
  {
    name: "Dallas Urbanists STLC",
    aliases: [
      "Dallas Urbanists",
      "STLC",
      "DallasUrbanistsSTLC",
      "Dallas Urbanists Strong Towns Local Converation",
      "DUSTLC",
      "DU Strong Towns Local Converation",
      "Dallas Strong Towns",
      "Dallas Strong Towns Local Conversation",
      "Strong Towns Dallas",
    ],
    categories: ['Urbanism'],
  },
  {
    name: "Dallas Neighbors for Housing",
    aliases: [
      "DN4H",
      "Neighbors for Housing",
      "NeighborsDTX",
      "Neighbors Dallas",
    ],
    categories: ['Housing'],
  },
  {
    name: "Dallas Bicycle Coalition",
    aliases: [
      "DBC",
      "Dallas Bike Coalition",
      "Bicycle Coalition",
      "Bike Coalition",
    ],
    categories: ['Cycling'],
  },
  {
    name: "Dallas Housing Coalition",
    aliases: ["DHC", "Housing Coalition"],
    categories: ['Housing'],
  },
  {
    name: "Dallas Area Transit Alliance",
    aliases: ["DATA", "Transit Alliance"],
    categories: ['Public Transit'],
  },
  {
    name: "Urbanistas DFW",
    aliases: [
      "DFW Urbanistas",
      "Urbanistas",
      "Ladies for Equitable Transit",
      "Women for Equitable Transit",
    ],
    categories: ['Public Transit'],
  },
  {
    name: "Better Block",
    aliases: ["BB", "Better Block Foundation", "The Better Block Foundation"],
    categories: ['Urbanism'],
  },
  {
    name: "Greater Dallas Planning Council",
    aliases: ["GDPC"],
    categories: ['Urbanism'],
  },
  {
    name: "Congress for New Urbanism North Texas",
    aliases: [
      "CNUNTX",
      "CNU-NTX",
      "CNU NTX",
      "CNU North Texas",
      "Congress for New Urbanism NTX",
    ],
    categories: ['Urbanism'],
  },
  {
    name: "DART",
    aliases: ["Dallas Area Rapid Transit"],
    categories: ['Public Transit'],
  },
  {
    name: "Trinity Metro",
    aliases: ["The T"],
    categories: ['Public Transit'],
  },
  {
    name: "DCTA",
    aliases: ["Denton County Transit Authority"],
    categories: ['Public Transit'],
  },
];

export function findOrganizationsInTitle(title: string): Organization[] {
  return orgs
    // Compare all organizations against the title
    .map(org => {
      // Look for org name and track it's position in title
      const position = title.indexOf(org.name);
      if (position !== -1) return { org, position };

      // If org name not in title, look for org aliases in the title
      const aliasPosition = org.aliases
        .map(alias => ({ alias, position: title.indexOf(alias) }))
        .find(entry => entry.position !== -1);
      if (aliasPosition) return { org, position: aliasPosition.position };

      // If org not in title at all, return a position that we can filter out
      return { org, position: -1 };
    })
    // Filter out non-matches
    .filter(r => r && r.position > -1)
    // Sort array by position
    .sort((a, b) => a.position - b.position)
    // Return only the organization object
    .map(o => o.org);
}

export function findOrganization(name: string): Organization|null {
  const matchingName = (o:Organization): boolean => fuzzyMatch(o.name, name);
  const matchingAlias = (o:Organization): boolean => o.aliases.some(alias => fuzzyMatch(alias, name));
  return orgs.find((o:Organization)=> matchingName(o)||matchingAlias(o)) ?? null;
}