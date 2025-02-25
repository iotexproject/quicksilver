export const extractContentFromTags = (content: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)(?:<\/${tag}>|$)`, "s");
  const match = content.match(regex);
  return match ? match[1] : null;
};
