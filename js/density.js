const tooltip = d3.select("#tooltip");
let allCountyNames = [];

const densityNamespace = {
  map: null, // Placeholder for the map instance
  configsLoaded: true, // Always true since we have hardcoded data
  shapefiles: {
    1790: "geojson/states1790den.json",
    1800: "geojson/harvard-nhgis-pop1800-geojson.json",
    1810: "geojson/harvard-nhgis-pop1810-geojson.json",
    1820: "geojson/harvard-nhgis-pop1820-geojson.json",
    1830: "geojson/harvard-nhgis-pop1830-geojson.json",
    1840: "geojson/harvard-nhgis-pop1840-geojson.json",
    1850: "geojson/harvard-nhgis-pop1850-geojson.json",
    1860: "geojson/harvard-nhgis-pop1860-geojson.json",
    1870: "geojson/harvard-nhgis-pop1870-geojson.json",
    1880: "geojson/harvard-nhgis-pop1880-geojson.json",
    1890: "geojson/harvard-nhgis-pop1890-geojson.json",
    1900: "geojson/harvard-nhgis-pop1900-geojson.json",
    1910: "geojson/harvard-nhgis-pop1910-geojson.json",
    1920: "geojson/harvard-nhgis-pop1920-geojson.json",
    1930: "geojson/harvard-nhgis-pop1930-geojson.json",
    1940: "geojson/harvard-nhgis-pop1940-geojson.json",
    1950: "geojson/harvard-nhgis-pop1950-geojson.json",
    1960: "geojson/harvard-nhgis-pop1960-geojson.json",
    1970: "geojson/harvard-nhgis-pop1970-geojson.json",
    1980: "geojson/harvard-nhgis-pop1980-geojson.json",
    1990: "geojson/harvard-nhgis-pop1990-geojson.json",
  },
  previousLabelData: null,
  previousGeojsonData: null,
  similarityThreshold: 0.95, // Adjust this threshold as needed

  // ============================================================================
  // COUNTY SEARCH VISIBILITY CONTROL
  // ============================================================================
  // ✅ CORRECTED VERSION - Shows only button initially
  // ✅ FIXED VERSION - Properly resets input display for button handler
  toggleCountySearchVisibility: function (show) {
    const countySearchButton = document.getElementById(
      "county-search-icon-button"
    );
    const countySearchInput = document.getElementById("county-search-input");
    const countySuggestions = document.getElementById("county-suggestions");
    const searchWrapper = document.getElementById("search-wrapper");

    if (show) {
      // Show county search for population density - BUTTON ONLY initially
      if (searchWrapper) {
        searchWrapper.style.display = "block";
        searchWrapper.classList.remove("hidden");
        searchWrapper.classList.remove("expanded"); // ✅ Ensure it starts collapsed
      }
      if (countySearchButton) countySearchButton.style.display = "block";

      // ✅ IMPORTANT: Reset input display but don't show it initially
      // This allows the button click handler to control visibility via CSS classes
      if (countySearchInput) countySearchInput.style.display = "";
      if (countySuggestions) countySuggestions.style.display = "none";

      console.log("County search enabled for population density");
    } else {
      // Hide county search for race layers
      if (searchWrapper) {
        searchWrapper.style.display = "none";
        searchWrapper.classList.add("hidden");
        searchWrapper.classList.remove("expanded"); // ✅ Reset expansion state
      }
      if (countySearchButton) countySearchButton.style.display = "none";
      if (countySearchInput) countySearchInput.style.display = "none";
      if (countySuggestions) countySuggestions.style.display = "none";
      console.log("County search disabled for race layers");
    }
  },

  // Helper method to check if data is available for a specific year
  hasDataForYear(year) {
    return this.shapefiles[year] !== undefined;
  },

  // Helper method to trigger slider update when needed
  triggerSliderUpdate() {
    // Check if the slider's generateTicks function exists and call it
    if (typeof generateTicks === "function") {
      setTimeout(() => generateTicks(), 100);
    }
    // Alternative: dispatch a custom event that the slider can listen for
    document.dispatchEvent(new CustomEvent("densityConfigsLoaded"));
  },

  // Method to get available years for debugging/info
  getAvailableYears() {
    return Object.keys(this.shapefiles)
      .map((year) => parseInt(year))
      .sort((a, b) => a - b);
  },

  init: function () {
    console.log("Initializing densityNamespace");
    console.log("Available years:", this.getAvailableYears());

    this.map = new maplibregl.Map({
      container: "mapDen",
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
              '<a href="https://www.esri.com/" target="_blank">Esri</a>| <a href="https://www.nhgis.org/" target="_blank">IPUMS NHGIS</a>',
          },
        },
        // This is your glyphs endpoint
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
              "raster-opacity": 0.2,
            },
          },
        ],
      },
      center: [-98.35, 39.5],
      zoom: 4,
      minZoom: 2, // Prevents zooming out too much
      maxZoom: 7, // Prevents zooming in too much
    });
    console.log("Map instance created:", this.map);

    // Wait for the map to load
    this.map.on("load", () => {
      console.log("Map loaded, initializing components...");

      this.loadMapData(1607); // Load initial data (first available year)

      this.addControls(); // Add scale and zoom controls
      this.addZoomToExtentButton(); // Add zoom-to-extent button

      // Pass the map instance to raceOverlayNamespace
      if (typeof raceOverlayNamespace !== "undefined") {
        raceOverlayNamespace.initRaceOverlays(this.map);
        console.log("Race overlay namespace initialized with map instance.");
      } else {
        console.warn("raceOverlayNamespace is not defined.");
      }

      // Trigger slider update after initialization
      this.triggerSliderUpdate();
    });
  },

  unloadMapData: function () {
    // Remove existing map layers and sources
    const layersToRemove = [
      "polygon-layer",
      "highlight-outline-layer",
      "us-boundaries-labels-layer",
    ];
    const sourcesToRemove = ["polygons", "highlighted-outline", "labels"];

    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    sourcesToRemove.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });

    // Clear previous data
    this.previousGeojsonData = null;
    this.previousLabelData = null;
    allCountyNames = [];

    // Clear legend year
    const legendYear = document.getElementById("legend-year-density");
    if (legendYear) {
      legendYear.textContent = "";
    }

    // Hide the density legend
    const densityLegend = document.getElementById("density-legend");
    if (densityLegend) {
      densityLegend.style.display = "none";
    }
    const densityOverlay = document.getElementById(
      "layer-icon-container-population"
    );
    if (densityOverlay) {
      densityOverlay.style.display = "none";
    }

    // ✅ UPDATED: Use the new method to hide county search
    this.toggleCountySearchVisibility(false);

    console.log("Map data, overlay and legend unloaded");
  },

  addControls: function () {
    const scaleControl = new maplibregl.ScaleControl({
      maxWidth: 80,
      unit: "metric",
    });
    this.map.addControl(scaleControl, "bottom-left");
    const zoomControl = new maplibregl.NavigationControl();
    this.map.addControl(zoomControl, "bottom-right"); // Add zoom control to the top-left corner
  },

  extractCountyNames: function (data) {
    const rawNames = data.features
      .map((f) => f.properties.NHGISNAM?.trim())
      .filter(Boolean);
    allCountyNames = [...new Set(rawNames)].sort();
    // console.log("Loaded counties:", allCountyNames); // debug
  },

  addZoomToExtentButton: function () {
    const button = document.createElement("button");
    button.className = "zoom-to-extent-button";
    button.innerHTML = '<img src="img/extent.png" alt="Zoom to Extent">';
    const tooltipzoom = document.createElement("div");
    tooltipzoom.className = "zoom-to-extent-tooltip";
    tooltipzoom.textContent = "Zoom to Extent";
    tooltipzoom.style.visibility = "hidden"; // Start hidden

    button.addEventListener("mouseenter", () => {
      tooltipzoom.style.visibility = "visible"; // Show tooltip on hover
    });

    button.addEventListener("mouseleave", () => {
      tooltipzoom.style.visibility = "hidden"; // Hide tooltip when not hovering
    });
    button.addEventListener("click", () => {
      this.map.flyTo({
        center: [-98.35, 39.5], // Adjust the coordinates as needed
        zoom: 4, // Adjust the zoom level as needed
        pitch: 0,
        bearing: 0,
        essential: true, // This animation is considered essential with respect to prefers-reduced-motion
      });
    });
    button.appendChild(tooltipzoom);
    // Append the button to the map container
    this.map.getContainer().appendChild(button);
  },

  getNameFields: function (data) {
    const stateNameField = "STATENAM";
    const countyNameField = "NHGISNAM";
    const properties = data.features[0].properties;
    if (
      !properties.hasOwnProperty(stateNameField) ||
      !properties.hasOwnProperty(countyNameField)
    ) {
      console.error("Required fields not found in the data.");
      return null;
    }

    return { stateNameField, countyNameField };
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

  prepareLabelData: function (data, fields) {
    const stateGroups = data.features.reduce((acc, feature) => {
      const stateName = feature.properties[fields.stateNameField];
      const countyName = feature.properties[fields.countyNameField];
      const centroid = this.getCentroid(feature.geometry);
      if (!acc[stateName]) {
        acc[stateName] = [];
      }
      acc[stateName].push({
        type: "Feature",
        properties: {
          name: stateName,
          county: countyName,
        },
        geometry: {
          type: "Point",
          coordinates: centroid,
        },
      });
      return acc;
    }, {});

    const labelFeatures = Object.values(stateGroups).map((features) => {
      const sortedFeatures = features.sort((a, b) => {
        return (
          a.geometry.coordinates[0] - b.geometry.coordinates[0] ||
          a.geometry.coordinates[1] - b.geometry.coordinates[1]
        );
      });
      const middleIndex = Math.floor(sortedFeatures.length / 2);
      return sortedFeatures[middleIndex];
    });

    return {
      type: "FeatureCollection",
      features: labelFeatures,
    };
  },

  calculatePopulationDensity: function (data) {
    data.features.forEach((feature) => {
      const popTotal = feature.properties.POP_TOTAL;
      const areaSqm = feature.properties.AREA_SQM;

      const areaSqkm = areaSqm / 1000000;

      console.log(
        `Feature: ${feature.properties.STATENAM}, POP_TOTAL: ${popTotal}, AREA_SQKM: ${areaSqkm}`
      );

      if (popTotal && areaSqkm && areaSqkm > 0) {
        feature.properties.popDensity = popTotal / areaSqkm;
      } else {
        feature.properties.popDensity = 0;
        console.log(`Invalid data for ${feature.properties.STATENAM}`);
      }
    });
  },
  getColorScale: function (densities, numClasses) {
    // Fixed thresholds to match your legend: 0-2, 2-4, 4-8, 8-12, >12
    const thresholds = [2, 10, 50, 200]; // 0-2, 2-10, 10-50, 50-200, >200
    // Use ColorBrewer Greys - this will give you 5 colors for numClasses = 5
    const scale = d3
      .scaleThreshold()
      .domain(thresholds)
      .range(colorbrewer.Greys[numClasses]);

    // Create intervals for legend/debugging
    const intervals = [];
    for (let i = 0; i <= thresholds.length; i++) {
      const intervalStart = i === 0 ? 0 : thresholds[i - 1];
      const intervalEnd = i === thresholds.length ? "∞" : thresholds[i];
      const color = colorbrewer.Greys[numClasses][i];
      intervals.push({ intervalStart, intervalEnd, color });
    }

    console.log("Fixed Intervals:", intervals);

    return {
      scale: (value) => {
        // Use your legend's null color for non-enumerated (0 or NaN) values
        return value > 0 && !isNaN(value) ? scale(value) : "#F0E6D6";
      },
      intervals: intervals,
    };
  },

  calculateBoundarySimilarity: function (geojson1, geojson2) {
    function isValidGeoJSON(geojson) {
      return (
        geojson &&
        geojson.type === "FeatureCollection" &&
        geojson.features &&
        geojson.features.length > 0
      );
    }

    if (!isValidGeoJSON(geojson1) || !isValidGeoJSON(geojson2)) {
      console.error("Invalid GeoJSON data:", geojson1, geojson2);
      return 0; // Return 0 similarity if data is invalid
    }
    const area1 = turf.area(geojson1);
    const area2 = turf.area(geojson2);
    let intersectionArea = 0;
    try {
      const intersection = turf.intersect(geojson1, geojson2);
      intersectionArea = intersection ? turf.area(intersection) : 0;
    } catch (e) {
      console.error("Error calculating intersection:", e);
      console.log("geojson1:", geojson1);
      console.log("geojson2:", geojson2);
    }
    return intersectionArea / Math.min(area1, area2);
  },

  loadMapData: function (year) {
    // Check if data is available for the requested year
    if (!this.hasDataForYear(year)) {
      console.log(`No density data available for year: ${year}`);

      // Only unload if we're in density mode
      const checkedRadio = document.querySelector(
        'input[name="population-layer"]:checked'
      );
      if (checkedRadio && checkedRadio.id === "population-density") {
        this.unloadMapData(); // Unload any existing map data
      }
      return;
    }

    const url = this.shapefiles[year];

    console.log(`Fetching density data for year: ${year} from ${url}`);

    d3.json(url)
      .then((data) => {
        console.log(`Density data fetched for year: ${year}`, data);

        const fields = this.getNameFields(data);
        if (!fields) {
          console.error("Required name fields not found in the data.");
          return;
        }
        this.previousGeojsonData = data; // make sure this is before search uses it
        this.extractCountyNames(data); // <<== ✅ Add this here
        this.calculatePopulationDensity(data);
        const densities = data.features.map(
          (feature) => feature.properties.popDensity
        );
        const colorInfo = this.getColorScale(densities, 5);
        data.features.forEach((feature) => {
          feature.properties.color = colorInfo.scale(
            feature.properties.popDensity
          );
        });
        let labelData;
        if (
          this.previousGeojsonData &&
          this.calculateBoundarySimilarity(this.previousGeojsonData, data) >
            this.similarityThreshold
        ) {
          labelData = this.previousLabelData;
          console.log(`Reusing labels from previous year for ${year}`);
        } else {
          labelData = this.prepareLabelData(data, fields);
          this.previousLabelData = labelData;
          this.previousGeojsonData = data;
          console.log(`Generated new labels for year ${year}`);
        }
        if (this.map.getSource("polygons")) {
          this.map.getSource("polygons").setData(data);
        } else {
          this.map.addSource("polygons", {
            type: "geojson",
            data: data,
          });
          this.map.addLayer({
            id: "polygon-layer",
            type: "fill",
            source: "polygons",
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": 0.9,
              "fill-outline-color": "rgba(78, 76, 76, 0.1)",
            },
          });
          if (!this.map.getSource("highlighted-outline")) {
            this.map.addSource("highlighted-outline", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [],
              },
            });

            this.map.addLayer({
              id: "highlight-outline-layer",
              type: "line",
              source: "highlighted-outline",
              paint: {
                "line-color": "#ff0000",
                "line-width": 2,
                "line-opacity": 1,
              },
            });
          }
          this.map.on("mousemove", "polygon-layer", (e) => {
            if (e.features.length > 0) {
              const feature = e.features[0];
              const name = feature.properties.NHGISNAM;
              const rawDensity = feature.properties.popDensity;
              const density = parseFloat(rawDensity); // parse once

              tooltip
                .style("opacity", 1)
                .html(
                  isNaN(density) || density === 0
                    ? `${name}: Population data unavailable or not enumerated`
                    : `${name} has a population density of ${density.toFixed(
                        2
                      )} per sqkm`
                )
                .style("left", `${e.originalEvent.pageX + 10}px`)
                .style("top", `${e.originalEvent.pageY + 10}px`);

              this.map.getSource("highlighted-outline").setData({
                type: "FeatureCollection",
                features: [feature],
              });
            }
          });

          this.map.on("mouseleave", "polygon-layer", () => {
            tooltip.style("opacity", 0);

            // Remove the highlight by setting an empty feature collection
            this.map.getSource("highlighted-outline").setData({
              type: "FeatureCollection",
              features: [],
            });
          });
        }
        if (this.map.getSource("labels")) {
          this.map.getSource("labels").setData(labelData);
        } else {
          this.map.addSource("labels", {
            type: "geojson",
            data: labelData,
          });
          this.map.addLayer({
            id: "us-boundaries-labels-layer",
            type: "symbol",
            source: "labels",
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

        // Only update density legend elements if we're in density mode
        const checkedRadio = document.querySelector(
          'input[name="population-layer"]:checked'
        );
        if (checkedRadio && checkedRadio.id === "population-density") {
          // Calculate the end year and update the legend-year-density element with the range
          let startYear = parseInt(year);
          let endYear = startYear + 9;
          const yearRange = `${startYear}-${endYear}`;

          // SAFE: Check if element exists before setting textContent
          const legendYear = document.getElementById("legend-year-density");
          if (legendYear) {
            legendYear.textContent = yearRange;
          }

          // Show the density legend when data is loaded
          const densityLegend = document.getElementById("density-legend");
          if (densityLegend) {
            densityLegend.style.display = "block";
          }
          const densityOverlay = document.getElementById(
            "layer-icon-container-population"
          );
          if (densityOverlay) {
            densityOverlay.style.display = "block";
          }

          // ✅ UPDATED: Use the new method to show county search
          this.toggleCountySearchVisibility(true);
        }
      })
      .catch((error) => {
        console.error("Error fetching density data:", error);

        // Only unload if we're in density mode
        const checkedRadio = document.querySelector(
          'input[name="population-layer"]:checked'
        );
        if (checkedRadio && checkedRadio.id === "population-density") {
          this.unloadMapData(); // Unload any existing map data on error
        }
      });
  },
};

