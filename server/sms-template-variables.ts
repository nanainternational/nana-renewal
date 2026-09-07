export function applyContactVariables(template: string, contact: any) {
  return template
    .replaceAll("{{companyName}}", String(contact?.companyName || ""))
    .replaceAll("{{channel}}", String(contact?.channel || ""));
}

export function finalizeGeneratedMessage(template: string, generatedBody: string, contact: any) {
  const requiredVariables = ["{{companyName}}", "{{channel}}"].filter((variable) =>
    template.includes(variable),
  );
  const bodyWithVariables = requiredVariables.every((variable) => generatedBody.includes(variable))
    ? generatedBody
    : template;
  return applyContactVariables(bodyWithVariables, contact);
}
