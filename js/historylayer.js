const cessionNamespace = {
  // Will be populated from their respective JSON files
  cession: {},
  trails: {},

  // Track loading state
  configsLoaded: false,
  loadingTrails: new Set(),

  // ============================================================================
  // INITIALIZATION - Load JSON configurations
  // ============================================================================
  async init() {
    try {
      // Load both config files
      const [cessionsResponse, trailsResponse] = await Promise.all([
        fetch("assets/config/CessionConfig.json"),
        fetch("assets/config/TrailsConfig.json"),
      ]);

      this.cession = await cessionsResponse.json();
      this.trails = await trailsResponse.json();

      this.configsLoaded = true;
      console.log("✅ Configurations loaded successfully");

      // Set up event listeners after configs are loaded
      this.setupEventListeners();

      // Initial load based on current slider value
      updateLayersByYear(document.getElementById("slider").value);
    } catch (error) {
      console.error("❌ Failed to load configurations:", error);
    }
  },

  initOverlayLegendContainer: function () {
    let legendContainer = document.getElementById(
      "overlay-legend-container-history"
    );
    if (!legendContainer) {
      legendContainer = document.createElement("div");
      legendContainer.id = "overlay-legend-container-history";
      legendContainer.className = "overlay-legend";
      document.getElementById("map").appendChild(legendContainer);
    }
  },

  // ============================================================================
  // CESSION FUNCTIONALITY
  // ============================================================================
  loadcession: function (id) {
    if (!this.configsLoaded) return;

    this.initOverlayLegendContainer();
    const cession = this.cession[id];
    const currentYear = document.getElementById("slider").value;

    if (!cession || cession.year != currentYear) return;

    const layerId = `${id}-${cession.year}`;
    if (animNamespace.map.getSource(layerId)) return;

    try {
      animNamespace.map.addSource(layerId, {
        type: "geojson",
        data: cession.file,
      });
      animNamespace.map.addLayer({
        id: layerId,
        type: "fill",
        source: layerId,
        paint: {
          "fill-color": cession.color,
          "fill-opacity": 0.5,
          "fill-outline-color": "#000",
        },
      });

      this.updateOverlayLegend(cession.label, cession.color, "fill");
      this.updateLegendVisibility();
    } catch (error) {
      console.error(`Failed to load cession for ${id}:`, error);
    }
  },

  togglecession: function (checked, id) {
    if (!this.configsLoaded) return;

    if (checked) {
      this.loadcession(id);
    } else {
      const cession = this.cession[id];
      const layerId = `${id}-${cession.year}`;
      if (animNamespace.map.getLayer(layerId))
        animNamespace.map.removeLayer(layerId);
      if (animNamespace.map.getSource(layerId))
        animNamespace.map.removeSource(layerId);

      // Remove specific legend item
      this.removeLegendItem(cession.label);
      this.updateLegendVisibility();
    }
  },

  // ============================================================================
  // TRAILS FUNCTIONALITY
  // ============================================================================
  loadTrail: function (id) {
    if (!this.configsLoaded) return;

    this.initOverlayLegendContainer();
    const trail = this.trails[id];
    const currentYear = document.getElementById("slider").value;
    const layerId = `${id}-${trail.year}`;

    if (!trail || trail.year != currentYear || !animNamespace.map) return;
    if (animNamespace.map.getSource(layerId) || this.loadingTrails.has(id))
      return;

    this.loadingTrails.add(id);

    fetch(trail.file)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch ${trail.file}`);
        return response.json();
      })
      .then((data) => {
        // Check again if year is still current before adding
        if (document.getElementById("slider").value != trail.year.toString()) {
          this.loadingTrails.delete(id);
          return;
        }

        animNamespace.map.addSource(layerId, {
          type: "geojson",
          data: data,
        });

        animNamespace.map.addLayer({
          id: layerId,
          type: "line",
          source: layerId,
          paint: {
            "line-color": trail.color,
            "line-width": 2,
          },
        });

        this.updateOverlayLegend(trail.label, trail.color, "line");
        this.updateLegendVisibility();
      })
      .catch((error) => {
        console.error(`❌ Fetch error for ${id}:`, error);
      })
      .finally(() => {
        this.loadingTrails.delete(id);
      });
  },

  toggleTrail: function (checked, id) {
    if (!this.configsLoaded) return;

    console.log(`Toggle trail: checked = ${checked}, id = ${id}`);
    const trail = this.trails[id];
    if (!trail) {
      console.error(`❌ No trail found for id: ${id}`);
      return;
    }

    const layerId = `${id}-${trail.year}`;

    if (checked) {
      console.log(`✅ Loading trail: ${id}`);
      this.loadTrail(id);
    } else {
      console.log(`🔴 Attempting to remove trail layer: ${layerId}`);

      // Check if the layer exists before removing
      let mapLayers = animNamespace.map.getStyle().layers;
      if (mapLayers.some((layer) => layer.id === layerId)) {
        animNamespace.map.removeLayer(layerId);
        console.log(`✅ Removed trail layer: ${layerId}`);
      } else {
        console.warn(`⚠️ Layer ${layerId} NOT found in map.`);
      }

      // Check if the source exists before removing
      if (animNamespace.map.getSource(layerId)) {
        animNamespace.map.removeSource(layerId);
        console.log(`✅ Removed trail source: ${layerId}`);
      } else {
        console.warn(`⚠️ Source ${layerId} NOT found.`);
      }

      // Remove specific legend item
      this.removeLegendItem(trail.label);
      this.updateLegendVisibility();
    }
  },

  // ============================================================================
  // SHARED LEGEND FUNCTIONALITY
  // ============================================================================
  updateOverlayLegend: function (label, color, type) {
    const legendContainer = document.getElementById(
      "overlay-legend-container-history"
    );
    let existingItem = document.querySelector(
      `.overlay-legend-item-history[data-label="${label}"]`
    );
    if (!existingItem) {
      const legendItem = document.createElement("div");
      legendItem.className = "overlay-legend-item-history";
      legendItem.setAttribute("data-label", label);

      // Different styling for fills (cessions) vs lines (trails)
      if (type === "fill") {
        legendItem.innerHTML = `<span class="overlay-legend-color-history" style="background-color: ${color};"></span> ${label}`;
      } else if (type === "line") {
        legendItem.innerHTML = `<span class="overlay-legend-line-history" style="border-color: ${color};"></span> ${label}`;
      }

      legendContainer.appendChild(legendItem);
    }
  },

  removeLegendItem: function (label) {
    const legendContainer = document.getElementById(
      "overlay-legend-container-history"
    );
    const legendItems = legendContainer.querySelectorAll(
      ".overlay-legend-item-history"
    );

    let legendRemoved = false;
    legendItems.forEach((item) => {
      if (item.innerText.includes(label)) {
        item.remove();
        legendRemoved = true;
        console.log(`✅ Removed legend item: ${label}`);
      }
    });

    if (!legendRemoved) {
      console.warn(`⚠️ Legend item for ${label} NOT found.`);
    }
  },

  removeOverlayLegend: function () {
    const legendContainer = document.getElementById(
      "overlay-legend-container-history"
    );
    if (legendContainer) legendContainer.innerHTML = "";
  },

  removeAllLayers: function () {
    if (!this.configsLoaded) return;

    // Remove cession layers
    for (const id in this.cession) {
      const cession = this.cession[id];
      const layerId = `${id}-${cession.year}`;
      if (animNamespace.map.getLayer(layerId))
        animNamespace.map.removeLayer(layerId);
      if (animNamespace.map.getSource(layerId))
        animNamespace.map.removeSource(layerId);
    }

    // Remove trail layers
    for (const id in this.trails) {
      const trail = this.trails[id];
      const layerId = `${id}-${trail.year}`;
      if (animNamespace.map.getLayer(layerId))
        animNamespace.map.removeLayer(layerId);
      if (animNamespace.map.getSource(layerId))
        animNamespace.map.removeSource(layerId);
    }

    this.removeOverlayLegend();
    this.updateLegendVisibility();
  },

  updateLegendVisibility: function () {
    const legendContainer = document.getElementById(
      "overlay-legend-container-history"
    );
    const isVisible = legendContainer && legendContainer.children.length > 0;
    if (legendContainer)
      legendContainer.style.visibility = isVisible ? "visible" : "hidden";
  },

  // ============================================================================
  // EVENT LISTENER
  // ============================================================================
  setupEventListeners: function () {
    // Slider listener
    document.getElementById("slider").addEventListener("input", function () {
      updateLayersByYear(this.value);
    });

    // Cession checkbox listeners
    Object.keys(this.cession).forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", function () {
          if (!this.checked) {
            this.dataset.userUnchecked = "true";
          } else {
            delete this.dataset.userUnchecked;
          }
          cessionNamespace.togglecession(this.checked, id);
        });
      }
    });

    // Trail checkbox listeners
    Object.keys(this.trails).forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", function () {
          if (!this.checked) {
            this.dataset.userUnchecked = "true";
          } else {
            delete this.dataset.userUnchecked;
          }
          cessionNamespace.toggleTrail(this.checked, id);
        });
      }
    });
  },
};

// ============================================================================
// AUTOMATIC YEAR-BASED LOADING FUNCTION
// ============================================================================
function updateLayersByYear(year) {
  if (!cessionNamespace.configsLoaded) return;

  cessionNamespace.removeAllLayers();

  // Handle cessions
  for (const id in cessionNamespace.cession) {
    const cession = cessionNamespace.cession[id];
    const checkbox = document.getElementById(id);

    if (cession.year == year) {
      if (checkbox && checkbox.dataset.userUnchecked === "true") {
        checkbox.checked = false;
      } else {
        if (checkbox) checkbox.checked = true;
        cessionNamespace.loadcession(id);
      }
    } else {
      if (checkbox) checkbox.checked = false;
    }
  }

  // Handle trails
  for (const id in cessionNamespace.trails) {
    const trail = cessionNamespace.trails[id];
    const checkbox = document.getElementById(id);

    if (trail.year == year) {
      if (checkbox && checkbox.dataset.userUnchecked === "true") {
        checkbox.checked = false;
      } else {
        if (checkbox) checkbox.checked = true;
        cessionNamespace.loadTrail(id);
      }
    } else {
      if (checkbox) checkbox.checked = false;
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the namespace and load configurations
  cessionNamespace.init();
});

// ============================================================================
// NATIVE TERRITORIES FUNCTIONALITY (unchanged)
// ============================================================================
// Updated Native Territories Toggle Event Listener
// Add this to replace the existing toggleNativeTerritories event listener

// Updated Native Territories Toggle Event Listener
// Add this to replace the existing toggleNativeTerritories event listener

document
  .getElementById("toggleNativeTerritories")
  .addEventListener("change", function () {
    const map = animNamespace.map;

    if (this.checked) {
      // ✅ Show Native Land layers
      map.setLayoutProperty("native-territories-fill", "visibility", "visible");
      map.setLayoutProperty(
        "native-territories-outline",
        "visibility",
        "visible"
      );

      // ✅ Hide regular US boundaries
      map.setLayoutProperty("us-boundaries-layer", "visibility", "none");

      // ✅ Keep state name labels visible and move them to the top
      map.setLayoutProperty(
        "us-boundaries-labels-layer",
        "visibility",
        "visible"
      );
      if (map.getLayer("us-boundaries-labels-layer")) {
        map.moveLayer("us-boundaries-labels-layer"); // ✅ Move to top of rendering stack
      }

      // ✅ Show emphasis outline (thick red)
      map.setLayoutProperty("us-boundaries-emphasis", "visibility", "visible");
      if (map.getLayer("us-boundaries-emphasis")) {
        map.moveLayer("us-boundaries-emphasis", "native-territories-outline");
      }

      // 🆕 COMPLETELY DISABLE colony popup functionality when native territories are shown
      if (typeof ColonyPopup !== "undefined" && ColonyPopup.isInitialized) {
        ColonyPopup.disablePopupFunctionality();
        console.log(
          "✅ Colony popup functionality DISABLED (Native territories ON)"
        );
      }
    } else {
      // ✅ Hide Native Territories
      map.setLayoutProperty("native-territories-fill", "visibility", "none");
      map.setLayoutProperty("native-territories-outline", "visibility", "none");

      // ✅ Show regular US boundaries again
      map.setLayoutProperty("us-boundaries-layer", "visibility", "visible");

      // ✅ Move labels back under regular US boundaries
      map.setLayoutProperty(
        "us-boundaries-labels-layer",
        "visibility",
        "visible"
      );
      if (map.getLayer("us-boundaries-labels-layer")) {
        map.moveLayer("us-boundaries-labels-layer", "us-boundaries-layer");
      }

      // ✅ Hide the emphasis outline
      map.setLayoutProperty("us-boundaries-emphasis", "visibility", "none");

      // 🆕 COMPLETELY ENABLE colony popup functionality when native territories are turned off
      if (typeof ColonyPopup !== "undefined" && ColonyPopup.isInitialized) {
        ColonyPopup.enablePopupFunctionality();
        console.log(
          "✅ Colony popup functionality ENABLED (Native territories OFF)"
        );
      }
    }
  });
