import buildingsAssetJson from "@/assets/panelak_intro_page.png.asset.json";

export const buildingsAsset = {
  ...buildingsAssetJson,
  url: "/img/houses/panelak.png",
};

export function getHouseImageUrl(buildingInfo: any | null): string {
  if (!buildingInfo || !buildingInfo.building) {
    return "/img/houses/panelak.png";
  }

  const type = (buildingInfo.building.buildingType || "").toLowerCase();
  const usage = (buildingInfo.building.usage || "").toLowerCase();
  if (
    type.includes("family house") ||
    type.includes("rodinny") ||
    usage.includes("family house") ||
    usage.includes("rodinny")
  ) {
    return "/img/houses/basic_house.png";
  }

  return "/img/houses/panelak.png";
}
