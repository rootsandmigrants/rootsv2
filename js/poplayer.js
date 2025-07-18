const railroadsNamespace = {
  // Erie Canal configuration
  erieCanal: {
    year: 1830,
    file: "assets/trails/erie.json",
    color: "#1E90FF",
    label: "Erie Canal",
  },

  initOverlayLegendContainer: function () {
    let legendContainer = document.getElementById("overlay-legend-container");
    if (!legendContainer) {
      legendContainer = document.createElement("div");
      legendContainer.id = "overlay-legend-container";
      legendContainer.className = "overlay-legend";
      // Append the legend container to the map container
      document.getElementById("mapDen").appendChild(legendContainer);
    }
  },

  loadRailroads: function (year) {
    this.initOverlayLegendContainer(); // Ensure the legend container is created

    const layerId = `railroads-${year}`;
    const filePath = `assets/rails/Railroads_${year}.json`;
    const color = "#FF0000"; // Railroad line color
    const label = `Railroads ${year}`; // Railroad legend label

    console.log(
      `Attempting to load railroads for year ${year} with layer ID ${layerId}`
    );

    if (!densityNamespace.map) {
      console.error("Map object is not defined in densityNamespace.");
      return;
    }

    // **Store the currently active railroad layer and remove it before adding a new one**
    if (
      this.currentRailroadLayer &&
      densityNamespace.map.getLayer(this.currentRailroadLayer)
    ) {
      densityNamespace.map.removeLayer(this.currentRailroadLayer);
      densityNamespace.map.removeSource(this.currentRailroadLayer);
      console.log(
        `Removed previous railroad layer: ${this.currentRailroadLayer}`
      );
    }

    // Update the current railroad layer to the new one
    this.currentRailroadLayer = layerId;

    // Ensure no duplicate layers get added
    if (densityNamespace.map.getSource(layerId)) {
      console.log(`Layer ${layerId} already exists.`);
      return;
    }

    // Cancel any ongoing fetch requests before making a new one
    if (this.currentFetchController) {
      this.currentFetchController.abort();
      console.log(`Aborted previous fetch request for railroads.`);
    }

    // Create a new AbortController for the fetch request
    this.currentFetchController = new AbortController();
    const { signal } = this.currentFetchController;

    // Fetch and load the railroad data for the selected year
    fetch(filePath, { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`File for year ${year} not found`);
        }
        return response.json();
      })
      .then((data) => {
        if (!densityNamespace.map.getSource(layerId)) {
          densityNamespace.map.addSource(layerId, {
            type: "geojson",
            data: data,
          });

          densityNamespace.map.addLayer({
            id: layerId,
            type: "line",
            source: layerId,
            paint: {
              "line-color": color,
              "line-width": 0.9,
            },
          });

          this.updateOverlayLegend(label, color, false); // Pass false for solid line
          this.updateLegendVisibility(); // Check legend visibility
          console.log(`Successfully loaded railroads for year ${year}.`);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(`Failed to load railroads for year ${year}:`, error);
        } else {
          console.log(`Fetch request for year ${year} was aborted.`);
        }
      });
  },

  // ============================================================================
  // ERIE CANAL FUNCTIONALITY - DEBUGGING VERSION WITH TIMING FIXES
  // ============================================================================
  loadErieCanal: function (forceLoad = false) {
    console.log(`🚀 === STARTING loadErieCanal() ===`);
    console.log(`🚀 forceLoad = ${forceLoad}`);

    // Check if slider exists
    const sliderElement = document.getElementById("slider");
    if (!sliderElement) {
      console.error("❌ Slider element not found!");
      return;
    }

    this.initOverlayLegendContainer();

    const currentYear = parseInt(sliderElement.value);
    const layerId = `erie-canal-${this.erieCanal.year}`;

    console.log(
      `🔍 Current year: ${currentYear} (type: ${typeof currentYear})`
    );
    console.log(
      `🔍 Erie Canal year: ${this.erieCanal.year} (type: ${typeof this.erieCanal
        .year})`
    );
    console.log(
      `🔍 Year comparison: ${currentYear} === ${this.erieCanal.year} = ${
        currentYear === this.erieCanal.year
      }`
    );

    // FIXED: Only check year if not forcing load
    if (!forceLoad && this.erieCanal.year !== currentYear) {
      console.log(
        `⚠️ Erie Canal is only available in the year ${this.erieCanal.year}. Current year is ${currentYear}.`
      );
      return;
    }

    console.log(`✅ Year check passed, proceeding...`);

    // Check if map exists
    console.log(`🗺️ Checking map object...`);
    console.log(`🗺️ densityNamespace exists: ${!!window.densityNamespace}`);
    console.log(
      `🗺️ densityNamespace.map exists: ${!!(
        window.densityNamespace && window.densityNamespace.map
      )}`
    );

    if (!densityNamespace.map) {
      console.error("❌ Map object is not defined in densityNamespace.");
      return;
    }

    console.log(`✅ Map object exists, proceeding...`);

    // 🔥 Always clean up before adding
    console.log(`🧹 Cleaning up existing layers...`);
    if (densityNamespace.map.getLayer(layerId)) {
      densityNamespace.map.removeLayer(layerId);
      console.log(`♻️ Removed existing Erie Canal layer: ${layerId}`);
    }
    if (densityNamespace.map.getSource(layerId)) {
      densityNamespace.map.removeSource(layerId);
      console.log(`♻️ Removed existing Erie Canal source: ${layerId}`);
    }

    console.log(`📁 Starting fetch for: ${this.erieCanal.file}`);
    console.log(
      `📁 Full URL will be: ${window.location.origin}/${this.erieCanal.file}`
    );

    fetch(this.erieCanal.file)
      .then((response) => {
        console.log(`📡 Fetch response received`);
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response statusText: ${response.statusText}`);
        console.log(`📡 Response ok: ${response.ok}`);
        console.log(`📡 Response url: ${response.url}`);

        if (!response.ok) {
          throw new Error(
            `🚨 Failed to fetch ${this.erieCanal.file}: ${response.status} ${response.statusText}`
          );
        }
        console.log(`✅ Fetch successful, parsing JSON...`);
        return response.json();
      })
      .then((data) => {
        console.log(`✅ JSON parsing successful`);
        console.log(`📊 Data type: ${typeof data}`);
        console.log(`📊 Data keys:`, Object.keys(data));
        console.log(`📊 Data structure:`, data);

        // Validate GeoJSON structure
        if (!data.type) {
          console.error(`❌ Invalid GeoJSON: missing 'type' property`);
          return;
        }
        if (!data.features && data.type !== "Feature") {
          console.error(`❌ Invalid GeoJSON: missing 'features' array`);
          return;
        }

        console.log(`✅ GeoJSON validation passed`);
        console.log(`🗺️ Adding source to map...`);

        densityNamespace.map.addSource(layerId, {
          type: "geojson",
          data: data,
        });

        console.log(`✅ Source added successfully`);
        console.log(`🗺️ Adding layer to map...`);

        densityNamespace.map.addLayer({
          id: layerId,
          type: "line",
          source: layerId,
          paint: {
            "line-color": this.erieCanal.color,
            "line-width": 2,
          },
        });

        console.log(`✅ Layer added successfully`);
        console.log(`🎨 Updating legend...`);

        this.updateOverlayLegend(
          this.erieCanal.label,
          this.erieCanal.color,
          true
        );
        this.updateLegendVisibility();

        console.log(`✅ === Erie Canal loading COMPLETE ===`);

        // Final verification with longer delay to ensure it sticks
        setTimeout(() => {
          const finalCheck = densityNamespace.map.getLayer(layerId);
          console.log(`🔍 Final layer check (after delay): ${!!finalCheck}`);
          if (finalCheck) {
            console.log(`🎉 Erie Canal layer is visible on map after delay!`);
          } else {
            console.error(`❌ Erie Canal layer disappeared after loading!`);
            console.log(`🔄 Attempting to reload...`);
            // Try to reload once more
            setTimeout(() => {
              if (!densityNamespace.map.getLayer(layerId)) {
                this.loadErieCanal(true);
              }
            }, 100);
          }
        }, 300); // Longer delay for final check
      })
      .catch((error) => {
        console.error(`❌ === Erie Canal loading FAILED ===`);
        console.error(`❌ Error type: ${error.name}`);
        console.error(`❌ Error message: ${error.message}`);
        console.error(`❌ Full error:`, error);

        // Additional debugging for common issues
        if (error.message.includes("fetch")) {
          console.error(`❌ This appears to be a fetch/network error`);
          console.error(
            `❌ Check if the file exists at: ${this.erieCanal.file}`
          );
        }
        if (error.message.includes("JSON")) {
          console.error(`❌ This appears to be a JSON parsing error`);
          console.error(`❌ The file might not contain valid JSON`);
        }
      });
  },

  // FIXED: Updated toggle function with race-mode awareness
  toggleErieCanal: function (checked) {
    console.log(`🛥️ === TOGGLE ERIE CANAL CALLED ===`);
    console.log(`🛥️ checked = ${checked}`);

    const layerId = `erie-canal-${this.erieCanal.year}`;
    const slider = document.getElementById("slider");
    const currentYear = slider ? parseInt(slider.value) : null;

    // Check if we're in density mode
    const checkedRadio = document.querySelector(
      'input[name="population-layer"]:checked'
    );
    const isDensityMode =
      checkedRadio && checkedRadio.id === "population-density";

    console.log(`🛥️ layerId = ${layerId}`);
    console.log(`🛥️ currentYear = ${currentYear}`);
    console.log(`🛥️ isDensityMode = ${isDensityMode}`);

    if (checked) {
      console.log(`✅ Loading Erie Canal (checked = true)`);

      // Only load if we're in density mode
      if (!isDensityMode) {
        console.log(
          `⚠️ Erie Canal checkbox checked but in race mode - staying hidden`
        );
        return;
      }

      // If we're not in 1830, move slider to 1830 first
      if (currentYear !== this.erieCanal.year) {
        console.log(
          `🔄 Moving slider from ${currentYear} to ${this.erieCanal.year}`
        );
        if (slider) {
          slider.value = this.erieCanal.year;
          // Trigger the slider event to update everything
          slider.dispatchEvent(new Event("input"));
        } else {
          console.error(`❌ Slider element not found!`);
        }
      } else {
        // We're already in 1830 and in density mode, use multiple attempts with shorter delays
        console.log(
          `✅ Already in year 1830 and density mode, loading with fast interference protection...`
        );

        // First attempt - immediate
        this.loadErieCanal(true);

        // Second attempt - after very short delay
        setTimeout(() => {
          if (isDensityMode) {
            // Re-check mode hasn't changed
            console.log(`🛥️ Second attempt to load Erie Canal...`);
            if (!densityNamespace.map.getLayer(layerId)) {
              console.log(`🔄 Erie Canal not found, reloading...`);
              this.loadErieCanal(true);
            }
          }
        }, 50); // REDUCED: from 200ms to 50ms

        // Third attempt - after short delay to ensure it sticks
        setTimeout(() => {
          const currentCheckedRadio = document.querySelector(
            'input[name="population-layer"]:checked'
          );
          const stillInDensityMode =
            currentCheckedRadio &&
            currentCheckedRadio.id === "population-density";

          if (stillInDensityMode) {
            // Only proceed if still in density mode
            console.log(`🛥️ Third attempt to ensure Erie Canal is loaded...`);
            if (!densityNamespace.map.getLayer(layerId)) {
              console.log(`🔄 Erie Canal still not found, final reload...`);
              this.loadErieCanal(true);
            } else {
              console.log(`✅ Erie Canal confirmed loaded and visible!`);
            }
          }
        }, 150); // REDUCED: from 500ms to 150ms
      }
    } else {
      console.log(`🔴 Removing Erie Canal (checked = false)`);

      // Check if map exists
      if (!densityNamespace.map) {
        console.error(`❌ Map not available for removal`);
        return;
      }

      let mapLayers = densityNamespace.map.getStyle().layers;
      if (mapLayers.some((layer) => layer.id === layerId)) {
        densityNamespace.map.removeLayer(layerId);
        console.log(`✅ Removed Erie Canal layer: ${layerId}`);
      } else {
        console.warn(`⚠️ Layer ${layerId} NOT found in map.`);
      }

      if (densityNamespace.map.getSource(layerId)) {
        densityNamespace.map.removeSource(layerId);
        console.log(`✅ Removed Erie Canal source: ${layerId}`);
      } else {
        console.warn(`⚠️ Source ${layerId} NOT found.`);
      }

      console.log(
        `🟠 Attempting to remove legend item: ${this.erieCanal.label}`
      );
      const legendContainer = document.getElementById(
        "overlay-legend-container"
      );

      if (legendContainer) {
        const legendItems = legendContainer.querySelectorAll(
          ".overlay-legend-item"
        );

        let legendRemoved = false;
        legendItems.forEach((item) => {
          if (item.innerText.includes(this.erieCanal.label)) {
            item.remove();
            legendRemoved = true;
            console.log(`✅ Removed legend item for Erie Canal`);
          }
        });

        if (!legendRemoved) {
          console.warn(`⚠️ Legend item for Erie Canal NOT found.`);
        }
        this.updateLegendVisibility();
      } else {
        console.warn(`⚠️ Legend container not found.`);
      }
    }

    console.log(`🛥️ === TOGGLE ERIE CANAL COMPLETE ===`);
  },

  updateOverlayLegend: function (label, color, isDashed) {
    const legendContainer = document.getElementById("overlay-legend-container");

    // Check if this legend item already exists
    let existingItem = document.querySelector(
      `.overlay-legend-item[data-label="${label}"]`
    );
    if (!existingItem) {
      // Create a new legend item
      const legendItem = document.createElement("div");
      legendItem.className = "overlay-legend-item";
      legendItem.setAttribute("data-label", label);

      // Check if the line should be dashed or solid
      const lineStyleClass = isDashed
        ? "overlay-legend-dashed"
        : "overlay-legend-color";

      // Apply the line style and set the color on the span element only
      legendItem.innerHTML = `<span class="${lineStyleClass}" style="color: ${color};"></span> ${label}`;

      // Keep the text color black
      legendItem.style.color = "black";

      // Append the legend item to the container
      legendContainer.appendChild(legendItem);
    }
  },

  removeOverlayLegend: function () {
    const legendContainer = document.getElementById("overlay-legend-container");
    if (legendContainer) legendContainer.innerHTML = ""; // Clear the legend
  },

  removeAllLayers: function (preserveErieCanal = false) {
    console.log(
      `Removing all railroad and Erie Canal layers... preserveErieCanal: ${preserveErieCanal}`
    );

    // Remove railroad layers
    for (let year = 1830; year <= 1920; year += 10) {
      const layerId = `railroads-${year}`;
      if (densityNamespace.map.getLayer(layerId)) {
        densityNamespace.map.removeLayer(layerId);
        console.log(`Removed layer ${layerId}.`);
      }
      if (densityNamespace.map.getSource(layerId)) {
        densityNamespace.map.removeSource(layerId);
        console.log(`Removed source ${layerId}.`);
      }
    }

    // Only remove Erie Canal if not preserving it
    if (!preserveErieCanal) {
      const erieLayerId = `erie-canal-${this.erieCanal.year}`;
      if (densityNamespace.map.getLayer(erieLayerId)) {
        densityNamespace.map.removeLayer(erieLayerId);
        console.log(`Removed layer ${erieLayerId}.`);
      }
      if (densityNamespace.map.getSource(erieLayerId)) {
        densityNamespace.map.removeSource(erieLayerId);
        console.log(`Removed source ${erieLayerId}.`);
      }
    } else {
      console.log(`🛡️ Erie Canal preserved from removal`);
    }

    this.removeOverlayLegend(); // Clear the legend when layers are removed
    this.updateLegendVisibility(); // Update legend visibility
  },

  // New function specifically for external code that shouldn't interfere with Erie Canal
  removeAllLayersPreservingErie: function () {
    console.log("🛡️ Removing railroad layers while preserving Erie Canal...");
    this.removeAllLayers(true);
  },

  toggleRailroads: function (checked, year) {
    console.log(`Toggle railroads: checked = ${checked}, year = ${year}`);

    if (checked) {
      this.loadRailroads(year);
    } else {
      // Remove all railroad layers and their legend items
      for (let y = 1830; y <= 1920; y += 10) {
        const layerId = `railroads-${y}`;
        if (densityNamespace.map.getLayer(layerId)) {
          densityNamespace.map.removeLayer(layerId);
          console.log(`Removed railroad layer ${layerId}.`);
        }
        if (densityNamespace.map.getSource(layerId)) {
          densityNamespace.map.removeSource(layerId);
          console.log(`Removed railroad source ${layerId}.`);
        }
      }

      // Remove railroad legend item from the overlay legend
      const legendContainer = document.getElementById(
        "overlay-legend-container"
      );
      const legendItems = legendContainer.getElementsByClassName(
        "overlay-legend-item"
      );

      for (let i = legendItems.length - 1; i >= 0; i--) {
        if (legendItems[i].innerText.includes("Railroads")) {
          legendItems[i].remove();
          console.log("Removed railroad legend item.");
        }
      }

      this.updateLegendVisibility(); // Hide legend if it's empty
    }
  },

  updateLegendVisibility: function () {
    const legendContainer = document.getElementById("overlay-legend-container");
    const isVisible = legendContainer && legendContainer.children.length > 0; // Check if there are any items in the legend
    if (legendContainer)
      legendContainer.style.visibility = isVisible ? "visible" : "hidden"; // Set visibility based on content
  },

  // ============================================================================
  // ENSURE LAYERS STAY LOADED WHEN CHECKED - ENHANCED VERSION WITH INTERFERENCE PROTECTION
  // ============================================================================
  ensureLayersLoaded: function () {
    const year = parseInt(document.getElementById("slider").value);
    const erieChecked = document.getElementById("erie-canal").checked;

    console.log("✅ ensureLayersLoaded called");
    console.log("➡️ Year:", year, typeof year);
    console.log("📌 Erie Canal checked:", erieChecked);

    if (document.getElementById("railroads").checked) {
      console.log("🔄 Force reloading railroads - checkbox is checked");
      this.loadRailroads(year);
    }

    if (erieChecked && year === this.erieCanal.year) {
      console.log(
        "🔄 Force reloading Erie Canal - checkbox is checked and year is 1830"
      );
      this.loadErieCanal(true);
    } else if (erieChecked) {
      console.log(
        "⚠️ Erie Canal is checked but year is not 1830. Skipping load."
      );
    }
  },

  // New function to periodically check and maintain Erie Canal if it should be visible
  startErieCanalWatchdog: function () {
    if (this.erieWatchdog) {
      clearInterval(this.erieWatchdog);
    }

    this.erieWatchdog = setInterval(() => {
      const erieCheckbox = document.getElementById("erie-canal");
      const slider = document.getElementById("slider");
      const layerId = `erie-canal-${this.erieCanal.year}`;

      // Check if we're in density mode (not race mode)
      const checkedRadio = document.querySelector(
        'input[name="population-layer"]:checked'
      );
      const isDensityMode =
        checkedRadio && checkedRadio.id === "population-density";

      // Only reload Erie Canal if:
      // 1. Erie Canal checkbox is checked
      // 2. Year is 1830
      // 3. We're in density mode (not race mode)
      // 4. Erie Canal layer doesn't exist on map
      if (
        erieCheckbox &&
        erieCheckbox.checked &&
        slider &&
        parseInt(slider.value) === this.erieCanal.year &&
        isDensityMode &&
        densityNamespace.map &&
        !densityNamespace.map.getLayer(layerId)
      ) {
        console.log(
          "🔄 Watchdog: Erie Canal should be visible in density mode but isn't - reloading..."
        );
        this.loadErieCanal(true);
      } else if (erieCheckbox && erieCheckbox.checked && !isDensityMode) {
        console.log(
          "🛡️ Watchdog: Erie Canal checkbox checked but in race mode - keeping hidden"
        );
      }
    }, 500); // REDUCED: Check every 500ms instead of 2000ms
  },

  stopErieCanalWatchdog: function () {
    if (this.erieWatchdog) {
      clearInterval(this.erieWatchdog);
      this.erieWatchdog = null;
      console.log("🛑 Erie Canal watchdog stopped");
    }
  },

  // Function to call when switching TO any race (to hide transportation layers)
  hideTransportationLayers: function () {
    console.log("🔹 Hiding transportation layers for race view");
    this.removeAllLayers();
  },

  // Function to call when switching BACK to default (to restore transportation layers)
  restoreTransportationLayers: function () {
    console.log("🔄 Restoring transportation layers for default view");

    setTimeout(() => {
      const erieCheckbox = document.getElementById("erie-canal");
      const slider = document.getElementById("slider");

      // Force slider to 1830 if Erie Canal is checked (because it's only available in 1830)
      if (
        erieCheckbox.checked &&
        parseInt(slider.value) !== this.erieCanal.year
      ) {
        // FIXED: Convert to number
        console.log("🔄 Setting slider to Erie Canal year (1830)");
        slider.value = this.erieCanal.year;
        // Fire the input event so everything updates correctly
        slider.dispatchEvent(new Event("input"));
      } else {
        this.ensureLayersLoaded();
      }
    }, 100);
  },
};

// ============================================================================
// MISSING FUNCTION DEFINITION (to fix the ReferenceError) - RACE-MODE AWARE VERSION
// ============================================================================
function clearTrailAndRailLayers() {
  console.log("🧹 clearTrailAndRailLayers() called");
  if (window.railroadsNamespace) {
    // Check if Erie Canal should be preserved
    const erieCheckbox = document.getElementById("erie-canal");
    const slider = document.getElementById("slider");
    const checkedRadio = document.querySelector(
      'input[name="population-layer"]:checked'
    );
    const isDensityMode =
      checkedRadio && checkedRadio.id === "population-density";

    const shouldPreserveErie =
      erieCheckbox &&
      erieCheckbox.checked &&
      slider &&
      parseInt(slider.value) === railroadsNamespace.erieCanal.year &&
      isDensityMode; // Only preserve if in density mode

    if (shouldPreserveErie) {
      console.log(
        "🛡️ Preserving Erie Canal during clearTrailAndRailLayers (density mode)"
      );
      railroadsNamespace.removeAllLayersPreservingErie();
    } else {
      console.log(
        "🧹 Removing all layers including Erie Canal (race mode or not applicable)"
      );
      railroadsNamespace.removeAllLayers();
    }
  }
}

// ============================================================================
// EVENT LISTENERS - RAILROADS AND ERIE CANAL
// ============================================================================

// Wait for DOM to be ready before adding event listeners
function initializeTransportationControls() {
  console.log("🚀 Initializing transportation controls...");

  // Check if elements exist
  const railroadCheckbox = document.getElementById("railroads");
  const erieCheckbox = document.getElementById("erie-canal");
  const slider = document.getElementById("slider");

  console.log("🔍 Railroad checkbox exists:", !!railroadCheckbox);
  console.log("🔍 Erie Canal checkbox exists:", !!erieCheckbox);
  console.log("🔍 Slider exists:", !!slider);

  if (!railroadCheckbox || !erieCheckbox || !slider) {
    console.error("❌ Missing required DOM elements!");
    return;
  }

  // Event listener for railroad checkbox
  railroadCheckbox.addEventListener("change", function () {
    const year = parseInt(slider.value);
    console.log(
      `🚂 Railroad checkbox changed: checked = ${this.checked}, year = ${year}`
    );
    railroadsNamespace.toggleRailroads(this.checked, year);
  });

  // Event listener for Erie Canal checkbox
  erieCheckbox.addEventListener("change", function () {
    console.log(`🛥️ === ERIE CANAL CHECKBOX CLICKED ===`);
    console.log(`🛥️ Checkbox checked: ${this.checked}`);
    console.log(`🛥️ Current slider value: ${slider.value}`);
    console.log(`🛥️ Calling toggleErieCanal...`);

    railroadsNamespace.toggleErieCanal(this.checked);

    // Start or stop watchdog based on checkbox state
    if (this.checked) {
      railroadsNamespace.startErieCanalWatchdog();
    } else {
      railroadsNamespace.stopErieCanalWatchdog();
    }
  });

  console.log("✅ Transportation controls initialized successfully!");
}

// Slider event listener - railroads and Erie Canal
function initializeSliderListener() {
  const slider = document.getElementById("slider");
  if (!slider) {
    console.error("❌ Slider not found!");
    return;
  }

  slider.addEventListener("input", function () {
    const year = parseInt(this.value);
    console.log(`📅 Slider moved: year = ${year}`);

    // Remove all railroad and Erie Canal layers before adding the new ones
    railroadsNamespace.removeAllLayers();

    // Load the corresponding railroad layer for the selected year if checked
    const railroadCheckbox = document.getElementById("railroads");
    if (railroadCheckbox && railroadCheckbox.checked) {
      console.log(`🚂 Loading railroads for year ${year}`);
      railroadsNamespace.loadRailroads(year);
    }

    // Load Erie Canal if checked and year matches
    const erieCheckbox = document.getElementById("erie-canal");
    if (erieCheckbox && erieCheckbox.checked) {
      console.log(`🛥️ Erie Canal checkbox is checked, checking year...`);
      if (year === railroadsNamespace.erieCanal.year) {
        console.log(`🛥️ Year matches (${year}), loading Erie Canal...`);
        railroadsNamespace.loadErieCanal(true);
      } else {
        console.log(
          `⚠️ Erie Canal not loaded - year ${year} doesn't match required year ${railroadsNamespace.erieCanal.year}`
        );
      }
    }
  });
}

