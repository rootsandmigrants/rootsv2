const migrationNamespace = {
  // Will be populated from JSON files
  shapefiles: {},
  csvFiles: {},

  // Track loading state
  configsLoaded: false,
  map: null,
  previousLabelData: null,
  previousGeojsonData: null,
  similarityThreshold: 0.95, // Adjust this threshold as needed
  currentYear: 1607, // Track current year

  // ============================================================================
  // INITIALIZATION - Load JSON configurations
  // ============================================================================
  async loadConfigurations() {
    try {
      // Load both config files
      const [shapefilesResponse, csvResponse] = await Promise.all([
        fetch("assets/config/HistoryShapefileConfig.json"),
        fetch("assets/config/NetflowConfig.json"),
      ]);

      this.shapefiles = await shapefilesResponse.json();
      this.csvFiles = await csvResponse.json();

      this.configsLoaded = true;
      console.log("✅ Migration configurations loaded successfully");

      // Trigger slider tick regeneration if slider exists
      this.triggerSliderUpdate();
    } catch (error) {
      console.error("❌ Failed to load migration configurations:", error);
      throw error;
    }
  },

  // Re-attach the netFlowInfo event listener after legend creation
  reattachNetFlowInfoListener: function () {
    setTimeout(() => {
      const netFlowInfoElement = document.getElementById("netFlowInfo");
      if (netFlowInfoElement) {
        // Remove any existing listener to avoid duplicates
        netFlowInfoElement.replaceWith(netFlowInfoElement.cloneNode(true));

        // Get the fresh element and attach the listener exactly as in your modal code
        const freshNetFlowInfo = document.getElementById("netFlowInfo");
        freshNetFlowInfo.addEventListener("click", function (event) {
          event.preventDefault();
          showInfoModal(
            "Net Flow Ratio",
            `The <b>Net Flow Ratio</b> measures migration balance in a given area.
          <ul class="highlight-box">
            <b>Positive Net Flow Ratio:</b> More people are <b>moving in</b> than leaving.<br>
            <b>Negative Net Flow Ratio:</b> More people are <b>leaving</b> than coming in.<br>
          </ul>
          <b>Data Limitations:</b> Data reflects patterns from  census period and short-term fluctuations may not be captured. Some areas may have limited data accuracy and migration records are not available.`,
            "img/netflowratio.png"
          );
        });

        console.log("✅ Re-attached netFlowInfo event listener");
      } else {
        console.warn("netFlowInfo element not found after legend creation");
      }
    }, 150); // Small delay to ensure DOM is updated
  },

  // Helper method to check if data is available for a specific year
  hasDataForYear(year) {
    if (!this.configsLoaded) {
      return false; // Return false if configs not loaded yet
    }
    return this.shapefiles[year] && this.csvFiles[year];
  },

  // Helper method to trigger slider update when configurations change
  triggerSliderUpdate() {
    // Check if the slider's generateTicks function exists and call it
    if (typeof generateTicks === "function") {
      setTimeout(() => generateTicks(), 100);
    }
    // Alternative: dispatch a custom event that the slider can listen for
    document.dispatchEvent(new CustomEvent("migrationConfigsLoaded"));
  },

  async init() {
    console.log("Initializing migrationNamespace");

    // Load configurations first
    await this.loadConfigurations();

    this.map = new maplibregl.Map({
      container: "mapMig",
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
              '<a href="https://www.esri.com/" target="_blank">Esri</a>',
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
            maxzoom: 24,
            paint: {
              "raster-opacity": 0.2, // Adjust transparency as needed
            },
          },
        ],
      },
      center: [-98.35, 39.5],
      zoom: 4, // Set an appropriate initialzoom level
      minZoom: 3, // Prevents zooming out too much
      maxZoom: 7, // Prevents zooming in too much
    });

    this.map.on("load", () => {
      this.loadShapefile(1607);
      this.addScaleControl(); // Add scale control after map loads
      this.addTooltipHandler(); // Add tooltip handler after map loads
      this.addZoomToExtentButton(); // Add the zoom to extent button
    });
  },

  addScaleControl: function () {
    const scaleControl = new maplibregl.ScaleControl({
      maxWidth: 80, // Adjust the max width of the scale bar
      unit: "metric", // Use metric units (kilometers)
    });
    this.map.addControl(scaleControl, "bottom-left"); // Add scale control to the bottom-left corner
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
    const possibleFields = ["STATENAM", "STATE_ABBR", "LABEL"];
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

  loadCSVData: function (url) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load CSV file: ${url}`);
        }
        return response.text();
      })
      .then((csvText) => {
        console.log("CSV Text:", csvText); // Log CSV text for debugging
        const parsedData = d3.csvParse(csvText, (d) => {
          d.rootsid = +d.rootsid; // Convert rootsid to number
          d.Netflow_Ratio = +d.Netflow_Ratio; // Convert Netflow_Ratio to number
          return d;
        });
        console.log("Parsed CSV Data:", parsedData); // Log parsed CSV data for debugging
        return parsedData;
      })
      .catch((error) => console.error("Error loading CSV file:", error));
  },

  mergeData: function (geojson, csvData) {
    const csvMap = new Map(csvData.map((row) => [row.rootsid, row]));

    geojson.features.forEach((feature) => {
      const csvRow = csvMap.get(feature.properties.rootsid);
      console.log("GeoJSON Feature:", feature);
      console.log("CSV Row:", csvRow); // Log csvRow variable
      if (csvRow) {
        feature.properties = { ...feature.properties, ...csvRow };
      }
    });

    return geojson;
  },

  createColorScale: function () {
    const breaks = [-0.3, -0.15, 0, 0.15, 0.3]; // Changed 0.7 to 0.3 (30%)
    const colors = [
      "#e5988f", // < -30%
      "#f0c5bb", // -30% to -15%
      "#fddbc7", // -15% to 0%
      "#d1e5f0", // 0% to 15%
      "#92c5de", // 15% to 30%  // Updated comment
      "#4393c3", // > 30%       // Updated comment
    ];
    return d3.scaleThreshold().domain(breaks).range(colors);
  },

  // ============================================================================
  // NEW: Create and update legend using LegendManager
  // ============================================================================
  updateLegend: function (year) {
    // Store current year for reference
    this.currentYear = year;

    // Check if LegendManager is available
    if (typeof LegendManager === "undefined") {
      console.error("LegendManager is not available");
      return;
    }

    // Check if we have data for this year
    if (this.hasDataForYear(year)) {
      // Create migration legend using LegendManager
      LegendManager.create("migration", "maps-legends", { year: year });

      // Re-attach the netFlowInfo event listener after legend creation
      this.reattachNetFlowInfoListener();

      console.log(`✅ Created migration legend for year ${year}`);
    } else {
      // Hide legend if no data available
      LegendManager.hide("maps-legends");
      console.log(`❌ No data for year ${year}, hiding legend`);
    }
  },

  // Set up click handler for the info icon - integrate with existing modal system
  setupInfoIconHandler: function () {
    // Use setTimeout to ensure the DOM is updated
    setTimeout(() => {
      // Try to re-trigger your existing modal setup
      // This assumes you have a function that sets up all info icon handlers
      if (typeof setupInfoIconHandlers === "function") {
        setupInfoIconHandlers();
      }
      // Alternative: if you have a specific function for this icon
      else if (typeof attachNetFlowInfoHandler === "function") {
        attachNetFlowInfoHandler();
      }
      // Last resort: manually trigger existing event delegation
      else {
        // Re-trigger any delegated event handlers by dispatching events
        const infoIcon = document.getElementById("netFlowInfo");
        if (infoIcon) {
          // Trigger whatever existing system you have
          $(infoIcon).trigger("setupComplete"); // If using jQuery

          console.log("✅ Attempted to re-attach existing modal handlers");
        }
      }
    }, 100);
  },

  loadShapefile: function (year) {
    if (!this.configsLoaded) {
      console.warn("Configurations not loaded yet, cannot load shapefile");
      return;
    }

    // ✅ Update legend using LegendManager
    this.updateLegend(year);

    const shapefileUrl = this.shapefiles[year];
    const csvUrl = this.csvFiles[year];

    if (!shapefileUrl || !csvUrl) {
      console.warn(`No data files found for year ${year}`);

      // Remove all layers and sources completely
      if (this.map.getLayer("us-boundaries-layer")) {
        this.map.removeLayer("us-boundaries-layer");
      }
      if (this.map.getLayer("us-boundaries-outline-layer")) {
        this.map.removeLayer("us-boundaries-outline-layer");
      }
      if (this.map.getLayer("us-boundaries-labels-layer")) {
        this.map.removeLayer("us-boundaries-labels-layer");
      }
      if (this.map.getSource("us-boundaries")) {
        this.map.removeSource("us-boundaries");
      }
      if (this.map.getSource("us-boundaries-labels")) {
        this.map.removeSource("us-boundaries-labels");
      }

      // Clear previous data cache when no data available
      this.previousLabelData = null;
      this.previousGeojsonData = null;

      return;
    }

    // Continue with normal processing when both shapefile and CSV are available
    console.log(`Loading shapefile from ${shapefileUrl}`);
    console.log(`Loading CSV data from ${csvUrl}`);

    Promise.all([
      fetch(shapefileUrl).then((response) => response.json()),
      this.loadCSVData(csvUrl),
    ])
      .then(([geojsonData, csvData]) => {
        console.log("GeoJSON Data:", geojsonData);
        console.log("CSV Data:", csvData);

        const mergedData = this.mergeData(geojsonData, csvData);
        const nameField = this.getNameField(mergedData);
        const values = mergedData.features
          .map((feature) => feature.properties.Netflow_Ratio)
          .filter((v) => v !== null && !isNaN(v));

        const colorScale = this.createColorScale(values);

        mergedData.features.forEach((feature) => {
          if (
            feature.properties.Netflow_Ratio !== null &&
            !isNaN(feature.properties.Netflow_Ratio)
          ) {
            feature.properties.color = colorScale(
              feature.properties.Netflow_Ratio
            );
          } else {
            feature.properties.color = "grey";
          }
        });

        let labelData;
        if (
          this.previousGeojsonData &&
          this.calculateBoundarySimilarity(
            this.previousGeojsonData,
            mergedData
          ) > this.similarityThreshold
        ) {
          labelData = this.previousLabelData;
          console.log(`Reusing labels from previous year for ${year}`);
        } else {
          labelData = this.prepareLabelData(mergedData, nameField);
          this.previousLabelData = labelData;
          this.previousGeojsonData = mergedData;
          console.log(`Generated new labels for year ${year}`);
        }

        if (this.map.getSource("us-boundaries")) {
          this.map.getSource("us-boundaries").setData(mergedData);
          this.map.getSource("us-boundaries-labels").setData(labelData);
        } else {
          this.map.addSource("us-boundaries", {
            type: "geojson",
            data: mergedData,
          });
          this.map.addLayer({
            id: "us-boundaries-layer",
            type: "fill",
            source: "us-boundaries",
            layout: {
              visibility: "visible",
            },
            paint: {
              "fill-color": ["get", "color"],
              "fill-outline-color": "rgba(200, 200, 200, 0.5)",
              "fill-antialias": true,
            },
          });
          this.map.addLayer({
            id: "us-boundaries-outline-layer",
            type: "line",
            source: "us-boundaries",
            layout: {},
            paint: {
              "line-color": "black",
              "line-width": 0.3,
            },
          });
          this.map.addSource("us-boundaries-labels", {
            type: "geojson",
            data: labelData,
          });
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
      })
      .catch((error) =>
        console.error("Error loading shapefile or CSV data:", error)
      );
  },

  // ============================================================================
  // LEGEND UTILITIES
  // ============================================================================
  toggleLegendVisibility: function (visible) {
    if (typeof LegendManager !== "undefined") {
      if (visible) {
        LegendManager.show("maps-legends");
      } else {
        LegendManager.hide("maps-legends");
      }
    } else {
      // Fallback to manual toggle if LegendManager not available
      const legend = document.getElementById("maps-legends");
      if (legend) {
        legend.style.display = visible ? "block" : "none";
      }
    }
  },

  // Method to update legend when year changes (call this from your slider)
  onYearChange: function (year) {
    this.loadShapefile(year);
  },

  addTooltipHandler: function () {
    const tooltip = d3.select("#tooltip-migration");

    // Remove existing highlight layers if they exist
    if (this.map.getLayer("highlight-line-layer")) {
      this.map.removeLayer("highlight-line-layer");
    }
    if (this.map.getSource("highlight-source")) {
      this.map.removeSource("highlight-source");
    }

    // Add a new source for the highlight effect
    this.map.addSource("highlight-source", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    this.map.on("mousemove", "us-boundaries-layer", (e) => {
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ["us-boundaries-layer"],
      });

      if (features.length > 0) {
        const feature = features[0];
        let geometry = feature.geometry;
        if (!geometry) return;

        let geojsonFeature;
        if (geometry.type === "MultiPolygon") {
          geojsonFeature = {
            type: "FeatureCollection",
            features: geometry.coordinates.map((coords) => ({
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: coords,
              },
              properties: feature.properties,
            })),
          };
        } else {
          geojsonFeature = {
            type: "FeatureCollection",
            features: [feature],
          };
        }

        // Update the highlight layer with the new geometry
        this.map.getSource("highlight-source").setData(geojsonFeature);

        // 🔥 Ensure tooltip still works
        const name =
          feature.properties.STATENAM || feature.properties.LABEL || "Unknown";
        const netflowRatio = feature.properties.Netflow_Ratio;

        const tooltipContent =
          isNaN(netflowRatio) || netflowRatio === null
            ? `Data for ${name} is unavailable`
            : `${name} has a netflow of ${(netflowRatio * 100).toFixed(1)}%`;

        tooltip
          .style("opacity", 1)
          .html(tooltipContent)
          .style("left", `${e.originalEvent.pageX + 10}px`)
          .style("top", `${e.originalEvent.pageY + 10}px`);

        // 🔥 Remove and re-add line layer (only the outline)
        setTimeout(() => {
          if (this.map.getLayer("highlight-line-layer")) {
            this.map.removeLayer("highlight-line-layer");
          }

          this.map.addLayer({
            id: "highlight-line-layer",
            type: "line",
            source: "highlight-source",
            layout: {},
            paint: {
              "line-color": "#ff0000",
              "line-width": 2,
              "line-opacity": 1,
            },
          });
        }, 100);
      }
    });

    this.map.on("mouseleave", "us-boundaries-layer", () => {
      tooltip.style("opacity", 0);
      this.map.getSource("highlight-source").setData({
        type: "FeatureCollection",
        features: [],
      });
    });
  },
};

document.addEventListener("DOMContentLoaded", function () {
  // Initialize LegendManager metadata first
  if (typeof LegendManager !== "undefined") {
    LegendManager.loadAllMetadata()
      .then(() => {
        console.log(
          "📊 All legend metadata loaded, starting migration namespace"
        );
        migrationNamespace.init();
      })
      .catch((error) => {
        console.warn(
          "⚠️ Could not load legend metadata, continuing anyway:",
          error
        );
        migrationNamespace.init();
      });
  } else {
    console.warn(
      "LegendManager not found, starting migration namespace without metadata"
    );
    migrationNamespace.init();
  }
});
