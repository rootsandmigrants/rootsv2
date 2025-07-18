// This Pop up is for races that do not have any data for a particular year
function ensureCustomPopupExists() {
  console.log("ensureCustomPopupExists called");
  let customPopup = document.getElementById("no-data-popup-custom");
  if (!customPopup) {
    console.log("Creating custom popup...");
    customPopup = document.createElement("div");
    customPopup.id = "no-data-popup-custom";
    customPopup.className = "popup-custom";
    customPopup.innerHTML = `
      <div class="popup-content-custom">
        <span class="close-button-custom">&times;</span>
        <p>No data for this year</p>
      </div>`;
    document.body.appendChild(customPopup);
  } else {
    console.log("Custom popup already exists");
  }
  customPopup.style.display = "block";
}

function showCustomPopup(message) {
  console.log("showCustomPopup called with message:", message);
  ensureCustomPopupExists();
  const customPopup = document.getElementById("no-data-popup-custom");
  const popupMessage = customPopup.querySelector("p");

  d3.select("#race-overlay-tooltip")
    .style("opacity", 0)
    .style("display", "none");

  if (!customPopup || !popupMessage) {
    console.error("Custom popup elements not found.");
    return;
  }

  popupMessage.textContent = message;
  customPopup.style.display = "block";

  const closeButton = customPopup.querySelector(".close-button-custom");
  closeButton.onclick = () => {
    customPopup.style.display = "none";
  };

  customPopup.onclick = (e) => {
    if (e.target === customPopup) {
      customPopup.style.display = "none";
    }
  };

  setTimeout(() => {
    customPopup.style.display = "none";
  }, 1500);
}

function hideTooltip() {
  if (typeof tooltip !== "undefined") {
    tooltip.style("display", "none").style("opacity", 0);
    tooltip.html("");
  }
  console.log("Tooltip hidden.");
}

function disableDensityTooltip() {
  if (tooltipEnabled && raceOverlayNamespace.map) {
    raceOverlayNamespace.map.off("mousemove", "polygon-layer");
    raceOverlayNamespace.map.off("click", "polygon-layer");
    raceOverlayNamespace.map.off("mouseleave", "polygon-layer");
    if (typeof tooltip !== "undefined") {
      tooltip.style("opacity", 0).style("display", "none");
    }
    tooltipEnabled = false;
    console.log("Tooltip event listeners removed.");
  }
}

let tooltipEnabled = false;

function enableDensityTooltip() {
  console.log("Enabling tooltip for density map...");
  if (!tooltipEnabled && raceOverlayNamespace.map) {
    tooltipEnabled = true;
    raceOverlayNamespace.map.on("mousemove", "polygon-layer", (e) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        if (
          feature.properties &&
          feature.properties.NHGISNAM &&
          feature.properties.popDensity &&
          typeof tooltip !== "undefined"
        ) {
          const popDensity = feature.properties.popDensity.toFixed(2);
          const name = feature.properties.NHGISNAM;
          tooltip
            .style("opacity", 1)
            .style("display", "block")
            .html(`${name} has a population density of ${popDensity} per sq km`)
            .style("left", `${e.originalEvent.pageX + 10}px`)
            .style("top", `${e.originalEvent.pageY + 10}px`);
        } else {
          console.warn("Feature properties missing or incomplete:", feature);
        }
      }
    });

    raceOverlayNamespace.map.on("click", "polygon-layer", () => {
      if (typeof tooltip !== "undefined") {
        tooltip.style("opacity", 0).style("display", "none");
      }
    });

    raceOverlayNamespace.map.on("mouseleave", "polygon-layer", () => {
      if (typeof tooltip !== "undefined") {
        tooltip.style("opacity", 0).style("display", "none");
      }
    });

    console.log("Tooltip event listeners added.");
  } else {
    console.log("Tooltip is already enabled or map not available.");
  }
}

function updateLayerVisualState() {
  document.querySelectorAll(".layer-checkbox").forEach((div) => {
    div.classList.remove("active");
  });

  const checkedRadio = document.querySelector(
    'input[name="population-layer"]:checked'
  );
  if (checkedRadio) {
    checkedRadio.closest(".layer-checkbox").classList.add("active");
  }
}

