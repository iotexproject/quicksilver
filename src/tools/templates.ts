import { DepinScanProject } from "./depinscan";

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
