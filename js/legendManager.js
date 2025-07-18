// ============================================================================
// SIMPLE LEGEND MANAGER - Population, Migration, Race Only
// WITH METADATA-BASED WARNING SYSTEM
// UPDATED: Year positioned between info icon and warning icon
// ============================================================================

const LegendManager = {
  // Simple configs for the 3 legend types you need
  configs: {
    populationDensity: {
      title: "Population Density (per Sq. km)",
      values: [0, 2, 10, 50, ">200"],
      positions: [1, 17, 34, 50, 68],
      colors: ["#f7f7f7", "#cccccc", "#969696", "#636363", "#252525"],
      nullColor: "#F0E6D6",
      nullLabel: "Null",
    },

    migration: {
      title: "Net Flow Ratio (%)",
      values: ["<-30", -15, 0, 15, 30, ">30"], // Changed ">70" to ">30"
      positions: [13, 29, 42, 55, 69, 83], // 5 positions for 5 classes - EASY TO CHANGE!
      colors: [
        "#e5988f", // < -30%
        "#f0c5bb", // -30% to -15%
        "#fddbc7", // -15% to 0%
        "#d1e5f0", // 0% to 15%
        "#92c5de", // 15% to 30%  // Changed "70%" to "30%"
        "#4393c3", // > 30%       // Changed "> 70%" to "> 30%"
      ],
      nullColor: "grey",
      nullLabel: "Null",
    },

    race: {
      title: "Population (%)", // Will be prefixed with race name
      // Race always has 5 classes + null
      positions: [18, 34, 52, 67, 82], // 5 positions for 5 classes - EASY TO CHANGE!
      nullColor: "grey",
      nullLabel: "Null",
    },
  },

  // Metadata storage for each legend type
  metadata: {
    populationDensity: {},
    migration: {},
    race: {},
  },

  // ============================================================================
  // METADATA LOADING
  // ============================================================================
  async loadMetadata(type) {
    let metadataUrl;

    switch (type) {
      case "populationDensity":
        metadataUrl = "assets/limit/populationMetadata.json";
        break;
      case "migration":
        metadataUrl = "assets/limit/migrationMetadata.json";
        break;
      case "race":
        metadataUrl = "assets/limit/raceMetadata.json";
        break;
      default:
        console.warn(`No metadata file defined for type: ${type}`);
        return;
    }

    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load metadata from ${metadataUrl}`);
      }

      this.metadata[type] = await response.json();
      console.log(`✅ Loaded ${type} metadata:`, this.metadata[type]);
    } catch (error) {
      console.warn(`❌ Could not load metadata for ${type}:`, error);
      this.metadata[type] = {};
    }
  },

  // Load all metadata files
  async loadAllMetadata() {
    await Promise.all([
      this.loadMetadata("populationDensity"),
      this.loadMetadata("migration"),
      this.loadMetadata("race"),
    ]);
    console.log("📊 All metadata loaded");
  },

  // ============================================================================
  // MAIN CREATE METHOD
  // ============================================================================
  create(type, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container '${containerId}' not found`);
      return;
    }

    container.innerHTML = "";

    if (type === "race") {
      this.createRaceLegend(
        container,
        options.subset,
        options.year,
        options.config
      );
    } else {
      this.createStandardLegend(container, type, options.year);
    }

    container.style.display = "block";

    // Auto-check for warnings after creating legend
    if (options.year) {
      this.checkAndShowWarning(type, options.year);
    }
  },

  // ============================================================================
  // STANDARD LEGEND (Population & Migration)
  // ============================================================================
  createStandardLegend(container, type, year) {
    const config = this.configs[type];
    if (!config) {
      console.error(`No config for type: ${type}`);
      return;
    }

    const decadeStart = Math.floor(year / 10) * 10;

    // Create gradient
    const gradientStops = config.colors
      .map((color, i) => {
        const start = (i / config.colors.length) * 100;
        const end = ((i + 1) / config.colors.length) * 100;
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(", ");

    // Info icon IDs for different types - KEEP YOUR EXISTING IDs
    const infoIconId =
      type === "populationDensity" ? "populationDensityInfo2" : "netFlowInfo";
    const warningIconId =
      type === "populationDensity"
        ? "population-warning-flag"
        : "migration-warning-flag";

    container.innerHTML = `
      <div class="legend-unified">
        <div class="legend-title-unified">
          ${config.title}
          <a href="#" id="${infoIconId}" class="info-icon">
            <i class="bi bi-info-circle"></i>
          </a>
          <div class="legend-year-in-title">${decadeStart}-${
      decadeStart + 9
    }</div>
          <span id="${warningIconId}" class="warning-icon" title="" style="display: none; cursor: pointer;">
            <i class="bi bi-flag-fill text-danger"></i>
          </span>
        </div>
        
        <div class="legend-bar-row-unified">
          <div class="legend-bar-unified" style="background: linear-gradient(to right, ${gradientStops})"></div>
          <div class="legend-null-container-unified">
            <div class="legend-null-label-unified">${config.nullLabel}</div>
            <div class="legend-null-unified" style="background: ${
              config.nullColor
            }"></div>
          </div>
        </div>
        
        <div class="legend-values-container-unified">
          ${config.values
            .map(
              (value, i) =>
                `<span class="legend-value-unified" style="left: ${config.positions[i]}%">${value}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  },

  // ============================================================================
  // RACE LEGEND (Always 5 classes + null)
  // ============================================================================
  createRaceLegend(container, subset, year, raceConfig) {
    if (!raceConfig || !raceConfig.thresholds || !raceConfig.colors) {
      console.error("Race config required with thresholds and colors");
      return;
    }

    // Race should always have 5 classes
    if (raceConfig.thresholds.length !== 5) {
      console.warn(
        `Race config has ${raceConfig.thresholds.length} thresholds, expected 5`
      );
    }

    const decadeStart = Math.floor(year / 10) * 10;
    const racePositions = this.configs.race.positions;

    // Create gradient from the 5 colors
    const gradientStops = raceConfig.colors
      .map((color, i) => {
        const start = (i / raceConfig.colors.length) * 100;
        const end = ((i + 1) / raceConfig.colors.length) * 100;
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(", ");

    // Info and warning icons for race - KEEP YOUR EXISTING STYLE
    const raceWarningId = "race-warning-flag";

    container.innerHTML = `
      <div class="legend-unified">
        <div class="legend-title-unified">
          ${raceConfig.readableName} ${this.configs.race.title}
          <div class="legend-year-in-title">${decadeStart}-${
      decadeStart + 9
    }</div>
          <span id="${raceWarningId}" class="warning-icon" title="" style="display: none; cursor: pointer;">
            <i class="bi bi-flag-fill text-danger"></i>
          </span>
        </div>
        
        <div class="legend-bar-row-unified">
          <div class="legend-bar-unified" style="background: linear-gradient(to right, ${gradientStops})"></div>
          <div class="legend-null-container-unified">
            <div class="legend-null-label-unified">${
              this.configs.race.nullLabel
            }</div>
            <div class="legend-null-unified" style="background: ${
              this.configs.race.nullColor
            }"></div>
          </div>
        </div>
        
        <div class="legend-values-container-unified">
          ${raceConfig.thresholds
            .slice(0, 5)
            .map(
              (value, i) =>
                `<span class="legend-value-unified" style="left: ${racePositions[i]}%">${value}</span>`
            )
            .join("")}
        </div>
      </div>
    `;
  },

  // ============================================================================
  // SIMPLE UTILITIES
  // ============================================================================

  // Check metadata and show warnings automatically
  checkAndShowWarning(type, year) {
    const metadata = this.metadata[type];
    if (!metadata || !metadata[year]) {
      return; // No metadata available for this year
    }

    const yearData = metadata[year];

    // Hide warning by default
    this.hideWarning(type);

    // Check for conditions that should trigger warnings
    let shouldShowWarning = false;
    let warningMessage = "";

    // Check for race-limited data
    if (yearData.raceLimited === true) {
      shouldShowWarning = true;
      warningMessage =
        "Race-limited data: " +
        (yearData.note ||
          "Some demographic groups may be excluded from this dataset.");
    }
    // Check for sample data
    else if (yearData.sample === true) {
      shouldShowWarning = true;
      warningMessage =
        "Sample data: " +
        (yearData.note ||
          "This data is based on a sample, not a full population count.");
    }
    // Check for non-full count
    else if (yearData.fullCount === false) {
      shouldShowWarning = true;
      warningMessage =
        "Incomplete count: " +
        (yearData.note ||
          "This data may not represent the complete population.");
    }
    // Show warning if there's a note even with good data quality
    else if (
      yearData.note &&
      (yearData.raceLimited || yearData.sample || !yearData.fullCount)
    ) {
      shouldShowWarning = true;
      warningMessage = yearData.note;
    }

    if (shouldShowWarning) {
      this.showWarning(type, warningMessage);

      // Add click handler to show full details
      this.setupWarningClickHandler(type, year);
    }
  },

  // Setup click handler for warning flag to show detailed modal
  setupWarningClickHandler(type, year) {
    const warningIconId = this.getWarningIconId(type);
    const warningIcon = document.getElementById(warningIconId);

    if (warningIcon) {
      // Remove existing listeners
      warningIcon.replaceWith(warningIcon.cloneNode(true));
      const newWarningIcon = document.getElementById(warningIconId);

      newWarningIcon.addEventListener("click", () => {
        const metadata = this.metadata[type];
        if (metadata && metadata[year]) {
          const yearData = metadata[year];

          // Format content for the existing modal system
          const description = `
            <p>${
              yearData.note ||
              "Data quality information available for this time period."
            }</p>
            
            <div class="highlight-box" style="margin-top: 15px;">
              <strong>Data Quality Summary:</strong><br>
              <b>Full Count:</b> ${yearData.fullCount ? "Yes" : "No"}<br>
              <b>Sample Data:</b> ${yearData.sample ? "Yes" : "No"}<br>
              <b>Race Limited:</b> ${yearData.raceLimited ? "Yes" : "No"}<br>
            </div>
            
            ${
              yearData.source
                ? `
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
              <strong style="color: #666; font-size: 0.9em;">Source:</strong><br>
              <span style="color: #666; font-size: 0.9em;">${yearData.source}</span>
            </div>
            `
                : ""
            }
          `;

          // Get appropriate title based on legend type
          let modalTitle = `Data Quality Warning - ${year}`;
          if (type === "populationDensity") {
            modalTitle = `Population Data Quality - ${year}`;
          } else if (type === "migration") {
            modalTitle = `Migration Data Quality - ${year}`;
          } else if (type === "race") {
            modalTitle = `Race Data Quality - ${year}`;
          }

          // Use the existing modal system
          if (typeof showInfoModal === "function") {
            showInfoModal(modalTitle, description);
          } else {
            console.error(
              "showInfoModal function not found. Make sure the modal system is loaded."
            );
            // Fallback for debugging
            alert(
              `${modalTitle}\n\n${
                yearData.note || "Data quality information available."
              }`
            );
          }
        }
      });

      console.log(`✅ Warning click handler attached for ${type} year ${year}`);
    } else {
      console.warn(`Warning icon not found: ${warningIconId}`);
    }
  },

  // Helper to get warning icon ID
  getWarningIconId(type) {
    if (type === "populationDensity") {
      return "population-warning-flag";
    } else if (type === "migration") {
      return "migration-warning-flag";
    } else if (type === "race") {
      return "race-warning-flag";
    }
    return null;
  },

  // Change positions easily
  updatePositions(type, newPositions) {
    if (type === "race") {
      if (newPositions.length !== 5) {
        console.warn(
          `Race legends need exactly 5 positions, got ${newPositions.length}`
        );
        return;
      }
      this.configs.race.positions = newPositions;
      console.log(`Updated race positions:`, newPositions);
    } else if (this.configs[type]) {
      this.configs[type].positions = newPositions;
      console.log(`Updated ${type} positions:`, newPositions);
    }
  },

  // Show warning flag with message
  showWarning(type, message) {
    const warningIconId = this.getWarningIconId(type);

    const warningIcon = document.getElementById(warningIconId);
    if (warningIcon) {
      warningIcon.style.display = "inline";
      warningIcon.title = "Data Limitations - click for details";
      console.log(`✅ Showed warning for ${type}: ${message}`);
    } else {
      console.warn(`Warning icon not found: ${warningIconId}`);
    }
  },

  // Hide warning flag
  hideWarning(type) {
    const warningIconId = this.getWarningIconId(type);

    const warningIcon = document.getElementById(warningIconId);
    if (warningIcon) {
      warningIcon.style.display = "none";
      warningIcon.title = "";
      console.log(`✅ Hidden warning for ${type}`);
    }
  },

  // Hide/show
  hide(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.style.display = "none";
  },

  show(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.style.display = "block";
  },
};

// ============================================================================
// SIMPLE USAGE
// ============================================================================

// Initialize metadata loading (call this early in your app)
// document.addEventListener('DOMContentLoaded', () => {
//   LegendManager.loadAllMetadata();
// });

// Replace your existing legend code with these calls:

// Population Density (6 values) - warnings will show automatically based on metadata
// LegendManager.create('populationDensity', 'density-legend', { year: currentYear });

// Migration (6 values) - warnings will show automatically based on metadata
// LegendManager.create('migration', 'maps-legends', { year: currentYear });

// Race (5 classe
