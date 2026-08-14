// Ostrava — Dolní oblast — větší členitá mapa (generováno skriptem, verifikováno bez kolizí).
// Aréna 68×48: městské bloky, ulice, obchody, 2× parkoviště.
const map = {
  id: "ostrava",
  name: "Ostrava — Dolní oblast",
  desc: "Industriální čtvrť s širokou třídou, vlečkami, halami a velkým parkovištěm.",
  palette: {
    sky: "#5a6a7a",
    fog: "#3a4450",
    buildingA: "#7c7c80",
    buildingB: "#8c847a",
    buildingC: "#62666e",
    buildingD: "#9a5a36",
    buildingE: "#55555c",
    buildingF: "#a86c48",
    monument: "#3e4246",
    wall: "#5a5a54",
    crate: "#3a6a9a",
    tree: "#3a6a34",
    trunk: "#3a281a",
    roof: "#474e56"
  },
  centerpiece: "miningTower",
  arena: {
    width: 68,
    depth: 48
  },
  buildings: [
    {
      pos: [
        -25,
        3.5,
        -22.5
      ],
      size: [
        8,
        7,
        3
      ],
      color: "#7c7c80"
    },
    {
      pos: [
        -15,
        5,
        -22.5
      ],
      size: [
        8,
        10,
        3
      ],
      color: "#8c847a",
      shop: {
        awning: "#e74c3c",
        sign: "#f9e04b"
      }
    },
    {
      pos: [
        -5,
        6.5,
        -22.5
      ],
      size: [
        8,
        13,
        3
      ],
      color: "#62666e"
    },
    {
      pos: [
        5,
        4,
        -22.5
      ],
      size: [
        8,
        8,
        3
      ],
      color: "#9a5a36"
    },
    {
      pos: [
        15,
        5.5,
        -22.5
      ],
      size: [
        8,
        11,
        3
      ],
      color: "#55555c",
      shop: {
        awning: "#2e86de",
        sign: "#ffffff"
      }
    },
    {
      pos: [
        25,
        7,
        -22.5
      ],
      size: [
        8,
        14,
        3
      ],
      color: "#a86c48"
    },
    {
      pos: [
        -25,
        4.5,
        22.5
      ],
      size: [
        8,
        9,
        3
      ],
      color: "#7c7c80"
    },
    {
      pos: [
        -15,
        6,
        22.5
      ],
      size: [
        8,
        12,
        3
      ],
      color: "#8c847a",
      shop: {
        awning: "#27ae60",
        sign: "#f4d03f"
      }
    },
    {
      pos: [
        -5,
        3.5,
        22.5
      ],
      size: [
        8,
        7,
        3
      ],
      color: "#62666e"
    },
    {
      pos: [
        5,
        5,
        22.5
      ],
      size: [
        8,
        10,
        3
      ],
      color: "#9a5a36"
    },
    {
      pos: [
        15,
        6.5,
        22.5
      ],
      size: [
        8,
        13,
        3
      ],
      color: "#55555c",
      shop: {
        awning: "#8e44ad",
        sign: "#f5b7b1"
      }
    },
    {
      pos: [
        25,
        4,
        22.5
      ],
      size: [
        8,
        8,
        3
      ],
      color: "#a86c48"
    },
    {
      pos: [
        -32.5,
        5.5,
        -15
      ],
      size: [
        3,
        11,
        8
      ],
      color: "#7c7c80"
    },
    {
      pos: [
        -32.5,
        7,
        -5
      ],
      size: [
        3,
        14,
        8
      ],
      color: "#8c847a",
      shop: {
        awning: "#e67e22",
        sign: "#ecf0f1"
      }
    },
    {
      pos: [
        -32.5,
        4.5,
        5
      ],
      size: [
        3,
        9,
        8
      ],
      color: "#62666e"
    },
    {
      pos: [
        -32.5,
        6,
        15
      ],
      size: [
        3,
        12,
        8
      ],
      color: "#9a5a36"
    },
    {
      pos: [
        32.5,
        3.5,
        -15
      ],
      size: [
        3,
        7,
        8
      ],
      color: "#55555c",
      shop: {
        awning: "#16a085",
        sign: "#fde3a7"
      }
    },
    {
      pos: [
        32.5,
        5,
        -5
      ],
      size: [
        3,
        10,
        8
      ],
      color: "#a86c48"
    },
    {
      pos: [
        32.5,
        6.5,
        5
      ],
      size: [
        3,
        13,
        8
      ],
      color: "#7c7c80"
    },
    {
      pos: [
        32.5,
        4,
        15
      ],
      size: [
        3,
        8,
        8
      ],
      color: "#8c847a",
      shop: {
        awning: "#e74c3c",
        sign: "#f9e04b"
      }
    },
    {
      pos: [
        -21,
        1.5,
        -10
      ],
      size: [
        5,
        3,
        6
      ],
      shop: {
        awning: "#2e86de",
        sign: "#ffffff"
      }
    },
    {
      pos: [
        -15,
        0.5,
        -10
      ],
      size: [
        5,
        1,
        6
      ]
    },
    {
      pos: [
        15,
        5.5,
        -10
      ],
      size: [
        5,
        11,
        6
      ],
      color: "#a86c48",
      shop: {
        awning: "#27ae60",
        sign: "#f4d03f"
      }
    },
    {
      pos: [
        21,
        4.5,
        -10
      ],
      size: [
        5,
        9,
        6
      ],
      color: "#7c7c80"
    },
    {
      pos: [
        -21,
        1.5,
        10
      ],
      size: [
        5,
        3,
        6
      ],
      shop: {
        awning: "#8e44ad",
        sign: "#f5b7b1"
      }
    },
    {
      pos: [
        -15,
        0.5,
        10
      ],
      size: [
        5,
        1,
        6
      ],
      shop: {
        awning: "#e67e22",
        sign: "#ecf0f1"
      }
    },
    {
      pos: [
        15,
        5.5,
        10
      ],
      size: [
        5,
        11,
        6
      ],
      color: "#a86c48",
      shop: {
        awning: "#16a085",
        sign: "#fde3a7"
      }
    },
    {
      pos: [
        21,
        4.5,
        10
      ],
      size: [
        5,
        9,
        6
      ],
      color: "#7c7c80"
    }
  ],
  roofs: [
    {
      pos: [
        -25,
        7.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -15,
        10.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -5,
        13.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        5,
        8.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        15,
        11.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        25,
        14.4,
        -22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -25,
        9.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -15,
        12.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -5,
        7.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        5,
        10.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        15,
        13.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        25,
        8.4,
        22.5
      ],
      size: [
        8.4,
        0.8,
        3.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -32.5,
        11.4,
        -15
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -32.5,
        14.4,
        -5
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -32.5,
        9.4,
        5
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -32.5,
        12.4,
        15
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        32.5,
        7.4,
        -15
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        32.5,
        10.4,
        -5
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        32.5,
        13.4,
        5
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        32.5,
        8.4,
        15
      ],
      size: [
        3.4,
        0.8,
        8.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -21,
        3.4,
        -10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -15,
        1.4,
        -10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        15,
        11.4,
        -10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        21,
        9.4,
        -10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -21,
        3.4,
        10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        -15,
        1.4,
        10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        15,
        11.4,
        10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    },
    {
      pos: [
        21,
        9.4,
        10
      ],
      size: [
        5.4,
        0.8,
        6.4
      ],
      color: "#474e56"
    }
  ],
  obstacles: [
    {
      pos: [
        -6,
        0.7,
        -10
      ],
      size: [
        2.6,
        1.4,
        1.2
      ],
      color: "#5a5a54"
    },
    {
      pos: [
        6,
        0.7,
        -10
      ],
      size: [
        2.6,
        1.4,
        1.2
      ],
      color: "#3a6a9a"
    },
    {
      pos: [
        -5,
        0.7,
        8.6
      ],
      size: [
        2.6,
        1.4,
        1.2
      ],
      color: "#5a5a54"
    },
    {
      pos: [
        5,
        0.7,
        8.6
      ],
      size: [
        2.6,
        1.4,
        1.2
      ],
      color: "#3a6a9a"
    },
    {
      pos: [
        -16,
        0.6,
        0
      ],
      size: [
        1.6,
        1.2,
        1.6
      ],
      color: "#5a5a54"
    },
    {
      pos: [
        16,
        0.6,
        0
      ],
      size: [
        1.6,
        1.2,
        1.6
      ],
      color: "#3a6a9a"
    },
    {
      pos: [
        0,
        0.6,
        -11.8
      ],
      size: [
        2.2,
        1.2,
        1.2
      ],
      color: "#5a5a54"
    }
  ],
  trees: [
    {
      pos: [
        -8,
        0,
        12.6
      ]
    },
    {
      pos: [
        8,
        0,
        12.6
      ]
    }
  ],
  benches: [
    [
      -3,
      -3
    ],
    [
      3,
      3
    ]
  ],
  lamps: [
    [
      -9,
      -9
    ],
    [
      9,
      -9
    ],
    [
      -9,
      9
    ],
    [
      9,
      9
    ],
    [
      -24,
      12.6
    ],
    [
      24,
      12.6
    ],
    [
      0,
      12.6
    ],
    [
      -24,
      -12
    ],
    [
      24,
      -12
    ],
    [
      0,
      15.9
    ]
  ],
  botSpawns: [
    [
      -24,
      1,
      -12
    ],
    [
      24,
      1,
      -12
    ],
    [
      -24,
      1,
      12.6
    ],
    [
      24,
      1,
      12.6
    ],
    [
      0,
      1,
      -12.8
    ],
    [
      -16,
      1,
      3
    ],
    [
      16,
      1,
      -3
    ],
    [
      0,
      1,
      15.9
    ],
    [
      -24,
      1,
      0
    ],
    [
      24,
      1,
      0
    ],
    [
      -6,
      1,
      15.9
    ],
    [
      6,
      1,
      -12.8
    ]
  ],
  pickupSpots: [
    [
      -20,
      1,
      -6
    ],
    [
      20,
      1,
      6
    ],
    [
      -20,
      1,
      6
    ],
    [
      20,
      1,
      -6
    ],
    [
      0,
      1,
      -9.6
    ],
    [
      0,
      1,
      12.6
    ]
  ],
  surfaces: {
    roads: [
      {
        x: 0,
        z: 18.6,
        w: 56,
        d: 4.2
      },
      {
        x: -28,
        z: 0,
        w: 3.6,
        d: 33
      },
      {
        x: 28,
        z: 0,
        w: 3.6,
        d: 33
      },
      {
        x: -10,
        z: 0,
        w: 3.2,
        d: 33
      },
      {
        x: 10,
        z: 0,
        w: 3.2,
        d: 33
      }
    ],
    sidewalks: [
      {
        x: 0,
        z: 15.649999999999999,
        w: 56,
        d: 1.5
      },
      {
        x: 0,
        z: 21.550000000000004,
        w: 56,
        d: 1.5
      },
      {
        x: -30.650000000000002,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: -25.349999999999998,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: 25.349999999999998,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: 30.650000000000002,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: -12.45,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: -7.550000000000001,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: 7.550000000000001,
        z: 0,
        w: 1.5,
        d: 33
      },
      {
        x: 12.45,
        z: 0,
        w: 1.5,
        d: 33
      }
    ],
    rails: [
      {
        x: 0,
        z: -18.6,
        w: 56,
        d: 1.8
      },
      {
        x: 0,
        z: -15.6,
        w: 56,
        d: 1.8
      }
    ],
    paths: [
      {
        x: 0,
        z: -6,
        w: 2.2,
        d: 9
      },
      {
        x: 5,
        z: 4,
        w: 10,
        d: 1.8
      }
    ],
    crosswalks: [
      {
        x: -10,
        z: 18.6,
        w: 3.2,
        d: 4.2,
        axis: "z"
      },
      {
        x: 10,
        z: 18.6,
        w: 3.2,
        d: 4.2,
        axis: "z"
      },
      {
        x: -28,
        z: 9,
        w: 3.6,
        d: 2.8,
        axis: "x"
      },
      {
        x: 28,
        z: 9,
        w: 3.6,
        d: 2.8,
        axis: "x"
      }
    ]
  },
  parkingLots: [
    {
      x: -19,
      z: 15.3,
      w: 13,
      d: 2.2,
      axis: "x"
    },
    {
      x: 21,
      z: 15.3,
      w: 9,
      d: 2.2,
      axis: "x"
    }
  ],
  assetDefaults: {
    static: 12,
    vehicle: 9,
    pedestrian: 6,
    animal: 3
  }
};

export default map;
