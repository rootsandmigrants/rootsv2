// =============================================================================

// colonyPopup.js - Updated with native territory state management and complete disable/enable functionality

const ColonyPopup = {
  // Colony data storage
  colonyData: null,
  map: null,
  popup: null,
  isInitialized: false,
  currentYear: 1607, // Track the current year being displayed

  // Event markers management
  currentMarkers: [], // Store current year's markers
  markersVisible: true, // Track marker visibility state

  // 🆕 NEW: Native territories state management
  nativeTerritoriesActive: false, // Track if native territories are currently active
  clickListenersEnabled: true, // Track if click listeners should be active

  // Single color for all markers
  markerColor: "#808080", // Red color for all event markers

  // Initialize the module
  async init(mapInstance) {
    // Prevent multiple initializations
    if (this.isInitialized) {
      console.warn("Colony popup module already initialized");
      return;
    }

    this.map = mapInstance;

    // Create the popup instance - Enable closeOnClick for outside clicks
    this.popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false, //
      maxWidth: "350px",
    });

    // Load all data from single file
    await this.loadAllData();

    // Add click listeners
    this.addClickListeners();

    // 🔄 Don't call updateEventMarkers() here - wait for setCurrentYear() after shapefile loads
    // this.updateEventMarkers();

    this.isInitialized = true;

    console.log(
      "✅ Colony popup module with native territory state management initialized"
    );
  },

  // 🆕 NEW: Method to disable popup functionality when native territories are active
  disablePopupFunctionality() {
    this.nativeTerritoriesActive = true;
    this.clickListenersEnabled = false;

    // Close any open popup
    this.closePopup();

    // Hide all event markers
    this.hideEventMarkers();

    console.log(
      "✅ Colony popup functionality DISABLED (Native territories active)"
    );
  },

  // 🆕 NEW: Method to enable popup functionality when native territories are inactive
  enablePopupFunctionality() {
    this.nativeTerritoriesActive = false;
    this.clickListenersEnabled = true;

    // Show event markers if they should be visible
    this.showEventMarkers();

    console.log(
      "✅ Colony popup functionality ENABLED (Native territories inactive)"
    );
  },

  // 🆕 NEW: Method to check if popup functionality should be active
  isPopupFunctionalityEnabled() {
    return (
      this.isInitialized &&
      this.clickListenersEnabled &&
      !this.nativeTerritoriesActive
    );
  },

  // Method to update the current year (call this when year changes in your map)
  setCurrentYear(year) {
    console.log(
      `Setting colony popup year to: ${year} (previous: ${this.currentYear})`
    );

    // Update the year
    this.currentYear = year;

    // ✅ Close any open popups when year changes (slider change)
    this.closePopup();

    // Always update event markers, even if year is the same (for initial load)
    if (this.isPopupFunctionalityEnabled()) {
      this.updateEventMarkers();
      console.log(`✅ Event markers updated for year ${year}`);
    } else {
      console.log(`⚠️ Markers not updated - popup functionality disabled`);
    }
  },

  // Updated: Method to hide all event markers
  hideEventMarkers() {
    this.markersVisible = false;
    this.currentMarkers.forEach((marker) => {
      if (marker && marker.getElement()) {
        marker.getElement().style.display = "none";
      }
    });
    console.log("✅ Event markers hidden");
  },

  // Updated: Method to show all event markers (only if popup functionality is enabled)
  showEventMarkers() {
    // Only show markers if popup functionality is enabled
    if (!this.isPopupFunctionalityEnabled()) {
      console.log("⚠️ Cannot show markers - popup functionality disabled");
      return;
    }

    this.markersVisible = true;
    this.currentMarkers.forEach((marker) => {
      if (marker && marker.getElement()) {
        marker.getElement().style.display = "block";
      }
    });
    console.log("✅ Event markers shown");
  },

  // Updated: Method to toggle marker visibility
  toggleEventMarkers(visible) {
    if (visible) {
      this.showEventMarkers();
    } else {
      this.hideEventMarkers();
    }
  },

  // Load all data from single coloniesKey.json file
  async loadAllData() {
    try {
      const response = await fetch("assets/config/coloniesKey.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch coloniesKey.json: ${response.status}`);
      }
      const data = await response.json();

      // Store only colony data (no need for categories)
      this.colonyData = data;

      console.log("✅ Colony data loaded from coloniesKey.json");
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      throw error;
    }
  },

  // Updated: Update event markers for current year (only if functionality is enabled)
  updateEventMarkers() {
    if (!this.colonyData || !this.map) return;

    // Remove existing markers
    this.clearEventMarkers();

    // Don't add new markers if popup functionality is disabled
    if (!this.isPopupFunctionalityEnabled()) {
      console.log("⚠️ Skipping marker update - popup functionality disabled");
      return;
    }

    // Collect all events for current year from all colonies
    const currentYearEvents = [];

    Object.entries(this.colonyData.colonies).forEach(
      ([colonyKey, colonyInfo]) => {
        if (colonyInfo.events) {
          const colonyEvents = colonyInfo.events
            .filter((event) => event.year === this.currentYear)
            .map((event) => ({
              ...event,
              colonyName: colonyKey,
            }));
          currentYearEvents.push(...colonyEvents);
        }
      }
    );

    // Add markers for current year events
    currentYearEvents.forEach((event) => {
      this.addEventMarker(event);
    });

    console.log(
      `Added ${currentYearEvents.length} event markers for year ${this.currentYear}`
    );
  },

  // Add a single event marker to the map
  addEventMarker(event) {
    // Create pin-shaped marker element
    const markerElement = document.createElement("div");
    markerElement.className = "event-marker-pin";

    // Create pin shape using CSS
    markerElement.innerHTML = `
      <div class="pin-head"></div>
      <div class="pin-point"></div>
    `;

    // Make markers completely non-interactive to prevent click interference
    markerElement.style.cssText = `
      width: 24px;
      height: 36px;
      opacity: 0.9;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
      transform-origin: center bottom;
      pointer-events: none;
      user-select: none;
      display: ${
        this.markersVisible && this.isPopupFunctionalityEnabled()
          ? "block"
          : "none"
      };
    `;

    // Style the pin head (circular top part) with single color
    const pinHead = markerElement.querySelector(".pin-head");
    pinHead.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: ${this.markerColor};
      border: 3px solid white;
      border-radius: 50%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      box-sizing: border-box;
      pointer-events: none;
    `;

    // Style the pin point (bottom triangle) with single color
    const pinPoint = markerElement.querySelector(".pin-point");
    pinPoint.style.cssText = `
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 12px solid ${this.markerColor};
      position: absolute;
      top: 21px;
      left: 6px;
      z-index: 1;
      pointer-events: none;
    `;

    // Create and add marker to map - completely static
    const marker = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
      draggable: false,
      clickTolerance: 0, // Prevent any click tolerance
    })
      .setLngLat(event.coordinates)
      .addTo(this.map);

    // Store marker for cleanup
    this.currentMarkers.push(marker);
  },

  // Clear all current event markers
  clearEventMarkers() {
    if (this.currentMarkers && this.currentMarkers.length > 0) {
      console.log(`Removing ${this.currentMarkers.length} existing markers`);

      this.currentMarkers.forEach((marker, index) => {
        try {
          if (marker && marker.remove) {
            marker.remove();
          }
        } catch (error) {
          console.warn(`Error removing marker ${index}:`, error);
        }
      });

      // Clear the array completely
      this.currentMarkers.length = 0;
      this.currentMarkers = [];
    }
  },

  // Method to change marker color (optional - allows customization)
  setMarkerColor(color) {
    this.markerColor = color;
    // Update existing markers with new color (only if functionality is enabled)
    if (this.isPopupFunctionalityEnabled()) {
      this.updateEventMarkers();
    }
    console.log(`Marker color updated to: ${color}`);
  },

  // Find colony by name with flexible matching
  findColonyByName(name) {
    if (!this.colonyData || !this.colonyData.colonies) return null;

    // Clean the input name
    const cleanName = name.trim().toLowerCase();
    console.log(`🔍 Looking for colony data for: "${cleanName}"`);

    // Handle historical colony name variations - map to standard names
    const colonyNameMappings = {
      "massachusetts bay": "Massachusetts",
      "mass bay": "Massachusetts",
      "massachusetts bay colony": "Massachusetts",
      plymouth: "Massachusetts", // Plymouth was merged into Massachusetts
      "new amsterdam": "New York", // New Amsterdam became New York
      "new netherland": "New York",
      "province of pennsylvania": "Pennsylvania",
      "province of maryland": "Maryland",
      "province of virginia": "Virginia",
      "dominion of virginia": "Virginia",
      "province of carolina": "North Carolina",
      "province of georgia": "Georgia",
      "connecticut colony": "Connecticut",
      "rhode island and providence plantations": "Rhode Island",
      "colony of rhode island": "Rhode Island",
    };

    // First try the mapped name
    let standardName = colonyNameMappings[cleanName];
    if (standardName && this.colonyData.colonies[standardName]) {
      console.log(
        `✅ Found colony by mapping: "${cleanName}" -> "${standardName}"`
      );
      return { key: standardName, ...this.colonyData.colonies[standardName] };
    }

    // Try exact match first (case insensitive)
    for (let [colonyKey, colonyInfo] of Object.entries(
      this.colonyData.colonies
    )) {
      if (colonyKey.toLowerCase() === cleanName) {
        console.log(
          `✅ Found colony by exact match: "${cleanName}" -> "${colonyKey}"`
        );
        return { key: colonyKey, ...colonyInfo };
      }
    }

    console.log("All colony keys:", Object.keys(this.colonyData.colonies));

    // Enhanced partial matching with length requirements
    for (let [colonyKey, colonyInfo] of Object.entries(
      this.colonyData.colonies
    )) {
      const colonyKeyLower = colonyKey.toLowerCase();
      const minLength = Math.min(cleanName.length, colonyKeyLower.length);
      const maxLength = Math.max(cleanName.length, colonyKeyLower.length);

      // Only try partial matching if:
      // 1. Both names are substantial (>4 chars)
      // 2. Length difference isn't too extreme (within 2x)
      // 3. Shorter name is at least 60% of longer name
      if (
        minLength > 4 &&
        maxLength / minLength < 2 &&
        minLength / maxLength > 0.6
      ) {
        if (
          cleanName.includes(colonyKeyLower) ||
          colonyKeyLower.includes(cleanName)
        ) {
          console.log(
            `✅ Found colony by smart partial match: "${cleanName}" -> "${colonyKey}"`
          );
          return { key: colonyKey, ...colonyInfo };
        }
      }
    }

    // Try common abbreviations and alternatives
    const nameMapping = {
      VA: "Virginia",
      MA: "Massachusetts",
      NH: "New Hampshire",
      MD: "Maryland",
      CT: "Connecticut",
      RI: "Rhode Island",
      DE: "Delaware",
      NY: "New York",
      NJ: "New Jersey",
      SC: "South Carolina",
      PA: "Pennsylvania",
      NC: "North Carolina",
      GA: "Georgia",
      DC: "District of Columbia",
      "D.C.": "District of Columbia",
    };

    const mappedName = nameMapping[cleanName.toUpperCase()];
    if (mappedName && this.colonyData.colonies[mappedName]) {
      console.log(
        `✅ Found colony by abbreviation: "${cleanName}" -> "${mappedName}"`
      );
      return { key: mappedName, ...this.colonyData.colonies[mappedName] };
    }

    console.log(`❌ No colony data found for: "${cleanName}"`);
    return null;
  },

  // Check if a feature represents a colony, territory, state, or federal district that should show popups
  isValidColonyOrTerritory(feature) {
    const name = this.getColonyNameFromFeature(feature);

    console.log(`🔍 Checking feature with name: "${name}"`);

    if (!name) return false;

    const cleanName = name.toLowerCase().trim();
    console.log(`🔍 Cleaned name: "${cleanName}"`);

    // Handle historical colony name variations
    const colonyNameMappings = {
      "massachusetts bay": "massachusetts",
      "mass bay": "massachusetts",
      "massachusetts bay colony": "massachusetts",
      plymouth: "massachusetts", // Plymouth was merged into Massachusetts
      "new amsterdam": "new york", // New Amsterdam became New York
      "new netherland": "new york",
      "province of pennsylvania": "pennsylvania",
      "province of maryland": "maryland",
      "province of virginia": "virginia",
      "dominion of virginia": "virginia",
      "province of carolina": "north carolina", // or south carolina, but we'll default to north
      "province of georgia": "georgia",
      "connecticut colony": "connecticut",
      "rhode island and providence plantations": "rhode island",
      "colony of rhode island": "rhode island",
    };

    // STEP 1: Use existing colonyNameMappings first
    let mappedName = colonyNameMappings[cleanName];
    console.log(`🔍 Mapped name: "${mappedName}"`);

    // Check if it's one of the 13 original colonies
    const validColonyNames = [
      "virginia",
      "massachusetts",
      "new hampshire",
      "maryland",
      "connecticut",
      "rhode island",
      "delaware",
      "new york",
      "new jersey",
      "south carolina",
      "pennsylvania",
      "north carolina",
      "georgia",
    ];

    // Check mapped name first
    if (mappedName && validColonyNames.includes(mappedName)) {
      console.log(
        `✅ Found colony by mapping: ${name} -> mapped to: ${mappedName} -> type: "colony"`
      );
      return { type: "colony", name: mappedName };
    }

    // Check exact match
    if (validColonyNames.includes(cleanName)) {
      console.log(`✅ Found colony by exact match: ${name} -> type: "colony"`);
      return { type: "colony", name: cleanName };
    }

    // STEP 2: Enhanced partial matching with length requirements
    for (let colonyName of validColonyNames) {
      const minLength = Math.min(cleanName.length, colonyName.length);
      const maxLength = Math.max(cleanName.length, colonyName.length);

      // Only try partial matching if:
      // 1. Both names are substantial (>4 chars)
      // 2. Length difference isn't too extreme (within 2x)
      // 3. Shorter name is at least 60% of longer name
      if (
        minLength > 4 &&
        maxLength / minLength < 2 &&
        minLength / maxLength > 0.6
      ) {
        if (cleanName.includes(colonyName) || colonyName.includes(cleanName)) {
          console.log(
            `✅ Found colony by smart partial match: ${name} -> ${colonyName} -> type: "colony"`
          );
          return { type: "colony", name: colonyName };
        }
      }
    }

    // Check for federal districts
    const federalDistricts = [
      "district of columbia",
      "washington district",
      "washington d.c.",
      "washington dc",
      "d.c.",
      "dc",
    ];

    if (
      federalDistricts.some(
        (district) =>
          cleanName.includes(district) || district.includes(cleanName)
      )
    ) {
      console.log(`✅ Found federal district: ${name}`);
      return { type: "federal_district", name: "District of Columbia" };
    }

    // Check if the name contains "Territory" (case insensitive)
    if (cleanName.includes("territory")) {
      console.log(`✅ Found territory: ${name}`);
      return { type: "territory", name: name };
    }

    // Everything else is a state - accept it
    console.log(`✅ Found state: ${name} -> type: "state"`);
    return { type: "state", name: name };
  },

  // Get the proper designation for the popup header
  getDesignation(entityInfo) {
    console.log(
      `🔍 Getting designation for: ${entityInfo.name}, type: ${entityInfo.type}, current year: ${this.currentYear}`
    );

    if (entityInfo.type === "colony") {
      // Use actual ratification dates for each colony
      const ratificationDates = {
        delaware: 1787,
        pennsylvania: 1787,
        "new jersey": 1787,
        georgia: 1788,
        connecticut: 1788,
        massachusetts: 1788,
        maryland: 1788,
        "south carolina": 1788,
        "new hampshire": 1788,
        virginia: 1788,
        "new york": 1788,
        "north carolina": 1789,
        "rhode island": 1790,
      };

      const colonyName = entityInfo.name.toLowerCase().trim();
      const ratificationYear = ratificationDates[colonyName];

      console.log(
        `🔍 Colony name: "${colonyName}", ratification year: ${ratificationYear}, current year: ${this.currentYear}`
      );

      if (ratificationYear && this.currentYear >= ratificationYear) {
        console.log(
          `✅ Returning "State" - current year (${this.currentYear}) >= ratification year (${ratificationYear})`
        );
        return "State";
      } else {
        console.log(
          `✅ Returning "Colony" - current year (${this.currentYear}) < ratification year (${ratificationYear})`
        );
        return "Colony";
      }
    }
    // Handle federal districts
    else if (entityInfo.type === "federal_district") {
      // D.C. was established in 1790 from the Residence Act
      if (this.currentYear >= 1790) {
        return "Federal District";
      } else {
        // Before 1790, the land was part of Maryland and Virginia
        return "Colonial Territory";
      }
    } else if (entityInfo.type === "territory") {
      return "Territory";
    } else {
      return "State";
    }
  },

  // Get the display name for the popup header (shows historical names when appropriate)
  getDisplayName(originalName, colony, currentYear) {
    // If we have the original feature name and it's a historical variant, use it for early years
    const historicalNames = {
      "massachusetts bay": {
        displayName: "Massachusetts Bay Colony",
        useUntilYear: 1691,
      },
      "mass bay": {
        displayName: "Massachusetts Bay Colony",
        useUntilYear: 1691,
      },
      "massachusetts bay colony": {
        displayName: "Massachusetts Bay Colony",
        useUntilYear: 1691,
      },
      "new amsterdam": { displayName: "New Amsterdam", useUntilYear: 1664 },
      "new netherland": { displayName: "New Netherland", useUntilYear: 1664 },
    };

    const cleanOriginal = originalName ? originalName.toLowerCase().trim() : "";
    const historicalInfo = historicalNames[cleanOriginal];

    if (historicalInfo && currentYear <= historicalInfo.useUntilYear) {
      return historicalInfo.displayName;
    }

    // Otherwise use the standardized colony name
    return colony.key;
  },

  // Format the popup HTML content
  formatPopupContent(colony, entityInfo, originalFeatureName = null) {
    if (!colony) {
      return `
        <div style="padding: 20px; text-align: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="color: #6b7280; font-size: 14px;">Colony information not found</div>
        </div>`;
    }

    const designation = this.getDesignation(entityInfo);
    const displayName = this.getDisplayName(
      originalFeatureName,
      colony,
      this.currentYear
    );

    // Filter events to only show those that occurred in the current year
    let relevantEvents = [];
    if (colony.events && colony.events.length > 0) {
      relevantEvents = colony.events.filter((event) => {
        const eventYear = parseInt(event.year);
        const currentYear = parseInt(this.currentYear);
        return eventYear === currentYear;
      });
    }

    let html = `
      <div style="
        max-width: 240px; 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 0;
        margin: 0;
      ">
        <!-- Header Section -->
        <div style="
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          color: white;
          padding: 12px;
          border-radius: 6px 6px 0 0;
        ">
          <h3 style="
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.2;
          ">
            ${displayName}
          </h3>
          <div style="
            font-size: 11px;
            opacity: 0.9;
            margin-top: 2px;
            font-weight: 500;
          ">
            ${designation} • ${this.currentYear}
          </div>
        </div>
        
        <!-- Events Section -->
        <div style="padding: 12px;">
    `;

    // Show events prominently
    if (relevantEvents.length > 0) {
      relevantEvents.forEach((event, index) => {
        const colors = [
          { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
          { bg: "#f0f9ff", border: "#3b82f6", text: "#1e40af" },
          { bg: "#f0fdf4", border: "#10b981", text: "#065f46" },
          { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
        ];
        const color = colors[index % colors.length];

        html += `
          <div style="
            padding: 10px;
            background: ${color.bg};
            border-radius: 5px;
            border-left: 3px solid ${color.border};
            margin-bottom: ${index < relevantEvents.length - 1 ? "8px" : "0"};
          ">
            <div style="
              font-weight: 600;
              color: ${color.text};
              margin-bottom: 4px;
              font-size: 12px;
            ">
              ${event.title}
            </div>
            <div style="
              font-size: 11px;
              color: #4b5563;
              line-height: 1.3;
            ">
              ${event.description}
            </div>
          </div>
        `;
      });

      // Add collapsible details section
      html += `
        <details style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
          <summary style="
            cursor: pointer;
            font-size: 11px;
            color: #374151;
            font-weight: 600;
            padding: 6px 8px;
            background: #f8fafc;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            outline: none;
            user-select: none;
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          ">
            <span style="margin-right: 6px; font-size: 11px;">ℹ️</span>
            Basic Info
            <span style="margin-left: auto; font-size: 9px; color: #64748b;">▼</span>
          </summary>
          <div style="
            padding: 8px;
            background: #fafbff;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            font-size: 10px;
          ">
            <div style="margin-bottom: 6px;">
              <span style="font-weight: 600; color: #1e40af;">Founded:</span>
              <span style="color: #475569; margin-left: 6px;">${colony.founded}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span style="font-weight: 600; color: #047857;">Economy:</span>
              <span style="color: #475569; margin-left: 6px;">${colony.economic_focus}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: 600; color: #d97706;">Purpose:</span>
              <div style="color: #475569; margin-top: 2px; font-size: 9px; line-height: 1.3;">${colony.reason_for_founding}</div>
            </div>`;

      // Add key figures if they exist (in collapsible section)
      if (colony.key_figures && colony.key_figures.length > 0) {
        html += `
            <div style="margin-top: 8px;">
              <div style="font-weight: 600; color: #7c3aed; margin-bottom: 4px; font-size: 10px;">Key Figures:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                ${colony.key_figures
                  .map(
                    (figure) => `
                  <span style="
                    background: #f3e8ff;
                    color: #6b46c1;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: 500;
                    border: 1px solid #e9d5ff;
                  ">${figure}</span>
                `
                  )
                  .join("")}
              </div>
            </div>`;
      }

      html += `
          </div>
        </details>
      `;
    } else {
      // If no events, show a minimal message
      html += `
        <div style="
          text-align: center;
          color: #6b7280;
          font-size: 11px;
          padding: 6px;
        ">
          No events in ${this.currentYear}
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
    return html;
  },

  // Get colony name from feature properties
  getColonyNameFromFeature(feature) {
    const possibleNameFields = [
      "ColonyName",
      "STATENAM",
      "STATE_ABBR",
      "LABEL",
      "NAME",
      "name",
      "Name",
      "STATE_NAME",
      "COLONY",
    ];

    console.log(`🔍 Feature properties:`, feature.properties);

    for (let field of possibleNameFields) {
      if (feature.properties[field]) {
        console.log(
          `✅ Found name in field "${field}": "${feature.properties[field]}"`
        );
        return feature.properties[field];
      }
    }

    console.log(`❌ No name found in any field`);
    return null;
  },

  // Updated: Add click listeners to the map (now checks if functionality is enabled)
  addClickListeners() {
    // Add click event listener to the colony boundaries layer
    this.map.on("click", "us-boundaries-layer", (e) => {
      // 🆕 CRITICAL: Check if popup functionality is enabled before processing clicks
      if (!this.isPopupFunctionalityEnabled()) {
        console.log(
          "⚠️ Click ignored - popup functionality disabled (native territories active)"
        );
        return;
      }

      const features = e.features;
      if (features.length > 0) {
        const feature = features[0];
        const coordinates = e.lngLat;

        // Check if this is a valid colony, territory, state, or federal district
        const entityInfo = this.isValidColonyOrTerritory(feature);
        if (!entityInfo) {
          console.log("Clicked feature has no valid name:", feature.properties);
          return; // Exit early if no valid name found
        }

        // Close any existing popup before opening a new one
        this.closePopup();

        console.log(`Clicked on ${entityInfo.type}: ${entityInfo.name}`);

        // Find colony data
        const colony = this.findColonyByName(entityInfo.name);

        if (colony) {
          // Check if there are events for the current year before showing popup
          const relevantEvents = colony.events
            ? colony.events.filter((event) => {
                // Convert both to numbers for proper comparison
                const eventYear = parseInt(event.year);
                const currentYear = parseInt(this.currentYear);
                return eventYear === currentYear;
              })
            : [];

          // Only show popup if there are events for the current year
          if (relevantEvents.length > 0) {
            const originalFeatureName = this.getColonyNameFromFeature(feature);
            const popupContent = this.formatPopupContent(
              colony,
              entityInfo,
              originalFeatureName
            );

            // Show popup
            this.popup
              .setLngLat(coordinates)
              .setHTML(popupContent)
              .addTo(this.map);
          } else {
            console.log(
              `No events found for ${entityInfo.name} in year ${this.currentYear}`
            );
            // Don't show popup if no events for current year
          }
        } else {
          console.log(
            `Valid ${entityInfo.type} found but no data: ${entityInfo.name}`
          );
          // Don't show popup if no data found
        }
      }
    });
    // ✅ NEW: Add click listener to close popup when clicking on empty areas
    this.map.on("click", (e) => {
      // Only close if popup functionality is enabled and we're not clicking on a boundary
      if (!this.isPopupFunctionalityEnabled()) {
        return;
      }

      // Check if the click hit any features in the boundaries layer
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ["us-boundaries-layer"],
      });

      // If no boundary features were clicked, close the popup
      if (features.length === 0) {
        this.closePopup();
      }
    });

    // Updated: Add cursor pointer on hover - for all valid entities (also checks if functionality is enabled)
    this.map.on("mouseenter", "us-boundaries-layer", (e) => {
      if (
        this.isPopupFunctionalityEnabled() &&
        e.features.length > 0 &&
        this.isValidColonyOrTerritory(e.features[0])
      ) {
        this.map.getCanvas().style.cursor = "pointer";
      }
    });

    this.map.on("mouseleave", "us-boundaries-layer", () => {
      this.map.getCanvas().style.cursor = "";
    });

    console.log(
      "✅ Colony click listeners added with native territory state checking"
    );
  },

  // Method to manually show popup for a specific colony
  showColonyPopup(colonyName, coordinates) {
    if (!this.isInitialized) {
      console.warn("Colony popup module not initialized");
      return;
    }

    // 🆕 Check if popup functionality is enabled
    if (!this.isPopupFunctionalityEnabled()) {
      console.log(
        "⚠️ Cannot show popup - functionality disabled (native territories active)"
      );
      return;
    }

    // Close any existing popup before opening a new one
    this.closePopup();

    const colony = this.findColonyByName(colonyName);
    if (colony) {
      // Check if there are events for the current year before showing popup
      const relevantEvents = colony.events
        ? colony.events.filter((event) => {
            // Convert both to numbers for proper comparison
            const eventYear = parseInt(event.year);
            const currentYear = parseInt(this.currentYear);
            return eventYear === currentYear;
          })
        : [];

      // Only show popup if there are events for the current year
      if (relevantEvents.length > 0) {
        // Determine entity type for the designation
        const entityInfo = this.determineEntityType(colonyName);
        const popupContent = this.formatPopupContent(
          colony,
          entityInfo,
          colonyName
        );
        this.popup.setLngLat(coordinates).setHTML(popupContent).addTo(this.map);
      } else {
        console.log(
          `No events found for ${colonyName} in year ${this.currentYear}`
        );
        // Don't show popup if no events for current year
      }
    }
  },

  // Helper method to determine entity type for manual popup calls
  determineEntityType(name) {
    const cleanName = name.toLowerCase().trim();

    // Handle historical colony name variations
    const colonyNameMappings = {
      "massachusetts bay": "massachusetts",
      "mass bay": "massachusetts",
      "massachusetts bay colony": "massachusetts",
      plymouth: "massachusetts",
      "new amsterdam": "new york",
      "new netherland": "new york",
      "province of pennsylvania": "pennsylvania",
      "province of maryland": "maryland",
      "province of virginia": "virginia",
      "dominion of virginia": "virginia",
      "province of carolina": "north carolina",
      "province of georgia": "georgia",
      "connecticut colony": "connecticut",
      "rhode island and providence plantations": "rhode island",
      "colony of rhode island": "rhode island",
    };

    // Map the name if it has a historical variation
    let mappedName = colonyNameMappings[cleanName] || cleanName;

    const validColonyNames = [
      "virginia",
      "massachusetts",
      "new hampshire",
      "maryland",
      "connecticut",
      "rhode island",
      "delaware",
      "new york",
      "new jersey",
      "south carolina",
      "pennsylvania",
      "north carolina",
      "georgia",
    ];

    if (validColonyNames.includes(mappedName)) {
      return { type: "colony", name: mappedName };
    }

    // Check for federal districts
    const federalDistricts = [
      "district of columbia",
      "washington district",
      "washington d.c.",
      "washington dc",
      "d.c.",
      "dc",
    ];

    if (
      federalDistricts.some(
        (district) =>
          cleanName.includes(district) || district.includes(cleanName)
      )
    ) {
      return { type: "federal_district", name: "District of Columbia" };
    } else if (cleanName.includes("territory")) {
      return { type: "territory", name: name };
    } else {
      return { type: "state", name: name };
    }
  },

  // Helper method to get ratification year for a colony
  getRatificationYear(colonyName) {
    const ratificationDates = {
      delaware: 1787,
      pennsylvania: 1787,
      "new jersey": 1787,
      georgia: 1788,
      connecticut: 1788,
      massachusetts: 1788,
      maryland: 1788,
      "south carolina": 1788,
      "new hampshire": 1788,
      virginia: 1788,
      "new york": 1788,
      "north carolina": 1789,
      "rhode island": 1790,
    };

    return ratificationDates[colonyName.toLowerCase()] || null;
  },

  // Method to close the popup
  closePopup() {
    try {
      if (this.popup && this.popup.isOpen()) {
        this.popup.remove();
        console.log("✅ Popup closed");
      }
    } catch (error) {
      console.warn("Error closing popup:", error);
      // ✅ NEW: Force recreation of popup if there's an error
      this.popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false, // ✅ Keep the new setting
        maxWidth: "350px",
      });
    }
  },

  // Additional method to check if popup is currently open
  isPopupOpen() {
    return this.popup && this.popup.isOpen();
  },

  // Cleanup method
  destroy() {
    this.clearEventMarkers();
    this.closePopup();

    // Remove event listeners if map exists
    if (this.map) {
      try {
        this.map.off("click", "us-boundaries-layer");
        this.map.off("click"); // ✅ NEW: Remove the general click listener too

        this.map.off("mouseenter", "us-boundaries-layer");
        this.map.off("mouseleave", "us-boundaries-layer");
      } catch (error) {
        console.warn("Error removing event listeners:", error);
      }
    }

    // Reset state
    this.isInitialized = false;
    this.map = null;
    this.popup = null;
    this.colonyData = null;
    this.nativeTerritoriesActive = false;
    this.clickListenersEnabled = true;

    console.log("✅ Colony popup module destroyed");
  },

  // Method to reset and reinitialize if needed
  async reset(mapInstance) {
    this.destroy();
    await this.init(mapInstance);
  },
};
