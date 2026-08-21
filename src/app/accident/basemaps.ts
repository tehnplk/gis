export type BaseMap = {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** โดเมนย่อยของ tile server ที่ใช้ {s} ใน URL */
  subdomains?: string;
  /** พื้นหลังเข้ม — ชั้นข้อมูลที่เป็นเส้นต้องสลับไปใช้สีสว่างแทน */
  dark?: boolean;
};

export const BASE_MAPS: BaseMap[] = [
  {
    id: "osm",
    label: "แผนที่ถนน",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: "satellite",
    label: "ดาวเทียม",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
  {
    id: "dark",
    label: "โหมดมืด",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: "abcd",
    dark: true,
  },
  {
    id: "topo",
    label: "ภูมิประเทศ",
    url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
];
