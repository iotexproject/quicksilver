import { DepinScanProject } from "./depinscan";

export const coordinatesTemplate = (query: string) =>
  `
Extract latitude and longitude from the following query: 
<location_query>
${query}
</location_query>

If there are no coordinates try to derive them from the location name.
Return JSON in format 
<response>
{"lat": number, "lon": number}
</response>
`;

export const depinScanProjectsTemplate = (
  query: string,
  projects: DepinScanProject[],
) =>
  `
Given the user query: "${query}", analyze the following DePIN projects data and extract only the relevant information that answers the query.

Projects data: ${JSON.stringify(projects)}

<response>
[relevant_projects]
</response>
`;
