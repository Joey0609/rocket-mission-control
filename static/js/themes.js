const MissionThemes = (() => {
  const themes = [
    {
      id: "aurora",
      name: "极光蓝",
      vars: {
        "--bg-1": "#081425",
        "--bg-2": "#103056",
        "--bg-3": "#0e6d90",
        "--bg-4": "#2f6389",
        "--ink": "#e8f6ff",
        "--muted": "#9ec6dc",
        "--accent": "#34efb0",
        "--warn": "#ffab49",
        "--danger": "#ff6073",
        "--panel": "rgba(8, 20, 37, 0.7)",
        "--line": "rgba(158, 198, 220, 0.24)",
        "--glow": "rgba(52, 239, 176, 0.45)",
        "--surface-1": "rgba(4, 10, 20, 0.45)",
        "--surface-2": "rgba(8, 20, 37, 0.76)",
        "--surface-3": "#020914",
        "--surface-input": "rgba(4, 10, 20, 0.62)",
        "--surface-button": "rgba(13, 35, 56, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(18, 42, 65, 0.9), rgba(10, 84, 112, 0.65))",
        "--surface-axis": "linear-gradient(180deg, rgba(8, 20, 37, 0.72), rgba(8, 20, 37, 0.48))",
        "--surface-axis-tag": "rgba(8, 20, 37, 0.9)",
        "--link": "#40f0b8"
      }
    },
    {
      id: "sandstorm",
      name: "沙丘曙光",
      vars: {
        "--bg-1": "#2b1e16",
        "--bg-2": "#5e3d2f",
        "--bg-3": "#a86f4a",
        "--bg-4": "#d7a678",
        "--ink": "#fff4e8",
        "--muted": "#e1c7af",
        "--accent": "#ffd17a",
        "--warn": "#ff8f5b",
        "--danger": "#ff6f6f",
        "--panel": "rgba(45, 29, 20, 0.72)",
        "--line": "rgba(225, 199, 175, 0.26)",
        "--glow": "rgba(255, 209, 122, 0.42)",
        "--surface-1": "rgba(34, 21, 14, 0.5)",
        "--surface-2": "rgba(56, 36, 24, 0.78)",
        "--surface-3": "#24170f",
        "--surface-input": "rgba(34, 21, 14, 0.64)",
        "--surface-button": "rgba(76, 46, 29, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(84, 50, 32, 0.9), rgba(143, 90, 53, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(56, 36, 24, 0.76), rgba(40, 25, 17, 0.54))",
        "--surface-axis-tag": "rgba(48, 30, 20, 0.92)",
        "--link": "#ffd17a"
      }
    },
    {
      id: "mint-garden",
      name: "薄荷花园",
      vars: {
        "--bg-1": "#103028",
        "--bg-2": "#1f5a4a",
        "--bg-3": "#3ca287",
        "--bg-4": "#77c6a3",
        "--ink": "#eafef7",
        "--muted": "#b6e3d2",
        "--accent": "#7dffd3",
        "--warn": "#ffd28c",
        "--danger": "#ff7d8f",
        "--panel": "rgba(16, 48, 40, 0.72)",
        "--line": "rgba(182, 227, 210, 0.26)",
        "--glow": "rgba(125, 255, 211, 0.45)",
        "--surface-1": "rgba(10, 34, 28, 0.5)",
        "--surface-2": "rgba(17, 56, 46, 0.78)",
        "--surface-3": "#0f2923",
        "--surface-input": "rgba(10, 34, 28, 0.62)",
        "--surface-button": "rgba(24, 74, 60, 0.88)",
        "--surface-hero": "linear-gradient(135deg, rgba(24, 74, 60, 0.9), rgba(50, 120, 97, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(17, 56, 46, 0.76), rgba(12, 38, 32, 0.52))",
        "--surface-axis-tag": "rgba(16, 48, 40, 0.92)",
        "--link": "#9bffdb"
      }
    },
    {
      id: "sunset-city",
      name: "落日城",
      vars: {
        "--bg-1": "#2d2032",
        "--bg-2": "#66314d",
        "--bg-3": "#b45762",
        "--bg-4": "#f09d6f",
        "--ink": "#fff0ec",
        "--muted": "#efc4ba",
        "--accent": "#ffc490",
        "--warn": "#ffd86a",
        "--danger": "#ff7b8e",
        "--panel": "rgba(45, 32, 50, 0.72)",
        "--line": "rgba(239, 196, 186, 0.24)",
        "--glow": "rgba(255, 196, 144, 0.42)",
        "--surface-1": "rgba(34, 22, 38, 0.48)",
        "--surface-2": "rgba(60, 35, 52, 0.8)",
        "--surface-3": "#22151f",
        "--surface-input": "rgba(34, 22, 38, 0.62)",
        "--surface-button": "rgba(86, 46, 65, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(86, 46, 65, 0.9), rgba(169, 84, 95, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(60, 35, 52, 0.78), rgba(40, 24, 36, 0.54))",
        "--surface-axis-tag": "rgba(50, 30, 44, 0.92)",
        "--link": "#ffd09e"
      }
    },
    {
      id: "polar-day",
      name: "极昼",
      vars: {
        "--bg-1": "#eef6ff",
        "--bg-2": "#d7e9fa",
        "--bg-3": "#b9d7ef",
        "--bg-4": "#86b8dc",
        "--ink": "#17314d",
        "--muted": "#4f6d89",
        "--accent": "#0d8f73",
        "--warn": "#b87a23",
        "--danger": "#b54556",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(23, 49, 77, 0.16)",
        "--glow": "rgba(13, 143, 115, 0.26)",
        "--surface-1": "rgba(255, 255, 255, 0.78)",
        "--surface-2": "rgba(255, 255, 255, 0.88)",
        "--surface-3": "#f3f9ff",
        "--surface-input": "rgba(255, 255, 255, 0.94)",
        "--surface-button": "rgba(235, 244, 255, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(220, 238, 255, 0.95), rgba(188, 220, 246, 0.86))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(246, 252, 255, 0.82))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.94)",
        "--link": "#0d7f66"
      }
    },
    {
      id: "bamboo",
      name: "竹影",
      vars: {
        "--bg-1": "#eff7ee",
        "--bg-2": "#d8ebd3",
        "--bg-3": "#bfdcb7",
        "--bg-4": "#8cb98a",
        "--ink": "#1f3c2f",
        "--muted": "#557566",
        "--accent": "#3e9667",
        "--warn": "#b98a42",
        "--danger": "#bb4f60",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(31, 60, 47, 0.14)",
        "--glow": "rgba(62, 150, 103, 0.25)",
        "--surface-1": "rgba(255, 255, 255, 0.8)",
        "--surface-2": "rgba(255, 255, 255, 0.9)",
        "--surface-3": "#f5fbf3",
        "--surface-input": "rgba(255, 255, 255, 0.94)",
        "--surface-button": "rgba(238, 247, 236, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(226, 243, 219, 0.95), rgba(199, 227, 191, 0.85))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.91), rgba(245, 251, 243, 0.84))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.95)",
        "--link": "#2f8759"
      }
    },
    {
      id: "ink-paper",
      name: "水墨纸",
      vars: {
        "--bg-1": "#f5f4f2",
        "--bg-2": "#ebe7e1",
        "--bg-3": "#d6d0c8",
        "--bg-4": "#b8ada0",
        "--ink": "#2e312f",
        "--muted": "#666a66",
        "--accent": "#4f7468",
        "--warn": "#9a7c4f",
        "--danger": "#975563",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(46, 49, 47, 0.14)",
        "--glow": "rgba(79, 116, 104, 0.24)",
        "--surface-1": "rgba(255, 255, 255, 0.82)",
        "--surface-2": "rgba(255, 255, 255, 0.9)",
        "--surface-3": "#f7f6f3",
        "--surface-input": "rgba(255, 255, 255, 0.94)",
        "--surface-button": "rgba(242, 239, 233, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(240, 236, 229, 0.95), rgba(222, 215, 205, 0.86))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 246, 243, 0.85))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.96)",
        "--link": "#486d61"
      }
    },
    {
      id: "peach-soda",
      name: "蜜桃汽水",
      vars: {
        "--bg-1": "#fff1ef",
        "--bg-2": "#ffdeda",
        "--bg-3": "#ffc6c0",
        "--bg-4": "#f0a7b4",
        "--ink": "#4a2831",
        "--muted": "#7a4f5d",
        "--accent": "#e1688a",
        "--warn": "#d1964f",
        "--danger": "#c24563",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(74, 40, 49, 0.14)",
        "--glow": "rgba(225, 104, 138, 0.28)",
        "--surface-1": "rgba(255, 255, 255, 0.82)",
        "--surface-2": "rgba(255, 255, 255, 0.9)",
        "--surface-3": "#fff7f7",
        "--surface-input": "rgba(255, 255, 255, 0.95)",
        "--surface-button": "rgba(255, 241, 239, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(255, 229, 225, 0.95), rgba(252, 201, 196, 0.86))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 247, 247, 0.86))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.96)",
        "--link": "#c85c7b"
      }
    },
    {
      id: "lavender-mist",
      name: "薰衣薄雾",
      vars: {
        "--bg-1": "#f4f1ff",
        "--bg-2": "#e5ddfb",
        "--bg-3": "#d1c5f0",
        "--bg-4": "#afa7d8",
        "--ink": "#2f2b4e",
        "--muted": "#676184",
        "--accent": "#6f63bb",
        "--warn": "#b9904f",
        "--danger": "#b45474",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(47, 43, 78, 0.14)",
        "--glow": "rgba(111, 99, 187, 0.25)",
        "--surface-1": "rgba(255, 255, 255, 0.82)",
        "--surface-2": "rgba(255, 255, 255, 0.9)",
        "--surface-3": "#f8f6ff",
        "--surface-input": "rgba(255, 255, 255, 0.95)",
        "--surface-button": "rgba(243, 239, 255, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(236, 230, 255, 0.95), rgba(216, 206, 247, 0.86))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 246, 255, 0.86))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.96)",
        "--link": "#6559ac"
      }
    },
    {
      id: "ocean-foam",
      name: "海泡",
      vars: {
        "--bg-1": "#0e2730",
        "--bg-2": "#1b4c60",
        "--bg-3": "#2b8ba0",
        "--bg-4": "#5ec0c7",
        "--ink": "#e9fbff",
        "--muted": "#aad3dd",
        "--accent": "#73ffe7",
        "--warn": "#ffd99f",
        "--danger": "#ff7f8c",
        "--panel": "rgba(14, 39, 48, 0.72)",
        "--line": "rgba(170, 211, 221, 0.24)",
        "--glow": "rgba(115, 255, 231, 0.44)",
        "--surface-1": "rgba(10, 29, 36, 0.48)",
        "--surface-2": "rgba(14, 39, 48, 0.78)",
        "--surface-3": "#092028",
        "--surface-input": "rgba(10, 29, 36, 0.62)",
        "--surface-button": "rgba(20, 57, 71, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(20, 57, 71, 0.9), rgba(44, 125, 143, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(14, 39, 48, 0.78), rgba(10, 28, 35, 0.54))",
        "--surface-axis-tag": "rgba(14, 39, 48, 0.92)",
        "--link": "#86ffe9"
      }
    },
    {
      id: "volcanic",
      name: "火山灰",
      vars: {
        "--bg-1": "#1f1a1a",
        "--bg-2": "#3f2e2b",
        "--bg-3": "#7b4c40",
        "--bg-4": "#b87357",
        "--ink": "#fff2ea",
        "--muted": "#d9b9aa",
        "--accent": "#ffb67a",
        "--warn": "#ffd28b",
        "--danger": "#ff786b",
        "--panel": "rgba(31, 26, 26, 0.74)",
        "--line": "rgba(217, 185, 170, 0.24)",
        "--glow": "rgba(255, 182, 122, 0.4)",
        "--surface-1": "rgba(24, 19, 19, 0.5)",
        "--surface-2": "rgba(39, 30, 29, 0.8)",
        "--surface-3": "#171212",
        "--surface-input": "rgba(24, 19, 19, 0.64)",
        "--surface-button": "rgba(62, 43, 39, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(62, 43, 39, 0.9), rgba(124, 75, 62, 0.74))",
        "--surface-axis": "linear-gradient(180deg, rgba(39, 30, 29, 0.8), rgba(26, 20, 20, 0.56))",
        "--surface-axis-tag": "rgba(34, 27, 27, 0.92)",
        "--link": "#ffbf87"
      }
    },
    {
      id: "forest-night",
      name: "林夜",
      vars: {
        "--bg-1": "#102118",
        "--bg-2": "#1f3f2d",
        "--bg-3": "#3f6f51",
        "--bg-4": "#79a47f",
        "--ink": "#eef9f0",
        "--muted": "#b7d0bb",
        "--accent": "#9ef2a8",
        "--warn": "#f2d486",
        "--danger": "#f07d8a",
        "--panel": "rgba(16, 33, 24, 0.74)",
        "--line": "rgba(183, 208, 187, 0.24)",
        "--glow": "rgba(158, 242, 168, 0.4)",
        "--surface-1": "rgba(12, 25, 18, 0.5)",
        "--surface-2": "rgba(16, 33, 24, 0.8)",
        "--surface-3": "#0d1a13",
        "--surface-input": "rgba(12, 25, 18, 0.62)",
        "--surface-button": "rgba(24, 49, 35, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(24, 49, 35, 0.9), rgba(47, 89, 63, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(16, 33, 24, 0.8), rgba(11, 22, 17, 0.56))",
        "--surface-axis-tag": "rgba(16, 33, 24, 0.92)",
        "--link": "#aaf8b3"
      }
    },
    {
      id: "steel-sky",
      name: "钢蓝",
      vars: {
        "--bg-1": "#111b2a",
        "--bg-2": "#243651",
        "--bg-3": "#3f5f83",
        "--bg-4": "#6f8fb2",
        "--ink": "#edf4ff",
        "--muted": "#b2c3dc",
        "--accent": "#8fd1ff",
        "--warn": "#f2c98b",
        "--danger": "#ec7f95",
        "--panel": "rgba(17, 27, 42, 0.74)",
        "--line": "rgba(178, 195, 220, 0.24)",
        "--glow": "rgba(143, 209, 255, 0.4)",
        "--surface-1": "rgba(12, 20, 32, 0.5)",
        "--surface-2": "rgba(17, 27, 42, 0.8)",
        "--surface-3": "#0d1522",
        "--surface-input": "rgba(12, 20, 32, 0.62)",
        "--surface-button": "rgba(27, 42, 64, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(27, 42, 64, 0.9), rgba(55, 84, 118, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(17, 27, 42, 0.8), rgba(12, 20, 32, 0.56))",
        "--surface-axis-tag": "rgba(17, 27, 42, 0.92)",
        "--link": "#9ad8ff"
      }
    },
    {
      id: "amber-light",
      name: "琥珀光",
      vars: {
        "--bg-1": "#fff7eb",
        "--bg-2": "#ffebcc",
        "--bg-3": "#f7d8a0",
        "--bg-4": "#eabf7a",
        "--ink": "#4a3216",
        "--muted": "#7e5f34",
        "--accent": "#b27627",
        "--warn": "#a6631e",
        "--danger": "#b94d4f",
        "--panel": "rgba(255, 255, 255, 0.9)",
        "--line": "rgba(74, 50, 22, 0.14)",
        "--glow": "rgba(178, 118, 39, 0.24)",
        "--surface-1": "rgba(255, 255, 255, 0.82)",
        "--surface-2": "rgba(255, 255, 255, 0.9)",
        "--surface-3": "#fffaf2",
        "--surface-input": "rgba(255, 255, 255, 0.95)",
        "--surface-button": "rgba(255, 246, 232, 0.98)",
        "--surface-hero": "linear-gradient(135deg, rgba(255, 240, 214, 0.95), rgba(247, 217, 158, 0.86))",
        "--surface-axis": "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 250, 242, 0.86))",
        "--surface-axis-tag": "rgba(255, 255, 255, 0.96)",
        "--link": "#a86a21"
      }
    },
    {
      id: "rosewood",
      name: "玫木",
      vars: {
        "--bg-1": "#2a181d",
        "--bg-2": "#55303a",
        "--bg-3": "#8c4f62",
        "--bg-4": "#c88798",
        "--ink": "#fff1f5",
        "--muted": "#ddb8c4",
        "--accent": "#ffb3cc",
        "--warn": "#f5d08d",
        "--danger": "#ff808f",
        "--panel": "rgba(42, 24, 29, 0.74)",
        "--line": "rgba(221, 184, 196, 0.24)",
        "--glow": "rgba(255, 179, 204, 0.4)",
        "--surface-1": "rgba(31, 19, 23, 0.5)",
        "--surface-2": "rgba(42, 24, 29, 0.8)",
        "--surface-3": "#201216",
        "--surface-input": "rgba(31, 19, 23, 0.62)",
        "--surface-button": "rgba(66, 38, 46, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(66, 38, 46, 0.9), rgba(120, 69, 85, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(42, 24, 29, 0.8), rgba(29, 17, 20, 0.56))",
        "--surface-axis-tag": "rgba(42, 24, 29, 0.92)",
        "--link": "#ffc0d5"
      }
    },
    {
      id: "graphite",
      name: "石墨",
      vars: {
        "--bg-1": "#17191d",
        "--bg-2": "#2a2f38",
        "--bg-3": "#495466",
        "--bg-4": "#7e8ea4",
        "--ink": "#f2f6ff",
        "--muted": "#c0cad8",
        "--accent": "#8ec7ff",
        "--warn": "#f0cc95",
        "--danger": "#f08b9a",
        "--panel": "rgba(23, 25, 29, 0.76)",
        "--line": "rgba(192, 202, 216, 0.24)",
        "--glow": "rgba(142, 199, 255, 0.38)",
        "--surface-1": "rgba(17, 19, 22, 0.52)",
        "--surface-2": "rgba(23, 25, 29, 0.82)",
        "--surface-3": "#111317",
        "--surface-input": "rgba(17, 19, 22, 0.64)",
        "--surface-button": "rgba(37, 42, 51, 0.9)",
        "--surface-hero": "linear-gradient(135deg, rgba(37, 42, 51, 0.9), rgba(67, 78, 94, 0.72))",
        "--surface-axis": "linear-gradient(180deg, rgba(23, 25, 29, 0.82), rgba(17, 19, 22, 0.58))",
        "--surface-axis-tag": "rgba(23, 25, 29, 0.92)",
        "--link": "#9bd0ff"
      }
    }
  ];

  const byId = new Map(themes.map((item) => [item.id, item]));

  function get(themeId) {
    return byId.get(themeId) || themes[0];
  }

  function apply(themeId) {
    const theme = get(themeId);
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.vars)) {
      root.style.setProperty(name, value);
    }
    document.body.dataset.theme = theme.id;
    return theme.id;
  }

  function list() {
    return themes.slice();
  }

  return {
    defaultId: themes[0].id,
    list,
    get,
    apply,
  };
})();

window.MissionThemes = MissionThemes;
