Formát: A4 one-pager handed out during an HOA/SVJ meeting.

Return only valid JSON, no markdown, no prose outside JSON.

JSON schema:
{
  "headline": "short Czech headline",
  "subheadline": "one sentence",
  "keyNumbers": [
    {"label": "short label", "value": "value from provided data", "note": "short note"}
  ],
  "sections": [
    {"title": "short title", "bullets": ["bullet", "bullet", "bullet"]}
  ],
  "concerns": [
    {"concern": "common concern phrased generally", "response": "calm response without naming personas"}
  ],
  "callToAction": "one concrete next step for the SVJ"
}

Constraints:
- keyNumbers: exactly 3 items.
- sections: exactly 3 items.
- One section must cover nonfinancial reasons to renovate: comfort, health, noise, humidity, safety, aesthetics, resilience or neighbor fairness.
- each section has 2 to 4 bullets.
- concerns: 2 to 4 items.
- Keep it concise enough for one A4 page.
- Use personas only to decide what concerns to address. Do not name personas.
- Include no markdown.
