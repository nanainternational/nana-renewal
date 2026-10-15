export function applyContactVariables(template: string, contact: any) {
  return template
    .replaceAll("{{companyName}}", String(contact?.companyName || ""))
    .replaceAll("{{channel}}", String(contact?.channel || ""));
}

// Only format AI-generated drafts; manually edited and variable-only messages stay untouched.
export function formatMobileSms(body: string) {
  return body.replace(/\r\n?/g, "\n").trim()
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.split("\n").flatMap((line) => {
      // Korean sentence endings are safe boundaries; leave decimals, URLs and phone numbers intact.
      return line.trim().split(/(?<=[다요죠][.!?])[ \t]+/).flatMap((sentence) => {
        const lines: string[] = [];
        let current = "";
        for (const word of sentence.split(/[ \t]+/).filter(Boolean)) {
          const next = current ? `${current} ${word}` : word;
          if (current && Array.from(next).length > 28) {
            lines.push(current);
            current = word;
          } else current = next;
        }
        if (current) lines.push(current);
        return lines;
      });
    }).join("\n")).join("\n\n");
}

export function finalizeGeneratedMessage(template: string, generatedBody: string, contact: any) {
  const requiredVariables = ["{{companyName}}", "{{channel}}"].filter((variable) =>
    template.includes(variable),
  );
  const bodyWithVariables = requiredVariables.every((variable) => generatedBody.includes(variable))
    ? generatedBody
    : template;
  return formatMobileSms(applyContactVariables(bodyWithVariables, contact));
}