// Rest of your code stays the same...
function searchCounty(name) {
  const features = densityNamespace.previousGeojsonData?.features;
  if (!features) return;

  const cleaned = name.toLowerCase().trim();
  const match = features.find((f) => {
    const fullName = `${f.properties.NHGISNAM}, ${f.properties.STATENAM}`;
    return fullName.toLowerCase() === cleaned;
  });

  if (match) {
    flyToAndHighlight(match);
  } else {
    alert("County not found.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  densityNamespace.init();
});

const wrapper = document.getElementById("search-wrapper");
const input = document.getElementById("county-search-input");
const button = document.getElementById("county-search-icon-button");
const suggestionList = document.getElementById("county-suggestions");

if (wrapper && input && button && suggestionList) {
  button.addEventListener("click", () => {
    wrapper.classList.toggle("expanded");

    if (wrapper.classList.contains("expanded")) {
      input.focus();
    } else {
      input.value = "";
      suggestionList.innerHTML = "";
      suggestionList.style.display = "none";
    }
  });

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase().trim();
    suggestionList.innerHTML = "";

    if (value === "") {
      suggestionList.style.display = "none";
      return;
    }

    const features = densityNamespace.previousGeojsonData?.features || [];

    // Filter counties based on input value
    const matches = features.filter((f) => {
      const county = f.properties.NHGISNAM?.toLowerCase();
      const state = f.properties.STATENAM?.toLowerCase();
      return county.startsWith(value) || state.startsWith(value);
    });

    // Sort alphabetically by County, State
    matches.sort((a, b) => {
      const nameA =
        `${a.properties.NHGISNAM}, ${a.properties.STATENAM}`.toLowerCase();
      const nameB =
        `${b.properties.NHGISNAM}, ${b.properties.STATENAM}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    matches.forEach((f) => {
      const county = f.properties.NHGISNAM;
      const state = f.properties.STATENAM;
      const fullName = `${county}, ${state}`;
      const lowerFullName = fullName.toLowerCase();
      const matchIndex = lowerFullName.indexOf(value);

      const li = document.createElement("li");

      if (matchIndex !== -1) {
        const before = fullName.slice(0, matchIndex);
        const matchText = fullName.slice(matchIndex, matchIndex + value.length);
        const after = fullName.slice(matchIndex + value.length);
        li.innerHTML = `${before}<strong>${matchText}</strong>${after}`;
      } else {
        li.textContent = fullName;
      }

      li.addEventListener("click", () => {
        input.value = fullName;
        suggestionList.style.display = "none";
        wrapper.classList.remove("expanded");
        flyToAndHighlight(f);
      });

      suggestionList.appendChild(li);
    });

    suggestionList.style.display = matches.length ? "block" : "none";
  });

  function flyToAndHighlight(feature) {
    const centroid = turf.centroid(feature).geometry.coordinates;
    densityNamespace.map.flyTo({ center: centroid, zoom: 6 });

    densityNamespace.map.getSource("highlighted-outline").setData({
      type: "FeatureCollection",
      features: [feature],
    });
  }

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const value = input.value.trim();
      if (value) {
        searchCounty(value);
        wrapper.classList.remove("expanded");
      }
      suggestionList.style.display = "none";
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionList.style.display = "none";
      wrapper.classList.remove("expanded");
    }, 200);
  });
}
