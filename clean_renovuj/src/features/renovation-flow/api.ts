export async function searchAddresses(query: string) {
  const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Address search failed.");
  }
  return data;
}

export async function fetchBuildingInfo(match: any) {
  const response = await fetch("/api/building-info", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ selectedAddress: match }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not load building details.");
  }
  return data;
}

export async function calculateRenovation(payload: any) {
  const response = await fetch("/api/calculate-renovation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchCommunityExamples(municipalityName: string) {
  const response = await fetch(
    `/api/reconstruction-examples?municipalityName=${encodeURIComponent(municipalityName)}`,
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function generatePdf(endpoint: string, payload: any) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("PDF generation failed.");
  }
  return response.blob();
}

export async function generateMaterial(payload: any) {
  const response = await fetch("/api/generate-material", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "WhatsApp message generation failed.");
  }
  return data;
}