// DOM Content Loaded - railroads and Erie Canal
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 DOM Content Loaded - initializing transportation system...");

  // Initialize all event listeners
  initializeTransportationControls();
  initializeSliderListener();

  // Load initial layers if checkboxes are checked
  const slider = document.getElementById("slider");
  const railroadCheckbox = document.getElementById("railroads");
  const erieCheckbox = document.getElementById("erie-canal");

  if (slider && railroadCheckbox && erieCheckbox) {
    const year = parseInt(slider.value);
    console.log(`🔍 Initial year: ${year}`);

    // Load the corresponding railroad layer for the selected year if checked
    if (railroadCheckbox.checked) {
      console.log(`🚂 Loading initial railroads for year ${year}`);
      railroadsNamespace.loadRailroads(year);
    }

    // Load Erie Canal if checked
    if (erieCheckbox.checked) {
      console.log(`🛥️ Erie Canal checkbox is initially checked`);
      railroadsNamespace.toggleErieCanal(true);
    }
  }
});

// ============================================================================
// PUBLIC FUNCTIONS FOR RACE SWITCHING
// ============================================================================

// Call this function when switching TO any race view (to hide transportation layers)
function hideTransportationLayers() {
  railroadsNamespace.hideTransportationLayers();
}

// Call this function when switching BACK to default view (to restore transportation layers)
function restoreTransportationLayers() {
  railroadsNamespace.restoreTransportationLayers();
}

// Alternative: Direct access functions
window.railroadControls = {
  hide: () => railroadsNamespace.hideTransportationLayers(),
  restore: () => railroadsNamespace.restoreTransportationLayers(),
  forceReload: () => railroadsNamespace.ensureLayersLoaded(),

  // Debug functions
  testErieCanal: () => {
    console.log("🧪 === TESTING ERIE CANAL ===");
    railroadsNamespace.loadErieCanal(true);
  },

  checkStatus: () => {
    console.log("🔍 === STATUS CHECK ===");
    console.log("Slider exists:", !!document.getElementById("slider"));
    console.log("Slider value:", document.getElementById("slider")?.value);
    console.log(
      "Erie checkbox exists:",
      !!document.getElementById("erie-canal")
    );
    console.log(
      "Erie checkbox checked:",
      document.getElementById("erie-canal")?.checked
    );
    console.log(
      "Map exists:",
      !!(window.densityNamespace && window.densityNamespace.map)
    );
    console.log("Railroad namespace exists:", !!window.railroadsNamespace);
  },

  forceToggleErie: (checked) => {
    console.log(`🧪 Force toggling Erie Canal to: ${checked}`);
    railroadsNamespace.toggleErieCanal(checked);
  },
};
