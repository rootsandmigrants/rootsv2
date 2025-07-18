// Will be populated from JSON files
let nativeLayer = {};

const animNamespace = {
  // Will be populated from JSON files
  shapefiles: {},

  // Track loading state
  configsLoaded: false,
  map: null,
  previousLabelData: null,
  previousGeojsonData: null,
  similarityThreshold: 0.95, // Adjust this threshold as needed

  // ============================================================================
  // INITIALIZATION - Load JSON configurations
  // ============================================================================
  async loadConfigurations() {
    try {
      // Load both config files
      const [nativeResponse, shapefilesResponse] = await Promise.all([
        fetch("assets/config/nativeConfig.json"),
        fetch("assets/config/HistoryShapefileConfig.json"),
      ]);

      nativeLayer = await nativeResponse.json();
      this.shapefiles = await shapefilesResponse.json();

      this.configsLoaded = true;
      console.log("✅ Animation configurations loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load animation configurations:", error);
      throw error;
    }
  },

  async init() {
    console.log("Initializing animNamespace");

    // Load configurations first
    await this.loadConfigurations();

    this.map = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        sources: {
          esriWorldPhysical: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution:
              '<a href="https://www.esri.com/" target="_blank">Esri</a> | <a href="https://native-land.ca" target="_blank">Native Land Digital',
          },
        },
        glyphs:
          "https://rootsandmigrants.github.io/fonts/glyphs/{fontstack}/{range}.pbf",

        layers: [
          {
            id: "esriWorldPhysical-layer",
            type: "raster",
            source: "esriWorldPhysical",
            minzoom: 0,
            maxzoom: 22,
            paint: {
              "raster-opacity": 0.2, // Increase this value to make the basemap less transparent
            },
          },
        ],
      },
      center: [-98.35, 39.5],
      zoom: 4, // Set an appropriate zoom level for a global view
      minZoom: 3, // Prevents zooming out too much
      maxZoom: 7, // Prevents zooming in too much
    });

    // Updated map load event handler with proper async/await
    this.map.on("load", async () => {
      console.log("Map loaded, initializing components in correct order...");

      try {
        // 🔄 STEP 1: Initialize colony popup functionality FIRST
        await ColonyPopup.init(this.map);
        console.log("✅ Colony popup functionality initialized");

        // 🔄 STEP 2: Add controls and native territories
        this.addControls(); // Add scale and zoom controls
        this.addZoomToExtentButton(); // Add the zoom to extent button
        this.loadNativeTerritories(); // Load Native Territories (STATIC)

        // 🔄 STEP 3: Load initial shapefile data for 1607 and WAIT for it to complete
        console.log("Loading initial shapefile for 1607...");
        await this.loadShapefile(1607);
        console.log("✅ Initial shapefile loaded");

        // 🔄 STEP 4: Now explicitly set ColonyPopup year (this ensures markers are added)
        if (typeof ColonyPopup !== "undefined" && ColonyPopup.isInitialized) {
          ColonyPopup.setCurrentYear(1607);
          console.log("✅ Colony popup year set to 1607 with event markers");
        }

        console.log("✅ All map components initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize map components:", error);
      }
    });
  },

  addControls: function () {
    const scaleControl = new maplibregl.ScaleControl({
      maxWidth: 80, // Adjust the max width of the scale bar
      unit: "metric", // Use metric units (kilometers)
    });
    this.map.addControl(scaleControl, "bottom-left");

    const zoomControl = new maplibregl.NavigationControl();
    this.map.addControl(zoomControl, "bottom-right"); // Add zoom control to the bottom-right corner
  },

  addZoomToExtentButton: function () {
    const button = document.createElement("button");
    button.className = "zoom-to-extent-button";
    button.innerHTML = '<img src="img/extent.png" alt="Zoom to Extent">';
    const tooltip = document.createElement("div");
    tooltip.className = "zoom-to-extent-tooltip";
    tooltip.textContent = "Zoom to Extent";
    tooltip.style.visibility = "hidden"; // Start hidden

    button.addEventListener("mouseenter", () => {
      tooltip.style.visibility = "visible"; // Show tooltip on hover
    });

    button.addEventListener("mouseleave", () => {
      tooltip.style.visibility = "hidden"; // Hide tooltip when not hovering
    });

    button.addEventListener("click", () => {
      this.map.flyTo({
        center: [-98.35, 39.5], // Adjust the coordinates as needed
        zoom: 4, // Adjust the zoom level as needed
        essential: true, // This animation is considered essential with respect to prefers-reduced-motion
        pitch: 0,
        bearing: 0,
      });
    });
    button.appendChild(tooltip);

    // Append the button to the map container
    this.map.getContainer().appendChild(button);
  },

  getNameField: function (data) {
    const possibleFields = ["STATENAM", "ColonyName", "STATE_ABBR", "LABEL"];
    const properties = data.features[0].properties;
    for (let field of possibleFields) {
      if (properties.hasOwnProperty(field)) {
        return field;
      }
    }
    return "name"; // Fallback if no match is found
  },

  getCentroid: function (geometry) {
    if (geometry.type === "Polygon") {
      return turf.centroid(geometry).geometry.coordinates;
    } else if (geometry.type === "MultiPolygon") {
      let largestPolygon = geometry.coordinates.reduce((a, b) => {
        return turf.area(turf.polygon(a)) > turf.area(turf.polygon(b)) ? a : b;
      });
      return turf.centroid(turf.polygon(largestPolygon)).geometry.coordinates;
    }
  },

  prepareLabelData: function (data, nameField) {
    const labelFeatures = data.features.map((feature) => {
      const centroid = this.getCentroid(feature.geometry);
      return {
        type: "Feature",
        properties: {
          name: feature.properties[nameField],
        },
        geometry: {
          type: "Point",
          coordinates: centroid,
        },
      };
    });
    return {
      type: "FeatureCollection",
      features: labelFeatures,
    };
  },

  calculateBoundarySimilarity: function (geojson1, geojson2) {
    const area1 = turf.area(geojson1);
    const area2 = turf.area(geojson2);
    let intersection;
    try {
      intersection = turf.intersect(geojson1, geojson2);
    } catch (e) {
      console.error("Error calculating intersection:", e);
      return 0; // Return 0 similarity if intersection fails
    }
    const intersectionArea = intersection ? turf.area(intersection) : 0;
    return intersectionArea / Math.min(area1, area2);
  },

  // Updated loadShapefile method that returns a promise
  async loadShapefile(year) {
    if (!this.configsLoaded) {
      console.warn("Configurations not loaded yet, cannot load shapefile");
      return;
    }

    // ADD THIS LINE:
    if (typeof ColonyPopup !== "undefined" && ColonyPopup.isInitialized) {
      ColonyPopup.setCurrentYear(year);
    }

    const shapefileUrl = this.shapefiles[year];

    if (!shapefileUrl) {
      console.warn(`No shapefile found for year ${year}`);
      return;
    }

    console.log(`Loading shapefile from ${shapefileUrl}`);

    try {
      const response = await fetch(shapefileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch shapefile for year ${year}`);
      }

      const geojsonData = await response.json();
      const nameField = this.getNameField(geojsonData);
      let labelData;

      if (
        this.previousGeojsonData &&
        this.calculateBoundarySimilarity(
          this.previousGeojsonData,
          geojsonData
        ) > this.similarityThreshold
      ) {
        labelData = this.previousLabelData;
        console.log(`Reusing labels from previous year for ${year}`);
      } else {
        labelData = this.prepareLabelData(geojsonData, nameField);
        this.previousLabelData = labelData;
        this.previousGeojsonData = geojsonData;
        console.log(`Generated new labels for year ${year}`);
      }

      if (this.map.getSource("us-boundaries")) {
        this.map.getSource("us-boundaries").setData(geojsonData);
      } else {
        this.map.addSource("us-boundaries", {
          type: "geojson",
          data: geojsonData,
        });

        this.map.addLayer({
          id: "us-boundaries-layer",
          type: "fill",
          source: "us-boundaries",
          layout: {},
          paint: {
            "fill-color": "rgba(0, 0, 0, 0)",
            "fill-outline-color": "rgba(0, 0, 0, 0.3)",
          },
        });
      }

      // ✅ Handle boundary emphasis layer only once
      if (!this.map.getLayer("us-boundaries-emphasis")) {
        this.map.addLayer({
          id: "us-boundaries-emphasis",
          type: "line",
          source: "us-boundaries",
          layout: { visibility: "none" },
          paint: {
            "line-color": "#000000",
            "line-width": 2,
            "line-opacity": 0.5,
          },
        });
      }

      // ✅ Add or update labels source
      if (this.map.getSource("us-boundaries-labels")) {
        this.map.getSource("us-boundaries-labels").setData(labelData);
      } else {
        this.map.addSource("us-boundaries-labels", {
          type: "geojson",
          data: labelData,
        });
      }

      // ✅ Ensure label layer is added if not already there
      if (!this.map.getLayer("us-boundaries-labels-layer")) {
        this.map.addLayer({
          id: "us-boundaries-labels-layer",
          type: "symbol",
          source: "us-boundaries-labels",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Metropolis-Bold"],
            "text-size": 10,
            "text-transform": "none",
            "text-letter-spacing": 0.05,
            "text-offset": [0, 0.6],
            "text-anchor": "top",
            "text-keep-upright": true,
            "text-variable-anchor": ["center"],
          },
          paint: {
            "text-color": "black",
            "text-halo-color": "white",
            "text-halo-width": 1,
          },
        });
      }

      console.log(`✅ Shapefile for year ${year} loaded successfully`);
      // document.getElementById("slider").textContent = `Year: ${year}`;
    } catch (error) {
      console.error("Error loading shapefile:", error);
      throw error; // Re-throw so calling code can handle it
    }
  },

  loadNativeTerritories: function () {
    if (!this.configsLoaded) {
      console.warn(
        "Configurations not loaded yet, cannot load native territories"
      );
      return;
    }

    if (this.map.getSource(nativeLayer.sourceId)) return;

    this.map.addSource(nativeLayer.sourceId, {
      type: "geojson",
      data: nativeLayer.file,
    });

    this.map.addLayer({
      id: nativeLayer.fillId,
      type: "fill",
      source: nativeLayer.sourceId,
      layout: { visibility: "none" },
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.3,
      },
    });

    this.map.addLayer({
      id: nativeLayer.lineId,
      type: "line",
      source: nativeLayer.sourceId,
      layout: { visibility: "none" },
      paint: {
        "line-color": "#5e5d5d",
        "line-width": 0.5,
      },
    });

    // Create persistent popup (only one)
    const nativePopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    // Show popup on hover
    this.map.on("mousemove", nativeLayer.fillId, (e) => {
      const features = e.features;
      const coordinates = e.lngLat;

      const names = features
        .map((f) => f.properties.Name || f.properties.name || "Unknown")
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

      const html = names
        .map((n) => `<div><strong>${n}</strong></div>`)
        .join("");

      nativePopup.setLngLat(coordinates).setHTML(html).addTo(this.map);
    });

    // Remove popup when not hovering
    this.map.on("mouseleave", nativeLayer.fillId, () => {
      nativePopup.remove();
    });

    this.map.on("mouseenter", nativeLayer.fillId, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });

    this.map.on("mouseleave", nativeLayer.fillId, () => {
      this.map.getCanvas().style.cursor = "";
    });

    console.log("✅ Native territories loaded successfully");
  },
};

document.addEventListener("DOMContentLoaded", function () {
  animNamespace.init();
});