const raceOverlayNamespace = {
  map: null,
  raceTooltip: null,
  subsetConfig: {},
  dataFiles: {},
  configsLoaded: false,
  loadedYear: null,
  tooltip: null,
  loadedSubsets: new Set(),

  // ============================================================================
  // INITIALIZATION - Load JSON configurations
  // ============================================================================
  async init() {
    try {
      console.log("🔄 Starting to load race configurations...");

      const [subsetResponse, dataFilesResponse] = await Promise.all([
        fetch("assets/config/RaceDataConfig.json"),
        fetch("assets/config/RaceDataFiles.json"),
      ]);

      if (!subsetResponse.ok) {
        throw new Error(
          `Failed to load RaceDataConfig.json: ${subsetResponse.status}`
        );
      }
      if (!dataFilesResponse.ok) {
        throw new Error(
          `Failed to load RaceDataFiles.json: ${dataFilesResponse.status}`
        );
      }

      this.subsetConfig = await subsetResponse.json();
      this.dataFiles = await dataFilesResponse.json();

      console.log("📊 Loaded subsetConfig:", this.subsetConfig);
      console.log("📁 Loaded dataFiles:", this.dataFiles);

      this.configsLoaded = true;
      console.log("✅ Race configurations loaded successfully");

      this.setupEventListeners();

      console.log(
        "🎯 Showing default population density legend on initialization"
      );
      this.updateLegend(null);

      return Promise.resolve();
    } catch (error) {
      console.error("❌ Failed to load race configurations:", error);
      console.error("Make sure these files exist:");
      console.error("- assets/config/RaceDataConfig.json");
      console.error("- assets/config/RaceDataFiles.json");
      return Promise.reject(error);
    }
  },

  showDefaultLegend: function () {
    console.log("🔄 Manually showing default population density legend");
    this.updateLegend(null);
  },

  initRaceOverlays: function (map) {
    this.map = map;
    console.log("Race overlay namespace initialized with map:", this.map);

    if (!this.raceTooltip) {
      this.raceTooltip = d3
        .select("body")
        .append("div")
        .attr("id", "race-overlay-tooltip")
        .style("position", "absolute")
        .style("display", "none")
        .style("pointer-events", "none");

      console.log("Race overlay tooltip initialized.");
    }

    if (!this.map.getSource("highlighted-race-outline")) {
      this.map.addSource("highlighted-race-outline", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      this.map.addLayer({
        id: "highlight-race-outline-layer",
        type: "line",
        source: "highlighted-race-outline",
        layout: {},
        paint: {
          "line-color": "#ff0000",
          "line-width": 3,
          "line-opacity": 1,
        },
      });

      console.log("Race outline highlight layer added.");
    }

    setTimeout(() => {
      if (this.map.getLayer("us-boundaries-labels-layer")) {
        this.map.moveLayer("us-boundaries-labels-layer");
        console.log("Label layer moved to the top after map load.");
      }
    }, 500);

    setTimeout(() => {
      this.map.moveLayer("highlight-race-outline-layer");
      console.log("Race outline highlight layer moved to top.");
    }, 500);

    const checkPolygonLayer = () => {
      if (this.map.getLayer("polygon-layer")) {
        this.map.setLayoutProperty("polygon-layer", "visibility", "visible");
        console.log("Polygon layer is now visible.");
      } else {
        console.warn("Polygon layer does not exist on the map.");
      }
    };
    checkPolygonLayer();

    if (this.map.getLayer("us-boundaries-labels-layer")) {
      this.map.moveLayer("us-boundaries-labels-layer");
      console.log("Label layer moved to the top after initialization.");
    }

    if (!this.map.getSource("race-data")) {
      this.map.addSource("race-data", {
        type: "geojson",
        data: null,
      });
      console.log("Source 'race-data' added.");
    }

    setTimeout(() => {
      this.map.moveLayer("highlight-race-outline-layer");
      console.log("Highlight outline layer moved to top.");
    }, 500);
  },

  updateDensityMapVisibility: function () {
    const raceLayerActive = this.loadedSubsets.size > 0;

    if (raceLayerActive) {
      if (this.map.getLayer("polygon-layer")) {
        this.map.removeLayer("polygon-layer");
        console.log("Polygon layer removed because a race layer is active.");
      }
      disableDensityTooltip();
    } else {
      if (!this.map.getLayer("polygon-layer")) {
        this.map.addLayer({
          id: "polygon-layer",
          type: "fill",
          paint: {
            "fill-color": "#969696",
            "fill-opacity": 0.6,
          },
        });
        console.log("Polygon layer restored.");
      }
      enableDensityTooltip();
    }
  },

  // ============================================================================
  // UPDATED LEGEND FUNCTION - Using LegendManager
  // ============================================================================
  updateLegend: function (subset) {
    console.log("🎨 updateLegend called with subset:", subset);

    const legendContainer = document.getElementById("density-legend");

    if (!legendContainer) {
      console.warn(
        "❌ Legend container 'density-legend' not found, skipping legend update"
      );
      return;
    } else {
      console.log("✅ Found legend container");
    }

    const slider = document.getElementById("slider");
    if (!slider) {
      console.warn("Slider not found, using default year");
      return;
    }

    const year = parseInt(slider.value, 10);
    const decadeStart = Math.floor(year / 10) * 10;
    console.log(`📅 Year: ${year}, Decade: ${decadeStart}-${decadeStart + 9}`);

    if (!subset) {
      // ✅ REPLACED: Use LegendManager for Population Density
      console.log("🔄 Using LegendManager for Population Density legend");
      LegendManager.create("populationDensity", "density-legend", { year });
      console.log(
        `✅ Population Density legend created for ${decadeStart}-${
          decadeStart + 9
        }`
      );
      return;
    }

    // ✅ REPLACED: Use LegendManager for Race legends
    console.log("🎯 Using LegendManager for race legend:", subset);
    console.log(
      "📊 Available subsetConfig keys:",
      Object.keys(this.subsetConfig)
    );

    const config = this.subsetConfig[subset];
    if (!config) {
      console.error(`❌ No configuration found for subset: ${subset}`);
      console.error("Available subsets:", Object.keys(this.subsetConfig));
      return;
    }

    console.log("✅ Found config for subset:", config);

    // Create race legend using LegendManager
    LegendManager.create("race", "density-legend", {
      subset,
      year,
      config,
    });

    console.log(
      `✅ Race legend created for subset: ${subset}, Year: ${decadeStart}-${
        decadeStart + 9
      }`
    );
  },

  removeRaceLayer: function (subset) {
    const layerId = `race-layer-${subset}`;
    const boundaryLayerId = `state-boundary-${subset}`;
    const sourceId = `race-data-${subset}`;

    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
      console.log(`Layer ${layerId} removed.`);
    }

    if (this.map.getLayer(boundaryLayerId)) {
      this.map.removeLayer(boundaryLayerId);
      console.log(`Boundary layer ${boundaryLayerId} removed.`);
    }

    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
      console.log(`Source ${sourceId} removed.`);
    }
  },

  removeAllRaceLayers: function () {
    this.loadedSubsets.forEach((subset) => {
      const layerId = `race-layer-${subset}`;
      const boundaryLayerId = `state-boundary-${subset}`;
      const sourceId = `race-data-${subset}`;

      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
        console.log(`Layer ${layerId} removed.`);
      }

      if (this.map.getLayer(boundaryLayerId)) {
        this.map.removeLayer(boundaryLayerId);
        console.log(`Boundary layer ${boundaryLayerId} removed.`);
      }

      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
        console.log(`Source ${sourceId} removed.`);
      }
    });

    this.loadedSubsets.clear();
    disableDensityTooltip();
    this.updateDensityMapVisibility();
    console.log("All race layers removed. Restoring default density map.");
  },

  loadRaceData: function (year, subset) {
    if (!this.configsLoaded) {
      console.warn("Race configurations not loaded yet");
      return Promise.reject(new Error("Configurations not loaded"));
    }

    const decadeStart = Math.floor(year / 10) * 10;
    console.log(
      `Loading race data for decade ${decadeStart}-${
        decadeStart + 9
      }, subset ${subset}...`
    );

    console.log("Checking for previously loaded race layers...");

    if (this.loadedSubsets.size > 0) {
      console.log(
        "Unloading currently loaded race layer(s) before loading a new one..."
      );
      this.removeAllRaceLayers();
    }

    const yearFiles = this.dataFiles[decadeStart];
    if (!yearFiles) {
      showCustomPopup(
        `No data available for the decade ${decadeStart}-${decadeStart + 9}.`
      );
      console.error(
        `No data files available for decade ${decadeStart}-${decadeStart + 9}`
      );

      const densityLegend = document.getElementById("density-legend");
      if (densityLegend) {
        densityLegend.style.display = "none";
      }

      if (this.map.getLayer("us-boundaries-labels-layer")) {
        this.map.setLayoutProperty(
          "us-boundaries-labels-layer",
          "visibility",
          "none"
        );
        console.log("Labels hidden due to missing map data.");
      }

      return Promise.reject(new Error("No data files available"));
    }

    const geojsonPath = yearFiles.shapefile;
    const csvPath = yearFiles.csv;

    return Promise.all([
      fetch(geojsonPath).then((res) => res.json()),
      d3.csv(csvPath),
    ])
      .then(([geojsonData, csvData]) => {
        console.log(
          `GeoJSON and CSV data for decade ${decadeStart}-${
            decadeStart + 9
          } loaded successfully.`
        );

        const readableSubset =
          this.subsetConfig[subset]?.readableName || subset;

        if (!csvData[0] || !(subset in csvData[0])) {
          showCustomPopup(
            `Data for the ${readableSubset} population is unavailable for ${decadeStart}-${
              decadeStart + 9
            }.`
          );
          console.warn(
            `No data found for the ${readableSubset} population in the decade ${decadeStart}-${
              decadeStart + 9
            }.`
          );

          const densityLegend = document.getElementById("density-legend");
          if (densityLegend) {
            densityLegend.style.display = "none";
          }

          // ✅ FIXED: Hide labels when no subset data
          if (this.map.getLayer("us-boundaries-labels-layer")) {
            this.map.setLayoutProperty(
              "us-boundaries-labels-layer",
              "visibility",
              "none"
            );
            console.log("Labels hidden due to missing subset data.");
          }

          return;
        }

        const csvLookup = {};
        csvData.forEach((row) => {
          row[subset] = parseFloat(row[subset]) || null;
          csvLookup[row.STATENAM] = row;
        });

        const hasData = csvData.some(
          (row) => row[subset] !== null && !isNaN(row[subset])
        );
        if (!hasData) {
          showCustomPopup(
            `No data available for the subset "${subset}" in the decade ${decadeStart}-${
              decadeStart + 9
            }.`
          );
          console.warn(
            `No data for subset "${subset}" in the decade ${decadeStart}-${
              decadeStart + 9
            }.`
          );

          const densityLegend = document.getElementById("density-legend");
          if (densityLegend) {
            densityLegend.style.display = "none";
          }

          // ✅ FIXED: Hide labels when no valid data
          if (this.map.getLayer("us-boundaries-labels-layer")) {
            this.map.setLayoutProperty(
              "us-boundaries-labels-layer",
              "visibility",
              "none"
            );
            console.log("Labels hidden due to no valid subset data.");
          }

          return;
        }

        geojsonData.features.forEach((feature) => {
          const stateName =
            feature.properties.LABEL || feature.properties.STATENAM;
          if (csvLookup[stateName]) {
            feature.properties = {
              ...feature.properties,
              [subset]: csvLookup[stateName][subset],
            };
          }
        });

        this.removeRaceLayer(subset);

        const sourceId = `race-data-${subset}`;
        this.map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });
        console.log(`Source ${sourceId} added.`);

        const layerId = `race-layer-${subset}`;
        const config = this.subsetConfig[subset];
        this.map.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", subset], null],
              "grey",
              [
                "step",
                ["get", subset],
                config.colors[0],
                config.thresholds[0],
                config.colors[1],
                config.thresholds[1],
                config.colors[2],
                config.thresholds[2],
                config.colors[3],
                config.thresholds[3],
                config.colors[4],
              ],
            ],
            "fill-opacity": 1,
          },
        });
        console.log(`Layer ${layerId} added.`);

        const boundaryLayerId = `state-boundary-${subset}`;
        this.map.addLayer({
          id: boundaryLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#000000",
            "line-width": 0.2,
          },
        });

        if (this.map.getLayer("us-boundaries-labels-layer")) {
          if (this.dataFiles[decadeStart]) {
            // ✅ FIXED: Restore label visibility AND move to top when data exists
            this.map.setLayoutProperty(
              "us-boundaries-labels-layer",
              "visibility",
              "visible"
            );
            this.map.moveLayer("us-boundaries-labels-layer");
            disableDensityTooltip();
            console.log(
              "Labels restored and moved to the top for valid race data."
            );
          } else {
            this.map.setLayoutProperty(
              "us-boundaries-labels-layer",
              "visibility",
              "none"
            );
            console.log("Labels hidden due to missing map data.");
          }
        }

        this.toggleRaceLayer(subset, true);

        const densityLegend = document.getElementById("density-legend");
        if (densityLegend) {
          densityLegend.style.display = "block";
        }

        return;
      })
      .catch((error) => {
        showCustomPopup(
          `Error loading data for decade ${decadeStart}-${decadeStart + 9}: ${
            error.message
          }`
        );

        const densityLegend = document.getElementById("density-legend");
        if (densityLegend) {
          densityLegend.style.display = "none";
        }

        // ✅ FIXED: Hide labels when error occurs
        if (this.map.getLayer("us-boundaries-labels-layer")) {
          this.map.setLayoutProperty(
            "us-boundaries-labels-layer",
            "visibility",
            "none"
          );
          console.log("Labels hidden due to data loading error.");
        }

        console.error("Error loading race data:", error);
      });
  },

  toggleRaceLayer: function (subset, visible) {
    const layerId = `race-layer-${subset}`;
    const boundaryLayerId = `state-boundary-${subset}`;

    console.log(`Toggling visibility for ${layerId}...`);

    if (!this.map.getLayer(layerId)) {
      console.error(`Layer ${layerId} does not exist.`);
      return;
    }

    this.map.setPaintProperty(layerId, "fill-opacity", visible ? 1 : 0);

    if (visible) {
      this.loadedSubsets.add(subset);
      disableDensityTooltip();

      if (this.map.getLayer(boundaryLayerId)) {
        this.map.setLayoutProperty(boundaryLayerId, "visibility", "visible");
        console.log(`Boundary layer ${boundaryLayerId} set to visible.`);
      } else {
        console.warn(`Boundary layer ${boundaryLayerId} does not exist.`);
      }

      this.map.moveLayer(boundaryLayerId);
      console.log(`Red border layer ${boundaryLayerId} moved to the top.`);

      this.map.on("mousemove", layerId, (e) => {
        const features = this.map.queryRenderedFeatures(e.point, {
          layers: [layerId],
        });

        if (features.length > 0) {
          const feature = features[0];

          let geojsonFeature;
          if (feature.geometry.type === "MultiPolygon") {
            geojsonFeature = {
              type: "FeatureCollection",
              features: feature.geometry.coordinates.map((coords) => ({
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

          this.map
            .getSource("highlighted-race-outline")
            .setData(geojsonFeature);

          const name = feature.properties.LABEL || feature.properties.STATENAM;
          const value = feature.properties[subset] || "No data";
          const readableSubset =
            this.subsetConfig[subset]?.readableName || subset;
          const tooltipContent =
            value !== "No data"
              ? `${name} has a ${value.toFixed(
                  2
                )}% ${readableSubset} population`
              : `Population data unavailable for ${readableSubset} in ${name}`;

          d3.select("#race-overlay-tooltip")
            .style("opacity", 1)
            .style("display", "block")
            .html(tooltipContent)
            .style("left", `${e.originalEvent.pageX + 10}px`)
            .style("top", `${e.originalEvent.pageY + 10}px`);

          setTimeout(() => {
            if (this.map.getLayer("highlight-race-outline-layer")) {
              this.map.removeLayer("highlight-race-outline-layer");
            }

            this.map.addLayer({
              id: "highlight-race-outline-layer",
              type: "line",
              source: "highlighted-race-outline",
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

      this.map.on("mouseleave", layerId, () => {
        d3.select("#race-overlay-tooltip")
          .style("opacity", 0)
          .style("display", "none");

        this.map.getSource("highlighted-race-outline").setData({
          type: "FeatureCollection",
          features: [],
        });
      });

      if (this.map.getLayer("us-boundaries-labels-layer")) {
        this.map.moveLayer("us-boundaries-labels-layer");
        console.log("Label layer moved to the top.");
      }

      this.updateLegend(subset);
    } else {
      this.loadedSubsets.delete(subset);

      this.map.off("mousemove", layerId);
      this.map.off("mouseleave", layerId);

      if (this.map.getLayer(boundaryLayerId)) {
        this.map.setLayoutProperty(boundaryLayerId, "visibility", "none");
        console.log(`Boundary layer ${boundaryLayerId} hidden.`);
      }

      this.map.getSource("highlighted-race-outline").setData({
        type: "FeatureCollection",
        features: [],
      });
    }

    if (this.loadedSubsets.size === 0) {
      console.log("No race layers active. Restoring default map.");
      this.map.setLayoutProperty("polygon-layer", "visibility", "visible");
      enableDensityTooltip();
      this.updateLegend(null);
    }

    // ✅ UPDATED: Use densityNamespace method for county search control
    if (visible) {
      densityNamespace.toggleCountySearchVisibility(false); // Hide for race layers
    } else if (raceOverlayNamespace.loadedSubsets.size === 0) {
      densityNamespace.toggleCountySearchVisibility(true); // Show when back to default
    }

    console.log(
      `Layer ${layerId} visibility set to ${visible ? "visible" : "hidden"}.`
    );
  },

  // ============================================================================
  // EVENT LISTENER SETUP - UPDATED WITH COUNTY SEARCH CONTROL AND LABEL RESTORATION
  // ============================================================================
  setupEventListeners: function () {
    if (!this.configsLoaded) {
      console.warn(
        "⚠️ Configurations not loaded, skipping event listener setup"
      );
      return;
    }

    console.log("🎯 Setting up event listeners...");

    document
      .querySelectorAll('input[name="population-layer"]')
      .forEach((radio) => {
        radio.addEventListener("change", function () {
          const slider = document.getElementById("slider");
          const year = slider ? slider.value : 1790;

          if (this.id === "population-density") {
            console.log("Density mode selected");

            raceOverlayNamespace.removeAllRaceLayers();
            raceOverlayNamespace.updateLegend(null);

            if (
              raceOverlayNamespace.map &&
              raceOverlayNamespace.map.getLayer("polygon-layer")
            ) {
              raceOverlayNamespace.map.setLayoutProperty(
                "polygon-layer",
                "visibility",
                "visible"
              );
            }

            // ✅ FIXED: Restore label visibility when switching back to density
            if (
              raceOverlayNamespace.map &&
              raceOverlayNamespace.map.getLayer("us-boundaries-labels-layer")
            ) {
              raceOverlayNamespace.map.setLayoutProperty(
                "us-boundaries-labels-layer",
                "visibility",
                "visible"
              );
              console.log("Labels restored for density mode.");
            }

            enableDensityTooltip();

            try {
              showTrailRailUI();
            } catch (e) {
              console.warn("showTrailRailUI not available:", e);
            }

            // ✅ UPDATED: Show county search for population density
            densityNamespace.toggleCountySearchVisibility(true);

            d3.select("#race-overlay-tooltip")
              .style("opacity", 0)
              .style("display", "none");
          } else {
            const subset = this.id;
            console.log(`Race mode selected: ${subset}`);

            disableDensityTooltip();
            hideTooltip();

            if (typeof tooltip !== "undefined") tooltip.style.display = "none";
            d3.select("#tooltip").style("opacity", 0).style("display", "none");

            if (raceOverlayNamespace.map) {
              raceOverlayNamespace.map.off("mousemove", "polygon-layer");
              raceOverlayNamespace.map.off("mouseleave", "polygon-layer");
              raceOverlayNamespace.map.off("click", "polygon-layer");
            }

            if (
              raceOverlayNamespace.map &&
              raceOverlayNamespace.map.getLayer("polygon-layer")
            ) {
              raceOverlayNamespace.map.setLayoutProperty(
                "polygon-layer",
                "visibility",
                "none"
              );
            }

            raceOverlayNamespace.loadRaceData(year, subset);
            raceOverlayNamespace.updateLegend(subset);

            const densityOverlay = document.getElementById(
              "layer-icon-container-population"
            );
            if (densityOverlay) {
              densityOverlay.style.display = "block";
            }

            try {
              hideTrailRailUI();
              clearTrailAndRailLayers();
            } catch (e) {
              console.warn("Trail/rail functions not available:", e);
            }

            // ✅ UPDATED: Hide county search for race layers
            densityNamespace.toggleCountySearchVisibility(false);
          }

          updateLayerVisualState();
        });
      });

    document.querySelectorAll(".layer-checkbox").forEach((div) => {
      div.addEventListener("click", function (e) {
        const radio = this.querySelector('input[type="radio"]');
        const label = this.querySelector("label");

        if (e.target === this || (!label && e.target !== radio)) {
          if (radio && !radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change"));
          }
        }
      });
    });

    const densityLabel = document.querySelector(
      'label[for="population-density"]'
    );
    if (densityLabel) {
      densityLabel.addEventListener("click", function () {
        const radio = document.getElementById("population-density");
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change"));
        }
      });
    }

    document.getElementById("slider").addEventListener("input", function () {
      const year = parseInt(this.value, 10);
      const decadeStart = Math.floor(year / 10) * 10;

      console.log(
        `Year slider changed to: ${year}, Decade: ${decadeStart}-${
          decadeStart + 9
        }`
      );

      const checkedRadio = document.querySelector(
        'input[name="population-layer"]:checked'
      );

      if (checkedRadio && checkedRadio.id === "population-density") {
        console.log("Slider: Density mode active, loading density data");

        try {
          densityNamespace.loadMapData(year);
          raceOverlayNamespace.updateLegend(null);

          // ✅ FIXED: Ensure labels are visible for density mode
          if (
            raceOverlayNamespace.map &&
            raceOverlayNamespace.map.getLayer("us-boundaries-labels-layer")
          ) {
            raceOverlayNamespace.map.setLayoutProperty(
              "us-boundaries-labels-layer",
              "visibility",
              "visible"
            );
            console.log("Labels restored for density mode.");
          }

          densityNamespace.toggleCountySearchVisibility(true);

          enableDensityTooltip();
          showTrailRailUI();

          d3.select(".tooltip").style("z-index", 10).style("display", "block");
          d3.select("#race-overlay-tooltip")
            .style("z-index", 5)
            .style("display", "none");
        } catch (e) {
          console.error("Error in density mode slider handler:", e);
        }
      } else if (checkedRadio) {
        const subset = checkedRadio.id;
        console.log(
          `Slider: Race mode active (${subset}), loading race data only`
        );

        try {
          raceOverlayNamespace.loadRaceData(decadeStart, subset);

          if (typeof tooltip !== "undefined") {
            tooltip.style("display", "none").style("opacity", 0);
          }
          d3.select("#tooltip").style("opacity", 0).style("display", "none");

          d3.select("#race-overlay-tooltip")
            .style("z-index", 10)
            .style("display", "block");
          d3.select(".tooltip").style("z-index", 5).style("display", "none");

          // ✅ UPDATED: Ensure county search is hidden for race
          densityNamespace.toggleCountySearchVisibility(false);

          const trailRailWrapper = document.getElementById(
            "trail-rail-checkboxes"
          );
          if (trailRailWrapper) {
            trailRailWrapper.classList.add("hidden");
          }
        } catch (e) {
          console.error("Error in race mode slider handler:", e);
        }
      }

      updateLayerVisualState();
    });

    console.log("✅ Event listeners set up successfully");
  },
};

function hideTrailRailUI() {
  const wrapper = document.getElementById("trail-rail-checkboxes");
  if (wrapper) wrapper.classList.add("hidden");

  try {
    if (typeof railroadsNamespace !== "undefined") {
      railroadsNamespace.removeAllLayers();
    }
  } catch (e) {
    console.warn("railroadsNamespace not available:", e);
  }
}

function showTrailRailUI() {
  const wrapper = document.getElementById("trail-rail-checkboxes");
  if (wrapper) wrapper.classList.remove("hidden");

  try {
    const year = document.getElementById("slider").value;
    const railroadCheckbox = document.getElementById("railroads");
    if (
      railroadCheckbox &&
      railroadCheckbox.checked &&
      typeof railroadsNamespace !== "undefined"
    ) {
      railroadsNamespace.loadRailroads(year);
    }
  } catch (e) {
    console.warn("Trail/rail functionality not available:", e);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM Content Loaded - initializing race overlay...");

  const densityRadio = document.getElementById("population-density");
  if (densityRadio) {
    densityRadio.checked = true;
    updateLayerVisualState();
    console.log("✅ Density radio button set as default");
  }

  raceOverlayNamespace
    .init()
    .then(() => {
      console.log("🎯 Race overlay initialized - showing default legend");

      setTimeout(() => {
        raceOverlayNamespace.updateLegend(null);
      }, 100);

      setTimeout(() => {
        const legendContainer = document.getElementById("density-legend");
        if (legendContainer && legendContainer.innerHTML.trim() === "") {
          console.log("🔄 Legend still empty, trying fallback...");
          raceOverlayNamespace.showDefaultLegend();
        }
      }, 500);
    })
    .catch((error) => {
      console.error("❌ Failed to initialize race overlay:", error);
    });
});
