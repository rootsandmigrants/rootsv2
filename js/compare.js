document.addEventListener("DOMContentLoaded", () => {
  console.log("compare script fully loaded and parsed");

  const mapStyle = {
    version: 8,
    glyphs:
      "https://rootsandmigrants.github.io/fonts/glyphs/{fontstack}/{range}.pbf",
    sources: {
      esriWorldPhysical: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        maxzoom: 10,
        attribution:
          '<a href="https://www.esri.com/" target="_blank">Esri</a> | <a href="https://www.nhgis.org/" target="_blank">IPUMS NHGIS</a>',
      },
    },
    layers: [
      {
        id: "esriWorldPhysical-layer",
        type: "raster",
        source: "esriWorldPhysical",
        minzoom: 0,
        maxzoom: 10,
        paint: {
          "raster-opacity": 0.2,
        },
      },
    ],
  };

  window.map1 = new maplibregl.Map({
    container: "map1",
    style: mapStyle,
    center: [-98.35, 39.5],
    zoom: 3,
    minZoom: 3,
    maxZoom: 7,
  });

  window.map2 = new maplibregl.Map({
    container: "map2",
    style: mapStyle,
    center: [-98.35, 39.5],
    zoom: 3,
    minZoom: 3,
    maxZoom: 7,
  });

  // Sync state management
  let isSynced = false;
  let syncEventHandlers = null;
  let isUpdatingSync = false; // Add flag to prevent infinite loops

  // Initialize maps without sync by default
  // syncMaps(map1, map2); // Removed automatic sync

  // Add scale control and navigation controls
  map1.addControl(new maplibregl.ScaleControl({ position: "bottom-left" }));
  const zoomControl1 = new maplibregl.NavigationControl();
  const zoomControl2 = new maplibregl.NavigationControl();
  map1.addControl(zoomControl1, "bottom-right");
  map2.addControl(new maplibregl.ScaleControl({ position: "bottom-left" }));
  map2.addControl(zoomControl2, "bottom-right");

  // Add the Zoom to Extent button
  addZoomToExtentButton();

  // Add the Sync Toggle button
  addSyncToggleButton();

  // Function to enable map synchronization
  // Function to enable map synchronization
  function enableSync() {
    console.log("🔄 Enabling sync...");

    // Always use our custom sync implementation for better control
    syncEventHandlers = createSyncHandlers(map1, map2);
    isSynced = true;
    updateSyncButtonState();

    console.log("✅ Sync enabled");
  }

  // Function to disable map synchronization
  function disableSync() {
    console.log("🛑 Disabling sync...");

    // Force cleanup of all possible sync handlers
    forceCleanupAllSyncHandlers();

    syncEventHandlers = null;
    isSynced = false;
    isUpdatingSync = false; // Reset the flag
    updateSyncButtonState();

    console.log("✅ Sync disabled");
  }
  // Enhanced cleanup function that removes ALL possible sync-related event listeners
  function forceCleanupAllSyncHandlers() {
    // If we have stored handlers, clean them up first
    if (syncEventHandlers) {
      if (typeof syncEventHandlers.destroy === "function") {
        syncEventHandlers.destroy();
      } else {
        removeSyncHandlers(map1, map2, syncEventHandlers);
      }
    }

    // Force remove ALL event listeners that could be related to syncing
    // This is a more aggressive cleanup to ensure no lingering listeners
    const eventTypes = [
      "move",
      "moveend",
      "drag",
      "dragend",
      "zoom",
      "zoomend",
    ];

    eventTypes.forEach((eventType) => {
      // Create temporary handlers to remove any anonymous functions
      const tempHandler1 = () => {};
      const tempHandler2 = () => {};

      // Try to remove any existing listeners (this won't affect properly named functions)
      map1.off(eventType, tempHandler1);
      map2.off(eventType, tempHandler2);
    });

    console.log("🧹 Force cleanup completed");
  }

  // Improved fallback sync implementation
  function createSyncHandlers(map1, map2) {
    console.log("🔧 Creating sync handlers...");

    const handlers = {
      map1Handler: null,
      map2Handler: null,
      isActive: true,
    };

    // Sync function for map movement with loop prevention
    const syncMove = (sourceMap, targetMap, handlerName) => {
      // Extra safety checks
      if (!handlers.isActive) {
        console.log("⚠️ Handler called but sync is not active");
        return;
      }

      if (isUpdatingSync) {
        console.log("⚠️ Sync update in progress, skipping");
        return;
      }

      if (!isSynced) {
        console.log("⚠️ Sync is disabled, removing handler");
        return;
      }

      console.log(`🔄 Syncing from ${handlerName}`);
      isUpdatingSync = true;

      try {
        const center = sourceMap.getCenter();
        const zoom = sourceMap.getZoom();
        const bearing = sourceMap.getBearing();
        const pitch = sourceMap.getPitch();

        targetMap.jumpTo({
          center: center,
          zoom: zoom,
          bearing: bearing,
          pitch: pitch,
        });
      } catch (error) {
        console.error("❌ Error during sync:", error);
      }

      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingSync = false;
      }, 50); // Increased delay for better safety
    };

    // Create named functions for better cleanup
    handlers.map1Handler = function syncMap1ToMap2() {
      syncMove(map1, map2, "map1");
    };

    handlers.map2Handler = function syncMap2ToMap1() {
      syncMove(map2, map1, "map2");
    };

    // Add event listeners
    map1.on("moveend", handlers.map1Handler);
    map2.on("moveend", handlers.map2Handler);

    // Store cleanup function
    handlers.destroy = function () {
      console.log("🗑️ Destroying sync handlers...");
      handlers.isActive = false;

      if (handlers.map1Handler) {
        map1.off("moveend", handlers.map1Handler);
        map1.off("move", handlers.map1Handler); // Safety cleanup
      }
      if (handlers.map2Handler) {
        map2.off("moveend", handlers.map2Handler);
        map2.off("move", handlers.map2Handler); // Safety cleanup
      }

      handlers.map1Handler = null;
      handlers.map2Handler = null;

      console.log("✅ Handlers destroyed");
    };

    console.log("✅ Sync handlers created");
    return handlers;
  }
  // Enhanced remove sync handlers function
  function removeSyncHandlers(map1, map2, handlers) {
    console.log("🗑️ Removing sync handlers...");

    if (handlers) {
      handlers.isActive = false;

      if (handlers.map1Handler) {
        map1.off("moveend", handlers.map1Handler);
        map1.off("move", handlers.map1Handler);
      }
      if (handlers.map2Handler) {
        map2.off("moveend", handlers.map2Handler);
        map2.off("move", handlers.map2Handler);
      }

      // Clear the handlers
      handlers.map1Handler = null;
      handlers.map2Handler = null;
    }

    console.log("✅ Handlers removed");
  }
  // Function to toggle sync state
  function toggleSync() {
    console.log("🔄 Toggle sync called. Current state:", isSynced);

    if (isSynced) {
      console.log("➡️ Disabling sync...");
      disableSync();
    } else {
      console.log("➡️ Enabling sync...");
      enableSync();
    }
  }

  // Function to update sync button appearance
  function updateSyncButtonState() {
    const button = document.querySelector(".sync-toggle-button");
    const tooltip = document.querySelector(".sync-toggle-tooltip");

    if (button && tooltip) {
      if (isSynced) {
        button.classList.add("synced");
        button.classList.remove("unsynced");
        tooltip.textContent = "Disable Map Sync";
        button.setAttribute("aria-label", "Disable map synchronization");
      } else {
        button.classList.add("unsynced");
        button.classList.remove("synced");
        tooltip.textContent = "Enable Map Sync";
        button.setAttribute("aria-label", "Enable map synchronization");
      }
    }
  }

  // Function to add sync toggle button
  function addSyncToggleButton() {
    const button = document.createElement("button");
    button.className = "sync-toggle-button unsynced";
    button.innerHTML =
      '<img src="img/sync.png" alt="Sync Maps" style="width: 18px; height: 18px;">';
    button.setAttribute("aria-label", "Enable map synchronization");

    const syncTooltip = document.createElement("div");
    syncTooltip.className = "sync-toggle-tooltip";
    syncTooltip.textContent = "Enable Map Sync";
    syncTooltip.style.visibility = "hidden";

    button.addEventListener("mouseenter", () => {
      syncTooltip.style.visibility = "visible";
    });

    button.addEventListener("mouseleave", () => {
      syncTooltip.style.visibility = "hidden";
    });

    button.addEventListener("click", toggleSync);

    button.appendChild(syncTooltip);

    const container = document.getElementById("container-compare");
    if (container) {
      container.appendChild(button);
    } else {
      console.error(
        "Container for compare maps not found! Ensure you have an element with ID 'container-compare'."
      );
    }
  }

  // Function to show/hide slider based on topic selection
  function toggleSliderVisibility(mapId, topic) {
    const slider = document.getElementById(`${mapId}-slider`);
    const sliderLabel = document.querySelector(`label[for="${mapId}-slider"]`);

    if (topic === "Native-Land") {
      // Hide slider and label for Native-Land
      if (slider) slider.style.display = "none";
      if (sliderLabel) sliderLabel.style.display = "none";
    } else {
      // Show slider and label for other topics
      if (slider) slider.style.display = "block";
      if (sliderLabel) sliderLabel.style.display = "block";
    }
  }

  function injectInitialMessage(tableId, message) {
    const tableContainer = document.querySelector(`#${tableId}`)?.parentElement;
    if (!tableContainer) {
      console.error(`Table container for ${tableId} not found!`);
      return;
    }
    const messageDiv = document.createElement("div");
    messageDiv.id = `initial-message-${tableId}`;
    messageDiv.className = "initial-message";
    messageDiv.textContent = message;
    tableContainer.insertBefore(messageDiv, tableContainer.firstChild);
  }

  function removeInitialMessage(tableId) {
    const messageDiv = document.getElementById(`initial-message-${tableId}`);
    if (messageDiv) {
      messageDiv.parentElement.removeChild(messageDiv);
    }
  }

  function unloadMapData(map) {
    if (map.getSource("data")) {
      map.removeLayer("data-layer");
      map.removeLayer("hover-layer");
      map.removeSource("data");
    }
    if (map.getSource("highlight")) {
      map.removeLayer("highlight-layer");
      map.removeSource("highlight");
    }
    // FIX: Also remove labels when cleaning up map data
    if (map.getSource("labels")) {
      map.removeLayer("labels-layer");
      map.removeSource("labels");
    }
    // Remove hover source
    if (map.getSource("hover")) {
      map.removeSource("hover");
    }
  }

  function highlightTableRow(tableId, featureIndex) {
    // Remove previous highlights
    document.querySelectorAll(`#${tableId}-body tr`).forEach((row) => {
      row.classList.remove("highlighted-row");
      row.querySelectorAll("td, th").forEach((cell) => {
        cell.style.backgroundColor = "";
      });
    });

    // Highlight the new row
    const row = document.getElementById(`${tableId}-row-${featureIndex}`);
    if (row) {
      row.classList.add("highlighted-row");
      row.querySelectorAll("td, th").forEach((cell) => {
        cell.style.backgroundColor = "darkgray";
      });
    }
  }

  function getNameFields(data, topic) {
    if (!data.features || data.features.length === 0) {
      console.error("No features available in the dataset.");
      return null;
    }

    const properties = data.features[0].properties;

    if (topic === "Population") {
      return {
        stateNameField: "STATENAM",
        countyNameField: "NHGISNAM",
      };
    } else if (topic === "Migration" || topic === "Foreign-Born") {
      const nameField = properties.STATENAM
        ? "STATENAM"
        : properties.STATE_ABBR
        ? "STATE_ABBR"
        : properties.LABEL
        ? "LABEL"
        : null;

      if (!nameField) {
        console.error(`No valid label field found for topic: ${topic}`);
        return { nameField: "Unknown" };
      }

      return { nameField };
    } else if (topic === "Native-Land") {
      // Handle Native-Land specific naming
      const nameField =
        properties.NAME ||
        properties.LABEL ||
        properties.TERRITORY_NAME ||
        null;
      if (!nameField) {
        console.error(`No valid label field found for Native-Land topic`);
        return { nameField: "Unknown" };
      }
      return { nameField };
    } else {
      console.warn(`Unrecognized topic "${topic}", using default label field.`);
      return { nameField: "LABEL" };
    }
  }

  function getCentroid(geometry) {
    if (!geometry) {
      console.warn("❌ No geometry found for feature.");
      return null;
    }

    if (geometry.type === "Polygon") {
      const centroid = turf.centroid(geometry).geometry.coordinates;
      console.log(`📍 Centroid for Polygon: ${centroid}`);
      return centroid;
    } else if (geometry.type === "MultiPolygon") {
      let largestPolygon = geometry.coordinates.reduce((a, b) => {
        return turf.area(turf.polygon(a)) > turf.area(turf.polygon(b)) ? a : b;
      });
      const centroid = turf.centroid(turf.polygon(largestPolygon)).geometry
        .coordinates;
      console.log(`📍 Centroid for MultiPolygon: ${centroid}`);
      return centroid;
    }

    console.warn("❌ Unsupported geometry type:", geometry.type);
    return null;
  }

  function prepareLabelData(data, fields, topic) {
    if (!fields) {
      console.error("Missing fields for label preparation.");
      return { type: "FeatureCollection", features: [] };
    }

    console.log("Extracted Name Fields:", fields);

    if (topic === "Population") {
      // Group counties by state
      const stateGroups = data.features.reduce((acc, feature) => {
        const stateName = feature.properties[fields.stateNameField];
        if (!stateName) {
          console.warn("Feature missing state name:", feature.properties);
          return acc;
        }
        if (!acc[stateName]) acc[stateName] = [];
        acc[stateName].push(feature.geometry);
        return acc;
      }, {});

      // Compute centroid per state
      const stateLabels = Object.entries(stateGroups)
        .map(([stateName, geometries]) => {
          const centroid = getCentroid(geometries[0]);
          if (!centroid) {
            console.warn(`❌ No centroid found for ${stateName}`);
            return null;
          }

          console.log(`✅ Label assigned: ${stateName} at ${centroid}`);

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: centroid,
            },
            properties: { name: stateName },
          };
        })
        .filter(Boolean);

      return { type: "FeatureCollection", features: stateLabels };
    } else {
      // Migration, Foreign-Born, and Native-Land Maps → Direct centroid per feature
      return {
        type: "FeatureCollection",
        features: data.features
          .map((feature) => {
            const name = feature.properties[fields.nameField] || "Unknown";
            const centroid = getCentroid(feature.geometry);

            if (!centroid) {
              console.warn(`❌ No centroid found for ${name}`);
              return null;
            }

            console.log(`✅ Label assigned: ${name} at ${centroid}`);

            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: centroid,
              },
              properties: { name },
            };
          })
          .filter((f) => f.geometry.coordinates !== null),
      };
    }
  }

  function loadGeoJSON(map, url, tableId, infoId, topic) {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("GeoJSON data loaded:", data);

        unloadMapData(map);

        map.addSource("data", {
          type: "geojson",
          data: data,
        });

        map.addLayer({
          id: "data-layer",
          type: "fill",
          source: "data",
          layout: {},
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.7,
            "fill-outline-color": "rgba(200, 200, 200, 0.5)",
          },
        });

        if (map.getLayer("hover-layer")) {
          map.removeLayer("hover-layer");
        }
        if (map.getSource("hover")) {
          map.removeSource("hover");
        }

        map.addSource("hover", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "hover-layer",
          type: "line",
          source: "hover",
          paint: {
            "line-color": "Red",
            "line-width": 2,
          },
        });

        if (!topic) {
          console.error("Missing topic for labeling.");
          return;
        }

        // Remove existing labels first
        if (map.getLayer("labels-layer")) {
          map.removeLayer("labels-layer");
        }
        if (map.getSource("labels")) {
          map.removeSource("labels");
        }

        // Skip adding labels for Native-Land
        if (topic === "Native-Land") {
          console.log("🚫 Skipping labels for Native-Land maps");
        } else {
          // Add labels for all other topics
          const fields = getNameFields(data, topic);
          if (fields) {
            const labelData = prepareLabelData(data, fields, topic);

            console.log(
              "✅ Final label data:",
              JSON.stringify(labelData, null, 2)
            );

            map.addSource("labels", { type: "geojson", data: labelData });
            map.addLayer({
              id: "labels-layer",
              type: "symbol",
              source: "labels",
              layout: {
                "text-field": ["get", "name"],
                "text-font": ["Metropolis-Bold"],
                "text-size": 10,
                "text-anchor": "center",
              },
              paint: {
                "text-color": "#000",
                "text-halo-color": "#FFF",
                "text-halo-width": 1,
              },
            });
          }
        }

        if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
          $(`#${tableId}`).DataTable().clear().destroy();
        }

        populateTable(data, tableId, map);
        addMapHover(map, data, infoId, topic);

        map.on("click", "data-layer", (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            highlightTableRow(tableId, feature.properties.OBJECTID);
          }
        });
      })
      .catch((error) => {
        console.error("❌ Error loading GeoJSON:", error);
      });
  }

  function formatNumber(value) {
    if (typeof value === "number") {
      return value.toFixed(2);
    }
    return value;
  }
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  function populateTable(data, tableId, map) {
    const headerRow = document.getElementById(`${tableId}-header`);
    const body = document.getElementById(`${tableId}-body`);

    headerRow.innerHTML = "";
    body.innerHTML = "";

    if (data.features.length > 0) {
      removeInitialMessage(tableId);

      const rawKeys = Object.keys(data.features[0].properties).filter((key) => {
        const keyStr = String(key).trim();
        const fieldsToHideStr = fieldsToHide.map((field) =>
          String(field).trim()
        );
        return !fieldsToHideStr.includes(keyStr);
      });

      const displayHeaders = rawKeys.map((key) => fieldMappings[key] || key);
      displayHeaders.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });

      data.features.forEach((feature, index) => {
        const tr = document.createElement("tr");
        tr.classList.add("clickable-row");
        tr.dataset.featureIndex = index;
        tr.id = `${tableId}-row-${index}`;

        rawKeys.forEach((key) => {
          let fieldValue = feature.properties[key];

          if (!isNaN(fieldValue) && fieldValue !== null && fieldValue !== "") {
            fieldValue = formatNumber(parseFloat(fieldValue));
          }

          const td = document.createElement("td");

          // FIX: Check if this is a description field with a URL
          const isDescriptionField =
            key.toLowerCase().includes("description") ||
            (fieldMappings[key] &&
              fieldMappings[key].toLowerCase().includes("Description"));

          if (
            isDescriptionField &&
            fieldValue &&
            isValidUrl(String(fieldValue))
          ) {
            // Create clickable link
            const link = document.createElement("a");
            link.href = fieldValue;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "View Details";
            link.style.color = "#0066cc";
            link.style.textDecoration = "underline";

            // Prevent row click when clicking the link
            link.addEventListener("click", function (e) {
              e.stopPropagation();
            });

            td.appendChild(link);
          } else {
            td.textContent = fieldValue || "";
          }

          tr.appendChild(td);
        });
        body.appendChild(tr);
      });

      $(`#${tableId}`).DataTable({
        pageLength: 10,
        scrollY: false,
        scrollCollapse: false,
        autoWidth: false,
        scrollX: false,
        paging: true,
      });

      $(`#${tableId} tbody`).on("click", "tr", function (e) {
        // FIX: Don't trigger row selection if clicking on a link
        if (e.target.tagName === "A") {
          return;
        }

        const row = $(this);
        const featureIndex = row.data("featureIndex");
        const feature = data.features[featureIndex];

        if (row.hasClass("highlighted-row")) {
          row.removeClass("highlighted-row");
          row.find("td, th").css("background-color", "");

          if (map.getSource("highlight")) {
            map.removeLayer("highlight-layer");
            map.removeSource("highlight");
          }
          return;
        }

        $(`#${tableId} tbody tr`).removeClass("highlighted-row");
        $(`#${tableId} tbody tr td, #${tableId} tbody tr th`).css(
          "background-color",
          ""
        );

        row.addClass("highlighted-row");
        row.find("td, th").css("background-color", "darkgray");

        let bounds = new maplibregl.LngLatBounds();
        if (feature.geometry.type === "Polygon") {
          feature.geometry.coordinates[0].forEach((coord) => {
            bounds.extend(coord);
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygon) => {
            polygon[0].forEach((coord) => {
              bounds.extend(coord);
            });
          });
        }

        if (map.getSource("highlight")) {
          map.getSource("highlight").setData(feature);
        } else {
          map.addSource("highlight", {
            type: "geojson",
            data: feature,
          });
          map.addLayer({
            id: "highlight-layer",
            type: "line",
            source: "highlight",
            paint: {
              "line-color": "red",
              "line-width": 0.5,
            },
          });
        }

        map.fitBounds(bounds, { padding: 20 });
      });
    } else {
      body.innerHTML = `<tr><td colspan="${headerRow.children.length}">No data available</td></tr>`;
    }
  }

  function addMapHover(map, data, infoId, topic) {
    const infoDiv = document.getElementById(infoId);

    map.off("mousemove", "data-layer");
    map.off("mouseleave", "data-layer");

    if (topic === "Foreign-Born") {
      console.log("❌ Hover disabled for Foreign-Born map.");
      infoDiv.style.display = "none";
      return;
    }

    // Use mousemove on the map itself with enhanced detection
    map.on("mousemove", (e) => {
      // Create a small buffer around the mouse point for better detection
      const bbox = [
        [e.point.x - 2, e.point.y - 2],
        [e.point.x + 2, e.point.y + 2],
      ];

      // Query rendered features with a small bbox instead of just a point
      const features = map.queryRenderedFeatures(bbox, {
        layers: ["data-layer"],
      });

      if (features.length > 0) {
        map.getCanvas().style.cursor = "pointer";

        // Convert mouse position to geographic coordinates
        const mouseCoords = map.unproject(e.point);
        const mousePoint = turf.point([mouseCoords.lng, mouseCoords.lat]);

        // Find the smallest polygon that actually contains the mouse point
        let selectedFeature = features[0];
        let smallestArea = Infinity;

        features.forEach((feature) => {
          try {
            // Check if the mouse point is actually inside this polygon
            const isInside = turf.booleanPointInPolygon(
              mousePoint,
              feature.geometry
            );

            if (isInside) {
              const area = turf.area(feature.geometry);
              if (area < smallestArea) {
                smallestArea = area;
                selectedFeature = feature;
              }
            }
          } catch (error) {
            console.warn("Error processing feature:", error);
          }
        });

        const feature = selectedFeature;
        const properties = feature.properties;

        let infoContent = "";
        for (const key in properties) {
          const keyStr = String(key).trim();
          const fieldsToHideStr = fieldsToHide.map((field) =>
            String(field).trim()
          );

          if (!fieldsToHideStr.includes(keyStr)) {
            const displayKey = fieldMappings[key] || key;
            let value = properties[key];

            if (!isNaN(value) && value !== null && value !== "") {
              value = parseFloat(value).toFixed(2);
            }

            infoContent += `<strong>${displayKey}:</strong> ${value}<br>`;
          }
        }

        infoDiv.innerHTML = infoContent;
        infoDiv.style.display = "block";

        // Highlight only the topmost feature (the one directly under the mouse)
        map.getSource("hover").setData({
          type: "FeatureCollection",
          features: [feature],
        });
      } else {
        // No features found at cursor position
        map.getCanvas().style.cursor = "";
        infoDiv.style.display = "none";

        map
          .getSource("hover")
          .setData({ type: "FeatureCollection", features: [] });
      }
    });

    // Keep the mouseleave handler for the entire map
    map.on("mouseleave", () => {
      map.getCanvas().style.cursor = "";
      infoDiv.style.display = "none";

      map
        .getSource("hover")
        .setData({ type: "FeatureCollection", features: [] });
    });
  }

  function addZoomToExtentButton() {
    const button = document.createElement("button");
    button.className = "zoom-to-extent-button compare-zoom-to-extent";
    button.innerHTML = '<img src="img/extent.png" alt="Zoom to Extent">';

    const zoomTooltip = document.createElement("div");
    zoomTooltip.className = "zoom-to-extent-tooltip";
    zoomTooltip.textContent = "Zoom to Extent";
    zoomTooltip.style.visibility = "hidden";

    button.addEventListener("mouseenter", () => {
      zoomTooltip.style.visibility = "visible";
    });

    button.addEventListener("mouseleave", () => {
      zoomTooltip.style.visibility = "hidden";
    });

    button.addEventListener("click", () => {
      const zoomLevel = 3;

      const zoomOptions = {
        center: [-98.35, 39.5],
        zoom: zoomLevel,
        essential: true,
        pitch: 0,
        bearing: 0,
      };

      map1.flyTo(zoomOptions);
      map2.flyTo(zoomOptions);
    });

    button.appendChild(zoomTooltip);

    const container = document.getElementById("container-compare");
    if (container) {
      container.appendChild(button);
    } else {
      console.error(
        "Container for compare maps not found! Ensure you have an element with ID 'container-compare'."
      );
    }
  }

  function showMapNotAvailableModal(topic, year, mapNumber = null) {
    const modal = document.getElementById("map-not-available-modal");
    const messageElement = document.getElementById("modal-compare-message");

    let message;
    let duration;

    // Check if this is a "select topic first" scenario
    if (
      mapNumber &&
      (!topic || topic === "Select a Topic" || topic === "Select")
    ) {
      message = `Please select a topic for Map ${mapNumber} before choosing a year.`;
      duration = 2000; // 2 seconds for "select topic" message
    } else {
      // Regular "map not available" scenario
      message = `${topic} map is not available for the year ${year}. Please select another year to compare.`;
      duration = 1600; // 1.6 seconds for "map not available" message
    }

    messageElement.textContent = message;

    modal.style.display = "block";
    messageElement.style.fontFamily = "Arial, sans-serif";
    messageElement.style.fontSize = "16px";
    messageElement.style.fontWeight = "bold";
    messageElement.style.color = "#333";
    messageElement.style.textAlign = "center";

    setTimeout(() => {
      modal.style.display = "none";
    }, duration);
  }

  document
    .querySelector(".close-button-compare")
    .addEventListener("click", function () {
      document.getElementById("map-not-available-modal").style.display = "none";
    });

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("map-not-available-modal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  function displayLegend(mapId, type) {
    const container = document.getElementById(`legend-container-${mapId}`);
    if (!type) {
      container.innerHTML = "";
      container.style.display = "none";
    }
  }

  function handleMapSelectChange(mapId, tableId, infoId) {
    const selectElement = document.getElementById(`${mapId}-select`);
    const sliderElement = document.getElementById(`${mapId}-slider`);
    const selectedTopic = selectElement.value;
    const selectedYear = sliderElement.value;

    // Show/hide slider based on topic selection
    toggleSliderVisibility(mapId, selectedTopic);

    const map = mapId === "map1" ? map1 : map2;
    const tableElement = document.getElementById(tableId);

    if (
      selectedTopic === "Select a Topic" ||
      selectedTopic === "Select" ||
      !selectedTopic
    ) {
      console.warn(`Clearing ${mapId} because "Select a Topic" was chosen.`);

      unloadMapData(map);

      if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
        $(`#${tableId}`).DataTable().clear().destroy();
      }

      tableElement.style.visibility = "hidden";
      tableElement.style.height = "0";
      tableElement.innerHTML = "";

      displayLegend(mapId, "");

      // Show slider again when no topic is selected
      toggleSliderVisibility(mapId, "");
      return;
    }

    // For Native-Land, use fixed year 1990, for others use slider value
    const yearToUse = selectedTopic === "Native-Land" ? "1990" : selectedYear;

    const selectedFile = compareFiles.find(
      (file) => file.topic === selectedTopic && file.name.includes(yearToUse)
    )?.file;

    if (!selectedFile || selectedFile === "") {
      console.warn(`No map available for ${selectedTopic} in ${yearToUse}`);

      unloadMapData(map);

      if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
        $(`#${tableId}`).DataTable().clear().destroy();
      }

      tableElement.style.visibility = "hidden";
      tableElement.style.height = "0";
      tableElement.innerHTML = "";

      displayLegend(mapId, "");

      // Only show modal for non-Native-Land topics since Native-Land only has 1990
      if (selectedTopic !== "Native-Land") {
        showMapNotAvailableModal(selectedTopic, yearToUse);
      }
      return;
    }

    console.log(`✅ Loading file: ${selectedFile} for ${mapId}`);

    const selectedGeojson = compareFiles.find(
      (file) => file.topic === selectedTopic && file.file === selectedFile
    );
    if (selectedGeojson && selectedFile) {
      console.log(`🎨 Legend to display: ${selectedGeojson.legend}`);
      const legendType = getLegendTypeFromValue(selectedTopic);
      renderLegend(mapId, legendType, yearToUse);
    } else {
      displayLegend(mapId, "");
    }

    tableElement.style.visibility = "visible";
    tableElement.style.height = "auto";

    if ($.fn.DataTable.isDataTable(`#${tableId}`)) {
      $(`#${tableId}`).DataTable().clear().destroy();
    }
    tableElement.innerHTML = `<thead><tr id="${tableId}-header"></tr></thead><tbody id="${tableId}-body"></tbody>`;

    if (map.loaded()) {
      loadGeoJSON(map, selectedFile, tableId, infoId, selectedTopic);
    } else {
      map.on("load", () =>
        loadGeoJSON(map, selectedFile, tableId, infoId, selectedTopic)
      );
    }
  }

  function renderLegend(mapId, type, year) {
    const container = document.getElementById(`legend-container-${mapId}`);
    container.innerHTML = "";

    if (!type) {
      container.style.display = "none";
      return;
    }

    const legendDefs = {
      density: {
        title: "Population Density (per Sq. km)",
        ramp: [
          { color: "#f7f7f7", label: "2" },
          { color: "#cccccc", label: "10" },
          { color: "#969696", label: "50" },
          { color: "#636363", label: "200" },
          { color: "#252525", label: ">200" },
        ],

        nullColor: "#fbece6",
        nullLabel: "Null",
      },
      migration: {
        title: "Net Flow Ratio (%)",
        ramp: [
          { color: "#e5988f", label: "-30" },
          { color: "#f0c5bb", label: "-15" },
          { color: "#fddbc7", label: "0" },
          { color: "#d1e5f0", label: "15" },
          { color: "#92c5de", label: "30" },
          { color: "#4393c3", label: ">30" },
        ],
        nullColor: "grey",
        nullLabel: "Null",
      },
      foreign: {
        title: "Foreign-Born Population (%)",
        ramp: [
          { color: "#fde0dd", label: "0-10" },
          { color: "#f7d1cb", label: "10-30" },
          { color: "#f7cac5", label: "30-50" },
          { color: "#fa9fb5", label: "50-70" },
          { color: "#e96a88", label: ">70" },
        ],
        nullColor: "grey",
        nullLabel: "Null",
      },
    };

    const legend = legendDefs[type];
    if (!legend) return;

    const wrapper = document.createElement("div");
    wrapper.className = "legend-wrapper";

    const title = document.createElement("div");
    title.className = "legend-title-bar";
    title.textContent = legend.title;

    // Create the ramp row that will contain year + ramp + null value
    const rampRow = document.createElement("div");
    rampRow.className = "legend-ramp-row";

    // Add year on the left side of the ramp
    const yearElement = document.createElement("div");
    yearElement.className = "legend-year-left";
    yearElement.textContent = year;

    // Create the color ramp container
    const rampContainer = document.createElement("div");
    rampContainer.className = "legend-ramp";

    legend.ramp.forEach(({ color }) => {
      const tick = document.createElement("div");
      tick.className = "legend-tick";
      tick.style.backgroundColor = color;
      rampContainer.appendChild(tick);
    });

    // Add year, ramp, and null value to the ramp row
    rampRow.appendChild(yearElement);
    rampRow.appendChild(rampContainer);

    // Add null value box if it exists
    if (legend.nullColor) {
      const nullBox = document.createElement("div");
      nullBox.className = "legend-null-inline";

      const colorBox = document.createElement("div");
      colorBox.className = "null-color-box";
      colorBox.style.backgroundColor = legend.nullColor;

      const label = document.createElement("span");
      label.textContent = legend.nullLabel;

      nullBox.appendChild(colorBox);
      nullBox.appendChild(label);
      rampRow.appendChild(nullBox);
    }

    // Create the labels row for the ramp values
    const compactRangeRow = document.createElement("div");
    compactRangeRow.className = "legend-labels";
    compactRangeRow.style.position = "relative";

    const positionSets = {
      5: ["10%", "30%", "50%", "70%", "90%"],
      6: ["8%", "25%", "42%", "58%", "75%", "92%"],
    };

    const numLabels = legend.ramp.length;
    const labelPositions =
      positionSets[numLabels] ||
      Array.from(
        { length: numLabels },
        (_, i) => `${((i + 0.5) / numLabels) * 100}%`
      );

    legend.ramp.forEach(({ label }, index) => {
      const span = document.createElement("div");
      span.className = "legend-tick-label";
      span.style.position = "absolute";
      span.style.left = labelPositions[index];
      span.style.transform = "translateX(-50%)";
      span.style.width = "auto";
      span.textContent = label;
      compactRangeRow.appendChild(span);
    });

    // Append elements to wrapper - note no separate subtitle
    wrapper.appendChild(title);
    wrapper.appendChild(rampRow);
    wrapper.appendChild(compactRangeRow);

    container.appendChild(wrapper);
    container.style.display = "block";
  }

  function getLegendTypeFromValue(value) {
    switch (value) {
      case "Population":
        return "density";
      case "Migration":
        return "migration";
      case "Foreign-Born":
        return "foreign";
      case "Native-Land":
        return null; // No legend for Native-Land
      default:
        return null;
    }
  }

  function initializeCompareTool() {
    // Modified event listeners to include slider visibility toggle
    document.getElementById("map1-select").addEventListener("change", () => {
      handleMapSelectChange("map1", "table1", "map1-info");
    });

    document.getElementById("map2-select").addEventListener("change", () => {
      handleMapSelectChange("map2", "table2", "map2-info");
    });

    document
      .getElementById("map1-slider")
      .addEventListener("input", function () {
        document.getElementById("map1-year").textContent = this.value;

        const selectedTopic = document.getElementById("map1-select").value;

        // Check if no topic is selected
        if (
          !selectedTopic ||
          selectedTopic === "Select a Topic" ||
          selectedTopic === "Select"
        ) {
          showMapNotAvailableModal(selectedTopic, this.value, 1);
          return;
        }

        // Only trigger map change if not Native-Land (since slider is hidden)
        if (selectedTopic !== "Native-Land") {
          handleMapSelectChange("map1", "table1", "map1-info");
        }
      });

    document
      .getElementById("map2-slider")
      .addEventListener("input", function () {
        document.getElementById("map2-year").textContent = this.value;

        const selectedTopic = document.getElementById("map2-select").value;

        // Check if no topic is selected
        if (
          !selectedTopic ||
          selectedTopic === "Select a Topic" ||
          selectedTopic === "Select"
        ) {
          showMapNotAvailableModal(selectedTopic, this.value, 2);
          return;
        }

        // Only trigger map change if not Native-Land (since slider is hidden)
        if (selectedTopic !== "Native-Land") {
          handleMapSelectChange("map2", "table2", "map2-info");
        }
      });

    // Inject initial messages
    injectInitialMessage("table1", "Pick a map from the dropdown above.");
    injectInitialMessage("table2", "Choose a map to compare.");

    // Table toggle buttons
    const showTableBtn = document.getElementById("show-table");
    const hideTableBtn = document.getElementById("hide-table");
    const tablesContainer = document.getElementById("tables-container");
    const compareContainer = document.getElementById("container-compare");

    // Initialize state
    showTableBtn.style.display = "block";
    hideTableBtn.style.display = "none";
    tablesContainer.classList.remove("show");
    compareContainer.classList.remove("with-table");

    // Show table
    showTableBtn.addEventListener("click", () => {
      compareContainer.classList.add("with-table");
      tablesContainer.classList.add("show");

      showTableBtn.style.display = "none";
      hideTableBtn.style.display = "block";
    });

    // Hide table
    hideTableBtn.addEventListener("click", () => {
      compareContainer.classList.remove("with-table");
      tablesContainer.classList.remove("show");

      showTableBtn.style.display = "block";
      hideTableBtn.style.display = "none";
    });

    // Legend toggle logic (unchanged)
    document.querySelectorAll(".toggle-compare-legend").forEach((button) => {
      button.addEventListener("click", function () {
        const legendContent = this.parentElement.nextElementSibling;
        const legendLabel = this.nextElementSibling;
        if (legendContent.style.display === "block") {
          legendContent.style.display = "none";
          legendLabel.style.display = "inline";
          this.textContent = "+";
        } else {
          legendContent.style.display = "block";
          legendLabel.style.display = "none";
          this.textContent = "-";
        }
      });
    });

    // Collapsible control box logic (unchanged)
    document
      .getElementById("toggle-control-box")
      .addEventListener("click", function () {
        const controlBoxContent = document.getElementById(
          "control-box-content"
        );
        const controlBox = document.querySelector(".control-box");
        const icon = this.querySelector("i");

        const isOpen =
          controlBoxContent.style.display === "block" ||
          controlBoxContent.style.display === "";

        if (isOpen) {
          controlBoxContent.style.display = "none";
          controlBox.classList.add("collapsed");
          icon.classList.remove("bi-arrow-bar-left");
          icon.classList.add("bi-arrow-bar-right");
        } else {
          controlBoxContent.style.display = "block";
          controlBox.classList.remove("collapsed");
          icon.classList.remove("bi-arrow-bar-right");
          icon.classList.add("bi-arrow-bar-left");
        }
      });
  }

  let compareFiles = [];
  let fieldsToHide = [];
  let fieldMappings = {};

  Promise.all([
    fetch("assets/config/compareFiles.json").then((res) => res.json()),
    fetch("assets/config/fieldsToHide.json").then((res) => res.json()),
    fetch("assets/config/fieldMappings.json").then((res) => res.json()),
  ])
    .then(([files, fields, mappings]) => {
      compareFiles = files;
      fieldsToHide = fields;
      fieldMappings = mappings;

      initializeCompareTool();
    })
    .catch((error) => {
      console.error("Error loading configuration files:", error);
    });
});
